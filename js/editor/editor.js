import { formatBytes, isAcceptedImage, MAX_IMAGE_BYTES } from "../utils/fileUtils.js";
import { takePendingFile, saveRecentFile, getRecentFiles, removeRecentFile, clearRecentFiles } from "../utils/pendingUpload.js";
import { canvasToBlob, downloadBlob, extensionForMime } from "../utils/download.js";
import { canvasPoint, fitZoom, hexFromPixel } from "../utils/imageUtils.js";
import { buildFilterString } from "../features/filters.js";
import { applySharpen, DEFAULT_ADJUSTMENTS } from "../features/adjustments.js";
import { drawHistogram } from "../features/histogram.js";
import { pairedHeight, pairedWidth } from "../features/resize.js";
import { estimateSizes } from "../features/conversion.js";
import { drawStrokes as drawStrokesUtil, drawTexts as drawTextsUtil, bakeCrop as bakeCropUtil } from "./canvas.js";
import { cloneState, pushHistoryEntry } from "./history.js";
import { setupKeyboardHandlers } from "./keyboard.js";

const canvas = document.getElementById("editorCanvas");
const context = canvas.getContext("2d", { willReadFrequently: true });
const fileInput = document.getElementById("fileUploadMain");
const emptyState = document.getElementById("edEmpty");
const statusBar = document.getElementById("edStatusbar");
const canvasStage = document.querySelector(".ed-canvas-stage");
const cropRect = document.getElementById("cropRect");
const recentDropdown = document.getElementById("recentDropdown");
const recentList = document.getElementById("recentList");
const recentEmpty = document.getElementById("recentEmpty");

const state = {
	original: null,
	file: null,
	zoom: 1,
	brightness: 0,
	contrast: 0,
	saturation: 0,
	hue: 0,
	sharpness: 0,
	blur: 0,
	opacity: 100,
	filter: "none",
	filterIntensity: 100,
	width: 0,
	height: 0,
	rotation: 0,
	flipX: 1,
	flipY: 1,
	activeTool: "select",
	crop: null,
	strokes: [],
	texts: [],
	histogramChannel: "all",
	recentImages: [],
};

const history = [];
const originalStack = [];
let historyIndex = -1;
let aspectRatio = 1;
let estimateTimer = 0;

const $ = (id) => document.getElementById(id);
const sliderNames = ["Brightness", "Contrast", "Saturation", "Hue", "Sharpness", "Blur", "Opacity", "FilterIntensity"];

function setStatus(message) {
	const status = $("edFileMeta");
	if (status) status.textContent = message;
}

function restoreSnapshot(snapshot, index = historyIndex) {
	Object.assign(state, snapshot);
	if (originalStack[index]) state.original = originalStack[index];
	updateControls();
	render();
}

function pushHistory(label) {
	const snapshot = { ...cloneState(state), label };
	historyIndex = pushHistoryEntry(history, originalStack, historyIndex, snapshot, state.original);
	updateHistoryUI();
}

function updateHistoryUI() {
	$("btnUndo").disabled = historyIndex <= 0;
	$("btnRedo").disabled = historyIndex < 0 || historyIndex >= history.length - 1;
	$("historyCount").textContent = `${Math.max(0, history.length - 1)} step${history.length === 2 ? "" : "s"}`;
	const list = $("historyList");
	list.replaceChildren();
	if (history.length <= 1) {
		const empty = document.createElement("li");
		empty.className = "ed-history-item ed-history-item--empty";
		empty.textContent = "No edits yet";
		list.append(empty);
		return;
	}
	history.forEach((entry, index) => {
		if (index === 0) return;
		const item = document.createElement("li");
		item.className = `ed-history-item${index === historyIndex ? " active" : ""}`;
		item.textContent = entry.label;
		item.tabIndex = 0;
		item.addEventListener("click", () => {
			historyIndex = index;
			restoreSnapshot(history[historyIndex], historyIndex);
			updateHistoryUI();
		});
		list.append(item);
	});
}

