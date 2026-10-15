export function applySharpen(context, canvas, amount) {
	if (amount <= 0 || canvas.width < 3 || canvas.height < 3) return;
	const strength = amount / 100;
	const source = context.getImageData(0, 0, canvas.width, canvas.height);
	const output = context.createImageData(source);
	const src = source.data;
	const dst = output.data;
	const width = canvas.width;
	const height = canvas.height;

	for (let y = 1; y < height - 1; y += 1) {
		for (let x = 1; x < width - 1; x += 1) {
			const i = (y * width + x) * 4;
			for (let c = 0; c < 3; c += 1) {
				const center = src[i + c];
				const neighbors = src[i - 4 + c] + src[i + 4 + c] + src[i - width * 4 + c] + src[i + width * 4 + c];
				const sharpened = center * 5 - neighbors;
				dst[i + c] = Math.max(0, Math.min(255, center + (sharpened - center) * strength));
			}
			dst[i + 3] = src[i + 3];
		}
	}

	context.putImageData(output, 0, 0);
}

export const DEFAULT_ADJUSTMENTS = {
	brightness: 0,
	contrast: 0,
	saturation: 0,
	hue: 0,
	sharpness: 0,
	blur: 0,
	opacity: 100,
	filter: "none",
	filterIntensity: 100,
};
