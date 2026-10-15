export function downloadBlob(blob, filename) {
	const link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = filename;
	link.click();
	URL.revokeObjectURL(link.href);
}

export function extensionForMime(mime) {
	if (mime === "image/jpeg") return "jpg";
	return mime.split("/")[1] || "png";
}

export function canvasToBlob(canvas, mime, quality) {
	return new Promise((resolve) => {
		canvas.toBlob((blob) => resolve(blob), mime, quality);
	});
}