function updateControls() {
	const values = {
		Brightness: state.brightness,
		Contrast: state.contrast,
		Saturation: state.saturation,
		Hue: state.hue,
		Sharpness: state.sharpness,
		Blur: state.blur,
		Opacity: state.opacity,
		FilterIntensity: state.filterIntensity,
	};
	for (const name of sliderNames) {
		const slider = $("sl" + name);
		const value = $("sl" + name + "Val");
		if (!slider || !value) continue;
		slider.value = values[name];
		value.textContent = name === "Hue" ? `${values[name]}°` : name === "Opacity" || name === "FilterIntensity" ? `${values[name]}%` : values[name];
	}
	$("resizeW").value = state.width || "";
	$("resizeH").value = state.height || "";
	$("cssFilterCode").textContent = `filter: ${buildFilterString(state)};`;
	document.querySelectorAll(".ed-filter").forEach((button) => {
		button.classList.toggle("active", button.dataset.filter === state.filter);
	});
	document.querySelectorAll(".ed-ch").forEach((button) => {
		button.classList.toggle("active", button.dataset.ch === state.histogramChannel);
	});
}

function getFitZoom() {
	if (!state.original) return 1;
	const imageWidth = state.width || state.original.naturalWidth;
	const imageHeight = state.height || state.original.naturalHeight;
	const rotated = Math.abs(state.rotation % 180) === 90;
	return fitZoom(canvasStage, rotated ? imageHeight : imageWidth, rotated ? imageWidth : imageHeight);
}

function render() {
	if (!state.original) return;
	const rotated = Math.abs(state.rotation % 180) === 90;
	const destWidth = state.width || state.original.naturalWidth;
	const destHeight = state.height || state.original.naturalHeight;
	const crop = state.crop || { x: 0, y: 0, width: state.original.naturalWidth, height: state.original.naturalHeight };
	const width = destWidth;
	const height = destHeight;
	canvas.width = rotated ? height : width;
	canvas.height = rotated ? width : height;
	context.clearRect(0, 0, canvas.width, canvas.height);

	const drawImage = (targetContext) => {
		targetContext.save();
		targetContext.translate(canvas.width / 2, canvas.height / 2);
		targetContext.rotate(state.rotation * Math.PI / 180);
		targetContext.scale(state.flipX, state.flipY);
		targetContext.globalAlpha = state.opacity / 100;
		targetContext.drawImage(state.original, crop.x, crop.y, crop.width, crop.height, -width / 2, -height / 2, width, height);
		targetContext.restore();
	};

	if (state.filterIntensity < 100) {
		drawImage(context);
		const filteredCanvas = document.createElement("canvas");
		filteredCanvas.width = canvas.width;
		filteredCanvas.height = canvas.height;
		const filteredContext = filteredCanvas.getContext("2d");
		filteredContext.filter = buildFilterString(state);
		drawImage(filteredContext);
		context.globalAlpha = state.filterIntensity / 100;
		context.drawImage(filteredCanvas, 0, 0);
		context.globalAlpha = 1;
	} else {
		context.filter = buildFilterString(state);
		drawImage(context);
	}
	context.filter = "none";
	applySharpen(context, canvas, state.sharpness);
	drawStrokes();
	drawTexts();
	canvas.style.width = `${canvas.width * state.zoom}px`;
	canvas.style.height = `${canvas.height * state.zoom}px`;
	$("statusDimensions").textContent = `${canvas.width} × ${canvas.height}px`;
	$("sizeExportDim").textContent = `${canvas.width} × ${canvas.height}px`;
	updateHistogram();
	scheduleSizeEstimate();
}

function drawStrokes() {
	drawStrokesUtil(context, state.strokes);
}

function drawTexts() {
	drawTextsUtil(context, state.texts);
}

function loadFile(file) {
	if (!isAcceptedImage(file)) {
		setStatus("Please choose a supported image file.");
		return;
	}
	if (file.size > MAX_IMAGE_BYTES) {
		setStatus("File is larger than the 50 MB limit.");
		return;
	}
	const url = URL.createObjectURL(file);
	const image = new Image();
	image.onload = () => {
		URL.revokeObjectURL(url);
		state.original = image;
		state.file = file;
		state.width = image.naturalWidth;
		state.height = image.naturalHeight;
		aspectRatio = image.naturalWidth / image.naturalHeight || 1;
		state.zoom = 1;
		Object.assign(state, DEFAULT_ADJUSTMENTS, { rotation: 0, flipX: 1, flipY: 1 });
		state.crop = null;
		state.strokes = [];
		state.texts = [];
		$("edFileName").textContent = file.name;
		setStatus(`${formatBytes(file.size)} · local processing`);
		emptyState.hidden = true;
		canvas.hidden = false;
		statusBar.hidden = false;
		history.length = 0;
		originalStack.length = 0;
		historyIndex = -1;
		pushHistory("Original");
		updateControls();
		render();
		requestAnimationFrame(() => {
			state.zoom = getFitZoom();
			render();
			$("zoomVal").textContent = `${Math.round(state.zoom * 100)}%`;
		});
		saveToRecent(file);
	};
	image.onerror = () => setStatus("This image could not be decoded by the browser.");
	image.src = url;
}

