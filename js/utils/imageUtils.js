export function canvasPoint(canvas, event) {
	const bounds = canvas.getBoundingClientRect();
	return {
		x: Math.max(0, Math.min(canvas.width, (event.clientX - bounds.left) * canvas.width / bounds.width)),
		y: Math.max(0, Math.min(canvas.height, (event.clientY - bounds.top) * canvas.height / bounds.height)),
		clientX: event.clientX,
		clientY: event.clientY,
	};
}

export function fitZoom(stage, width, height) {
	const availableWidth = Math.max(stage.clientWidth - 32, 1);
	const availableHeight = Math.max(stage.clientHeight - 32, 1);
	return Math.min(1, availableWidth / width, availableHeight / height);
}

export function hexFromPixel(pixel) {
	return `#${[pixel[0], pixel[1], pixel[2]].map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}
