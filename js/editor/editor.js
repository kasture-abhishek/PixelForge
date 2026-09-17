const canvas = document.getElementById("editorCanvas");
const context = canvas.getContext("2d");
const fileInput = document.getElementById("fileUploadMain");
const emptyState = document.getElementById("edEmpty");
const statusBar = document.getElementById("edStatusbar");
const canvasStage = document.querySelector(".ed-canvas-stage");

const state = {
	original: null,
	file: null,
	zoom: 1,
	brightness: 0,
	contrast: 0,
	saturation: 0,
	hue: 0,
	blur: 0,
	opacity: 100,
	filter: "none",
	filterIntensity: 100,
	width: 0,
	height: 0,
	rotation: 0,
	flipX: 1,
	flipY: 1,
};

const history = [];
let historyIndex = -1;

const $ = (id) => document.getElementById(id);
const sliderNames = ["Brightness", "Contrast", "Saturation", "Hue", "Blur", "Opacity", "FilterIntensity"];

function setStatus(message) {
	const status = $("edFileMeta");
	if (status) status.textContent = message;
}

function cloneState() {
	return Object.fromEntries(Object.entries(state).filter(([key]) => key !== "original" && key !== "file"));
}

function restoreSnapshot(snapshot) {
	Object.assign(state, snapshot);
	updateControls();
	render();
}

function pushHistory(label) {
	const snapshot = { ...cloneState(), label };
	if (historyIndex < history.length - 1) history.splice(historyIndex + 1);
	history.push(snapshot);
	historyIndex = history.length - 1;
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
	history.slice(1).forEach((entry, index) => {
		const item = document.createElement("li");
		item.className = `ed-history-item${index + 1 === historyIndex ? " active" : ""}`;
		item.textContent = entry.label;
		list.append(item);
	});
}