function updateHistogram() {
	const histogram = $("histogramCanvas");
	if (!state.original || !histogram) return;
	drawHistogram(histogram, context.getImageData(0, 0, canvas.width, canvas.height), state.histogramChannel);
}

function scheduleSizeEstimate() {
	$("sizeEstimate").textContent = "Estimating…";
	clearTimeout(estimateTimer);
	estimateTimer = setTimeout(updateSizeEstimates, 280);
}

async function updateSizeEstimates() {
	if (!state.original) return;
	const format = $("exportFormat").value;
	const quality = Number($("exportQuality").value) / 100;
	const current = await canvasToBlob(canvas, format, quality);
	$("sizeEstimate").textContent = current ? formatBytes(current.size) : "Unavailable";
	const sizes = await estimateSizes(canvas);
	$("szJpg60").textContent = sizes.jpg60;
	$("szJpg90").textContent = sizes.jpg90;
	$("szPng").textContent = sizes.png;
	$("szWebp").textContent = sizes.webp;
}

function commit(label) {
	pushHistory(label);
	render();
}

function selectTool(tool) {
	state.activeTool = tool;
	document.querySelectorAll(".ed-tool[data-tool]").forEach((button) => button.classList.toggle("active", button.dataset.tool === tool));
	canvas.style.cursor = tool === "brush" || tool === "eraser" || tool === "crop" || tool === "pixel" ? "crosshair" : tool === "text" ? "text" : "default";
	setStatus(`${tool[0].toUpperCase() + tool.slice(1)} tool selected`);
}

function setCropOverlay(start, point) {
	if (!cropRect) return;
	const bounds = canvas.getBoundingClientRect();
	const wrapBounds = $("canvasWrap").getBoundingClientRect();
	const left = Math.min(start.clientX, point.clientX) - wrapBounds.left;
	const top = Math.min(start.clientY, point.clientY) - wrapBounds.top;
	const width = Math.abs(point.clientX - start.clientX);
	const height = Math.abs(point.clientY - start.clientY);
	cropRect.hidden = false;
	cropRect.style.left = `${Math.max(0, Math.min(left, bounds.width))}px`;
	cropRect.style.top = `${Math.max(0, Math.min(top, bounds.height))}px`;
	cropRect.style.width = `${width}px`;
	cropRect.style.height = `${height}px`;
}

function hideCropOverlay() {
	if (!cropRect) return;
	cropRect.hidden = true;
	cropRect.style.width = "0";
	cropRect.style.height = "0";
}

function bakeCrop(x, y, width, height) {
	const baked = bakeCropUtil(canvas, x, y, width, height);
	const image = new Image();
	image.onload = () => {
		state.original = image;
		state.width = image.naturalWidth;
		state.height = image.naturalHeight;
		aspectRatio = state.width / state.height || 1;
		state.crop = null;
		state.rotation = 0;
		state.flipX = 1;
		state.flipY = 1;
		state.strokes = [];
		state.texts = [];
		Object.assign(state, DEFAULT_ADJUSTMENTS);
		updateControls();
		commit("Crop image");
	};
	image.src = baked.toDataURL("image/png");
}

async function exportImage(format = $("exportFormat").value, quality = Number($("exportQuality").value) / 100) {
	if (!state.original) return setStatus("Load an image before exporting.");
	const blob = await canvasToBlob(canvas, format, quality);
	if (!blob) return setStatus(`The browser cannot export ${format}.`);
	downloadBlob(blob, `pixelforge-${Date.now()}.${extensionForMime(format)}`);
	setStatus(`${formatBytes(blob.size)} exported locally`);
}

