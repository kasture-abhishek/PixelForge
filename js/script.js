const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
const navActions = document.querySelector(".nav-actions");

const uploadBox = document.getElementById("uploadBox");

const browseBtn = document.getElementById("browseBtn");
const fileInput = document.getElementById("fileInput");

const fileResult = document.getElementById("fileResult");

if (menuToggle && mainNav && navActions) {
	menuToggle.addEventListener("click", () => {

		const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
		menuToggle.setAttribute("aria-expanded", String(!isExpanded));
		mainNav.classList.toggle("open");

		navActions.classList.toggle("open");
	});
}

const acceptedFileTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const maxSize = 50 * 1024 * 1024;

function updateFileMessage(message, isError = false) {
	fileResult.textContent = message;
	fileResult.style.color = isError ? "#b42318" : "#1d4a7e";
}

function validateAndShowFile(file) {
	if (!file) {
		return;
	}

	if (!acceptedFileTypes.includes(file.type)) {
		updateFileMessage("Unsupported format. Use JPG, PNG, GIF, or WEBP.", true);
		return;
	}

	if (file.size > maxSize) {
		updateFileMessage("File too large. Max size is 50MB.", true);
		return;
	}

	updateFileMessage(`Selected: ${file.name}`);
}

if (uploadBox && browseBtn && fileInput) {
	browseBtn.addEventListener("click", (event) => {
		event.preventDefault();
		fileInput.click();
	});

	uploadBox.addEventListener("click", () => {
		fileInput.click();
	});

	uploadBox.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " ") {
			
			event.preventDefault();
			fileInput.click();
		}
	});

	fileInput.addEventListener("change", (event) => {
		const [file] = event.target.files;
		validateAndShowFile(file);
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
		const file = event.dataTransfer?.files?.[0];


		validateAndShowFile(file);
	});
}