function updateControls() {
	const values = {
		Brightness: state.brightness,
		Contrast: state.contrast,
		Saturation: state.saturation,
		Hue: state.hue,
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
	$("cssFilterCode").textContent = `filter: ${getFilterString()};`;
}

function getFilterString() {
	const filterMap = { grayscale: "grayscale(1)", sepia: "sepia(1)", invert: "invert(1)", vivid: "saturate(1.8) contrast(1.1)", cool: "hue-rotate(20deg) saturate(1.1)", warm: "sepia(.25) saturate(1.25)", fade: "contrast(.85) brightness(1.08)" };
	const selected = filterMap[state.filter];
	return selected ? selected : "none";
}

function getFitZoom() {
	if (!state.original) return 1;
	const availableWidth = Math.max(canvasStage.clientWidth - 32, 1);
	const availableHeight = Math.max(canvasStage.clientHeight - 32, 1);
	const imageWidth = state.width || state.original.naturalWidth;
	const imageHeight = state.height || state.original.naturalHeight;
	return Math.min(1, availableWidth / imageWidth, availableHeight / imageHeight);
}

function render() {
	if (!state.original) return;
	const rotated = Math.abs(state.rotation % 180) === 90;
	const width = state.width || state.original.naturalWidth;
	const height = state.height || state.original.naturalHeight;
	canvas.width = rotated ? height : width;
	canvas.height = rotated ? width : height;
	context.save();
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.translate(canvas.width / 2, canvas.height / 2);
	context.rotate(state.rotation * Math.PI / 180);
	context.scale(state.flipX, state.flipY);
	context.filter = [
		`brightness(${100 + state.brightness}%)`,
		`contrast(${100 + state.contrast}%)`,
		`saturate(${100 + state.saturation}%)`,
		`hue-rotate(${state.hue}deg)`,
		`blur(${state.blur}px)`,
		getFilterString(),
	].join(" ");
	context.globalAlpha = state.opacity / 100;
	context.drawImage(state.original, -width / 2, -height / 2, width, height);
	context.restore();
	canvas.style.width = `${canvas.width * state.zoom}px`;
	canvas.style.height = `${canvas.height * state.zoom}px`;
	$("statusDimensions").textContent = `${canvas.width} × ${canvas.height}px`;
	$("sizeExportDim").textContent = `${canvas.width} × ${canvas.height}px`;
	$("sizeEstimate").textContent = "Calculated on export";
	updateHistogram();
}

function loadFile(file) {
	if (!file || !file.type.startsWith("image/")) {
		setStatus("Please choose a supported image file.");
		return;
	}
	if (file.size > 50 * 1024 * 1024) {
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
		state.zoom = 1;
		Object.assign(state, { brightness: 0, contrast: 0, saturation: 0, hue: 0, blur: 0, opacity: 100, filter: "none", filterIntensity: 100, rotation: 0, flipX: 1, flipY: 1 });
		$("edFileName").textContent = file.name;
		setStatus(`${formatBytes(file.size)} · local processing`);
		emptyState.hidden = true;
		canvas.hidden = false;
		statusBar.hidden = false;
		history.length = 0;
		historyIndex = -1;
		pushHistory("Original");
		updateControls();
		render();
		requestAnimationFrame(() => {
			state.zoom = getFitZoom();
			render();
			$("zoomVal").textContent = `${Math.round(state.zoom * 100)}%`;
		});
	};
	image.onerror = () => setStatus("This image could not be decoded by the browser.");
	image.src = url;
}

function formatBytes(bytes) {
	if (!bytes) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	return `${(bytes / 1024 ** unit).toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

function updateHistogram() {
	const histogram = $("histogramCanvas");
	if (!state.original || !histogram) return;
	const histogramContext = histogram.getContext("2d");
	histogramContext.clearRect(0, 0, histogram.width, histogram.height);
	histogramContext.fillStyle = "#8ba0b8";
	const sample = context.getImageData(0, 0, canvas.width, canvas.height).data;
	const bins = new Array(32).fill(0);
	for (let index = 0; index < sample.length; index += 4) bins[Math.floor(((sample[index] + sample[index + 1] + sample[index + 2]) / 3) / 8)] += 1;
	const max = Math.max(...bins, 1);
	bins.forEach((value, index) => histogramContext.fillRect(index * 7, histogram.height, 6, -(value / max) * histogram.height));
}

function commit(label) {
	pushHistory(label);
	render();
}

function exportImage(format = $("exportFormat").value, quality = Number($("exportQuality").value) / 100) {
	if (!state.original) return setStatus("Load an image before exporting.");
	canvas.toBlob((blob) => {
		if (!blob) return setStatus(`The browser cannot export ${format}.`);
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `pixelforge-${Date.now()}.${format.split("/")[1] === "jpeg" ? "jpg" : format.split("/")[1]}`;
		link.click();
		URL.revokeObjectURL(link.href);
		setStatus(`${formatBytes(blob.size)} exported locally`);
	}, format, quality);
}

fileInput.addEventListener("change", (event) => loadFile(event.target.files[0]));
$("btnChangeImage").addEventListener("click", () => {
	fileInput.value = "";
	fileInput.click();
});
$("canvasArea").addEventListener("dragover", (event) => event.preventDefault());
$("canvasArea").addEventListener("drop", (event) => { event.preventDefault(); loadFile(event.dataTransfer.files[0]); });

function loadPendingFile() {
	const request = indexedDB.open("pixelForge", 1);
	request.onupgradeneeded = () => request.result.createObjectStore("pending");
	request.onsuccess = () => {
		const transaction = request.result.transaction("pending", "readwrite");
		const store = transaction.objectStore("pending");
		const fileRequest = store.get("upload");
		fileRequest.onsuccess = () => {
			if (fileRequest.result) {
				loadFile(fileRequest.result);
				store.delete("upload");
			}
		};
	};
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
$("toolFlipH").addEventListener("click", () => { state.flipX *= -1; commit("Flip horizontally"); });
$("toolFlipV").addEventListener("click", () => { state.flipY *= -1; commit("Flip vertically"); });

$("btnUndo").addEventListener("click", () => { if (historyIndex > 0) restoreSnapshot(history[--historyIndex]); updateHistoryUI(); });
$("btnRedo").addEventListener("click", () => { if (historyIndex < history.length - 1) restoreSnapshot(history[++historyIndex]); updateHistoryUI(); });
$("btnReset").addEventListener("click", () => { if (state.original) restoreSnapshot(history[0]); history.splice(1); historyIndex = 0; updateHistoryUI(); });
$("btnZoomIn").addEventListener("click", () => { state.zoom = Math.min(3, state.zoom + 0.1); render(); $("zoomVal").textContent = `${Math.round(state.zoom * 100)}%`; });
$("btnZoomOut").addEventListener("click", () => { state.zoom = Math.max(0.25, state.zoom - 0.1); render(); $("zoomVal").textContent = `${Math.round(state.zoom * 100)}%`; });
$("btnZoomFit").addEventListener("click", () => { state.zoom = getFitZoom(); render(); $("zoomVal").textContent = `${Math.round(state.zoom * 100)}%`; });
$("btnDownload").addEventListener("click", () => exportImage());
$("btnExport").addEventListener("click", () => { $("exportModal").hidden = false; });
$("closeExportModal").addEventListener("click", () => { $("exportModal").hidden = true; });
$("closeExportCancel").addEventListener("click", () => { $("exportModal").hidden = true; });
$("confirmDownload").addEventListener("click", () => { exportImage($("exportModal").querySelector(".ed-fmt-btn.active").dataset.fmt, Number($("modalQuality").value) / 100); $("exportModal").hidden = true; });
document.querySelectorAll(".ed-fmt-btn").forEach((button) => button.addEventListener("click", () => { document.querySelectorAll(".ed-fmt-btn").forEach((item) => item.classList.remove("active")); button.classList.add("active"); }));
$("btnApplyResize").addEventListener("click", () => {
	const width = Number($("resizeW").value);
	const height = Number($("resizeH").value);
	if (width > 0 && height > 0) { state.width = width; state.height = height; commit(`Resize to ${width} × ${height}`); }
});
$("copyCssFilter").addEventListener("click", async () => { await navigator.clipboard?.writeText($("cssFilterCode").textContent); setStatus("CSS filter copied"); });
document.addEventListener("keydown", (event) => {
	if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); $("btnUndo").click(); }
	if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") { event.preventDefault(); $("btnRedo").click(); }
	if (event.key === "Escape") $("exportModal").hidden = true;
});

window.addEventListener("resize", () => {
		if (!state.original) return;
		state.zoom = getFitZoom();
		render();
		$("zoomVal").textContent = `${Math.round(state.zoom * 100)}%`;
});

statusBar.hidden = true;
loadPendingFile();