fileInput.addEventListener("change", (event) => loadFile(event.target.files[0]));
$("btnChangeImage").addEventListener("click", () => {
	fileInput.value = "";
	fileInput.click();
	recentDropdown.hidden = true;
});
$("btnRecentImages").addEventListener("click", (event) => {
	event.stopPropagation();
	recentDropdown.hidden = !recentDropdown.hidden;
	if (!recentDropdown.hidden) {
		initRecentImages();
	}
});
$("btnClearRecent").addEventListener("click", (event) => {
	event.stopPropagation();
	clearRecentImages();
});
document.addEventListener("click", (event) => {
	if (!recentDropdown) return;
	if (!recentDropdown.contains(event.target) && event.target !== $("btnRecentImages")) {
		recentDropdown.hidden = true;
	}
});
$("canvasArea").addEventListener("dragover", (event) => {
	event.preventDefault();
	emptyState.classList.add("drag-over");
});
$("canvasArea").addEventListener("dragleave", () => emptyState.classList.remove("drag-over"));
$("canvasArea").addEventListener("drop", (event) => {
	event.preventDefault();
	emptyState.classList.remove("drag-over");
	loadFile(event.dataTransfer.files[0]);
});

function loadPendingFile() {
	takePendingFile().then((file) => {
		if (file) {
			loadFile(file);
		}
	}).catch((error) => {
		setStatus("Could not restore pending image. Open the editor and choose a file.");
		console.error("Pending file load failed:", error);
	});
}

function renderRecentImages() {
	if (!recentList || !recentEmpty) return;
	recentList.replaceChildren();
	if (state.recentImages.length === 0) {
		recentEmpty.hidden = false;
		return;
	}
	recentEmpty.hidden = true;
	state.recentImages.forEach((entry) => {
		const li = document.createElement("li");
		li.className = "ed-recent-item";
		li.dataset.name = entry.name;
		const name = document.createElement("span");
		name.className = "ed-recent-item__name";
		name.textContent = entry.name;
		const size = document.createElement("span");
		size.className = "ed-recent-item__size";
		size.textContent = formatBytes(entry.size);
		const removeBtn = document.createElement("button");
		removeBtn.className = "ed-recent-item__remove";
		removeBtn.type = "button";
		removeBtn.title = "Remove from recent";
		removeBtn.setAttribute("aria-label", `Remove ${entry.name} from recent`);
		removeBtn.textContent = "x";
		removeBtn.addEventListener("click", (event) => {
			event.stopPropagation();
			removeRecentImage(entry.name);
		});
		li.append(name, size, removeBtn);
		li.addEventListener("click", () => {
			loadFile(entry.file);
			recentDropdown.hidden = true;
		});
		recentList.appendChild(li);
	});
}

async function saveToRecent(file) {
	try {
		await saveRecentFile(file);
		const recent = await getRecentFiles();
		state.recentImages = recent;
		renderRecentImages();
	} catch (err) {
		console.warn("Could not save to recent:", err);
	}
}

async function removeRecentImage(name) {
	try {
		await removeRecentFile(name);
		const recent = await getRecentFiles();
		state.recentImages = recent;
		renderRecentImages();
	} catch (err) {
		console.warn("Could not remove from recent:", err);
	}
}

async function clearRecentImages() {
	try {
		await clearRecentFiles();
		state.recentImages = [];
		renderRecentImages();
	} catch (err) {
		console.error("Could not clear recent images:", err);
		setStatus("Could not clear recent images.");
	}
}

function initRecentImages() {
	getRecentFiles().then((recent) => {
		state.recentImages = recent;
		renderRecentImages();
	}).catch((error) => {
		console.error("Could not load recent images:", error);
		setStatus("Could not load recent images.");
	});
}

for (const name of sliderNames) {
	const slider = $("sl" + name);
	if (!slider) continue;
	slider.addEventListener("input", () => {
		const key = name === "FilterIntensity" ? "filterIntensity" : name.toLowerCase();
		state[key] = Number(slider.value);
		updateControls();
		render();
	});
	slider.addEventListener("change", () => commit(`${name} ${slider.value}`));
}

