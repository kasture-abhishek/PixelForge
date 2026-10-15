export function pairedHeight(width, aspectRatio) {
	if (width <= 0 || !aspectRatio) return 1;
	return Math.max(1, Math.round(width / aspectRatio));
}

export function pairedWidth(height, aspectRatio) {
	if (height <= 0 || !aspectRatio) return 1;
	return Math.max(1, Math.round(height * aspectRatio));
}
