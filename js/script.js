import { isAcceptedImage, MAX_IMAGE_BYTES } from "./utils/fileUtils.js";

const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
const navActions = document.querySelector(".nav-actions");
const uploadBox = document.getElementById("uploadBox");
const browseBtn = document.getElementById("browseBtn");
const fileInput = document.getElementById("fileInput");
const fileResult = document.getElementById("fileResult");
const statsSection = document.querySelector(".stats");
const counterAnimation = document.querySelectorAll(".stats strong[data-target]");

function closeMenu() {
	if (!menuToggle || !mainNav || !navActions) return;
	menuToggle.setAttribute("aria-expanded", "false");
	mainNav.classList.remove("open");
	navActions.classList.remove("open");
}

if (menuToggle && mainNav && navActions) {
	menuToggle.addEventListener("click", () => {
		const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
		menuToggle.setAttribute("aria-expanded", String(!isExpanded));
		mainNav.classList.toggle("open");
		navActions.classList.toggle("open");
	});
	mainNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
}

function editorHref() {
	return window.location.pathname.replace(/\\/g, "/").includes("/pages/")
		? "editor.html"
		: "pages/editor.html";
}

function updateFileMessage(message, isError = false) {
	if (!fileResult) return;
	fileResult.textContent = message;
	fileResult.style.color = isError ? "#b42318" : "#1d4a7e";
}

function openEditorWithFile(file) {
	const request = indexedDB.open("pixelForge", 1);
	request.onerror = () => {
		updateFileMessage("Could not store the file. Open the editor and choose it there.", true);
	};
	request.onupgradeneeded = () => request.result.createObjectStore("pending");
	request.onsuccess = () => {
		const transaction = request.result.transaction("pending", "readwrite");
		transaction.objectStore("pending").put(file, "upload");
		transaction.oncomplete = () => {
			window.location.href = editorHref();
		};
		transaction.onerror = () => {
			updateFileMessage("Could not store the file. Open the editor and choose it there.", true);
		};
	};
}

function validateAndShowFile(file) {
	if (!file) return;
	if (!isAcceptedImage(file)) {
		updateFileMessage("Unsupported format. Use JPG, PNG, WEBP, GIF, AVIF, or BMP.", true);
		return;
	}
	if (file.size > MAX_IMAGE_BYTES) {
		updateFileMessage("File too large. Max size is 50MB.", true);
		return;
	}
	updateFileMessage(`Selected: ${file.name}`);
	openEditorWithFile(file);
}

if (uploadBox && browseBtn && fileInput) {
	browseBtn.addEventListener("click", (event) => {
		event.preventDefault();
		event.stopPropagation();
		fileInput.click();
	});

	uploadBox.addEventListener("click", (event) => {
		if (event.target === browseBtn) return;
		fileInput.click();
	});

	uploadBox.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			fileInput.click();
		}
	});

	fileInput.addEventListener("change", (event) => {
		validateAndShowFile(event.target.files[0]);
	});

	["dragenter", "dragover"].forEach((eventName) => {
		uploadBox.addEventListener(eventName, (event) => {
			event.preventDefault();
			uploadBox.classList.add("drag-over");
		});
	});

	["dragleave", "drop"].forEach((eventName) => {
		uploadBox.addEventListener(eventName, (event) => {
			event.preventDefault();
			uploadBox.classList.remove("drag-over");
		});
	});

	uploadBox.addEventListener("drop", (event) => {
		validateAndShowFile(event.dataTransfer?.files?.[0]);
	});
}

if (statsSection && counterAnimation.length > 0) {
	const counterObserver = new IntersectionObserver((entries, observer) => {
		if (!entries[0].isIntersecting) return;
		counterAnimation.forEach((counter) => {
			const target = Number.parseInt(counter.dataset.target, 10);
			const duration = Number.parseInt(counter.dataset.duration, 10);
			if (Number.isFinite(target) && Number.isFinite(duration)) {
				countUp(counter, target, duration);
			}
		});
		observer.unobserve(statsSection);
	}, { threshold: 0.3 });
	counterObserver.observe(statsSection);
}

function countUp(element, target, duration) {
	const suffix = element.textContent.replace(String(target), "");
	if (target === 0) {
		element.textContent = `0${suffix}`;
		return;
	}
	let start = 0;
	const stepTime = Math.max(16, Math.floor(duration / target));
	const timer = setInterval(() => {
		start += 1;
		element.textContent = `${start}${suffix}`;
		if (start >= target) clearInterval(timer);
	}, stepTime);
}