document.querySelectorAll(".ed-filter").forEach((button) => button.addEventListener("click", () => {
	document.querySelectorAll(".ed-filter").forEach((item) => item.classList.remove("active"));
	button.classList.add("active");
	state.filter = button.dataset.filter;
	commit(`${button.textContent.trim()} filter`);
}));

document.querySelectorAll(".ed-tool[data-tool]").forEach((button) => button.addEventListener("click", () => selectTool(button.dataset.tool)));
$("toolRotateL").addEventListener("click", () => {
	if (state.original) {
		state.rotation = (state.rotation - 90 + 360) % 360;
		commit("Rotate left");
	}
});
$("toolRotateR").addEventListener("click", () => {
	if (state.original) {
		state.rotation = (state.rotation + 90) % 360;
		commit("Rotate right");
	}
});
$("toolFlipH").addEventListener("click", () => { state.flipX *= -1; commit("Flip horizontally"); });
$("toolFlipV").addEventListener("click", () => { state.flipY *= -1; commit("Flip vertically"); });
$("toolHistogram").addEventListener("click", () => {
	const section = $("secHistogram");
	section.hidden = !section.hidden;
});

document.querySelectorAll(".ed-ch").forEach((button) => button.addEventListener("click", () => {
	state.histogramChannel = button.dataset.ch;
	updateControls();
	updateHistogram();
}));

$("resetAdjust").addEventListener("click", () => {
	if (!state.original) return;
	Object.assign(state, {
		brightness: 0,
		contrast: 0,
		saturation: 0,
		hue: 0,
		sharpness: 0,
		blur: 0,
		opacity: 100,
	});
	updateControls();
	commit("Reset adjustments");
});

let pointerStart = null;
canvas.addEventListener("pointerdown", (event) => {
	if (!state.original) return;
	const point = canvasPoint(canvas, event);
	canvas.setPointerCapture(event.pointerId);
	if (state.activeTool === "brush" || state.activeTool === "eraser") {
		pointerStart = { ...point, stroke: { tool: state.activeTool, size: state.activeTool === "eraser" ? 40 : 12, points: [[point.x, point.y]] } };
		state.strokes.push(pointerStart.stroke);
	} else if (state.activeTool === "crop" || state.activeTool === "pixel") {
		pointerStart = point;
	}
	if (state.activeTool === "text") {
		const value = window.prompt("Enter text to add:");
		if (value?.trim()) {
			state.texts.push({ value: value.trim(), x: point.x, y: point.y });
			commit("Add text");
		}
		pointerStart = null;
	}
});
canvas.addEventListener("pointermove", (event) => {
	if (!state.original) return;
	const point = canvasPoint(canvas, event);
	$("statusCursor").textContent = `x: ${Math.round(point.x)} y: ${Math.round(point.y)}`;
	if (state.activeTool === "pixel") {
		const pixel = context.getImageData(Math.min(canvas.width - 1, Math.floor(point.x)), Math.min(canvas.height - 1, Math.floor(point.y)), 1, 1).data;
		$("statusColorHex").textContent = hexFromPixel(pixel);
		$("statusColorSwatch").style.background = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
	}
	if (!pointerStart) return;
	if (pointerStart.stroke) {
		pointerStart.stroke.points.push([point.x, point.y]);
		render();
	} else if (state.activeTool === "crop") {
		setCropOverlay(pointerStart, point);
	}
});
canvas.addEventListener("pointerup", (event) => {
	if (!pointerStart) return;
	const point = canvasPoint(canvas, event);
	if (state.activeTool === "crop" && !pointerStart.stroke) {
		const x = Math.min(pointerStart.x, point.x);
		const y = Math.min(pointerStart.y, point.y);
		const width = Math.abs(point.x - pointerStart.x);
		const height = Math.abs(point.y - pointerStart.y);
		hideCropOverlay();
		if (width > 4 && height > 4) bakeCrop(x, y, width, height);
	} else if (pointerStart.stroke) {
		commit(`${state.activeTool[0].toUpperCase() + state.activeTool.slice(1)} stroke`);
	}
	pointerStart = null;
});

$("btnUndo").addEventListener("click", () => {
	if (historyIndex > 0) restoreSnapshot(history[--historyIndex], historyIndex);
	updateHistoryUI();
});
$("btnRedo").addEventListener("click", () => {
	if (historyIndex < history.length - 1) restoreSnapshot(history[++historyIndex], historyIndex);
	updateHistoryUI();
});
$("btnReset").addEventListener("click", () => {
	if (state.original && history[0]) {
		history.splice(1);
		originalStack.splice(1);
		historyIndex = 0;
		restoreSnapshot(history[0], 0);
		updateHistoryUI();
	}
});
$("btnZoomIn").addEventListener("click", () => { state.zoom = Math.min(3, state.zoom + 0.1); render(); $("zoomVal").textContent = `${Math.round(state.zoom * 100)}%`; });
$("btnZoomOut").addEventListener("click", () => { state.zoom = Math.max(0.25, state.zoom - 0.1); render(); $("zoomVal").textContent = `${Math.round(state.zoom * 100)}%`; });
$("btnZoomFit").addEventListener("click", () => { state.zoom = getFitZoom(); render(); $("zoomVal").textContent = `${Math.round(state.zoom * 100)}%`; });
$("btnDownload").addEventListener("click", () => exportImage());
$("btnExport").addEventListener("click", () => {
	$("exportModal").hidden = false;
	updateSizeEstimates();
});
$("closeExportModal").addEventListener("click", () => { $("exportModal").hidden = true; });
$("closeExportCancel").addEventListener("click", () => { $("exportModal").hidden = true; });
$("confirmDownload").addEventListener("click", () => {
	exportImage($("exportModal").querySelector(".ed-fmt-btn.active").dataset.fmt, Number($("modalQuality").value) / 100);
	$("exportModal").hidden = true;
});
document.querySelectorAll(".ed-fmt-btn").forEach((button) => button.addEventListener("click", () => {
	document.querySelectorAll(".ed-fmt-btn").forEach((item) => item.classList.remove("active"));
	button.classList.add("active");
}));
$("exportFormat").addEventListener("change", updateSizeEstimates);
$("exportQuality").addEventListener("input", () => {
	$("exportQualityVal").textContent = `${$("exportQuality").value}%`;
	scheduleSizeEstimate();
});
$("modalQuality").addEventListener("input", () => {
	$("modalQualityVal").textContent = `${$("modalQuality").value}%`;
});

$("resizeW").addEventListener("input", () => {
	if (!$("lockAspect").checked) return;
	const width = Number($("resizeW").value);
	if (width > 0) $("resizeH").value = pairedHeight(width, aspectRatio);
});
$("resizeH").addEventListener("input", () => {
	if (!$("lockAspect").checked) return;
	const height = Number($("resizeH").value);
	if (height > 0) $("resizeW").value = pairedWidth(height, aspectRatio);
});
$("btnApplyResize").addEventListener("click", () => {
	const width = Number($("resizeW").value);
	const height = Number($("resizeH").value);
	if (width > 0 && height > 0) {
		state.width = width;
		state.height = height;
		aspectRatio = width / height;
		commit(`Resize to ${width} × ${height}`);
	}
});
$("copyCssFilter").addEventListener("click", async () => {
	await navigator.clipboard?.writeText($("cssFilterCode").textContent);
	setStatus("CSS filter copied");
});
$("btnTogglePanel").addEventListener("click", () => {
	$("rightPanel").classList.toggle("is-open");
});

setupKeyboardHandlers({
	onInput: (target) => target.matches("input, textarea, select"),
	onUndo: () => {
		if (historyIndex > 0) restoreSnapshot(history[--historyIndex], historyIndex);
		updateHistoryUI();
	},
	onRedo: () => {
		if (historyIndex < history.length - 1) restoreSnapshot(history[++historyIndex], historyIndex);
		updateHistoryUI();
	},
	onEscape: () => {
		$("exportModal").hidden = true;
		$("rightPanel").classList.remove("is-open");
		hideCropOverlay();
	},
	onTool: (tool) => {
		selectTool(tool);
	},
	onHistogram: () => {
		$("toolHistogram").click();
	},
});

window.addEventListener("resize", () => {
	if (!state.original) return;
	state.zoom = getFitZoom();
	render();
	$("zoomVal").textContent = `${Math.round(state.zoom * 100)}%`;
});

statusBar.hidden = true;
loadPendingFile();
initRecentImages();
