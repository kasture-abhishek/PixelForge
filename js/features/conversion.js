import { canvasToBlob } from "../utils/download.js";
import { formatBytes } from "../utils/fileUtils.js";

export async function estimateSizes(canvas) {
	const [jpg60, jpg90, png, webp] = await Promise.all([
		canvasToBlob(canvas, "image/jpeg", 0.6),
		canvasToBlob(canvas, "image/jpeg", 0.9),
		canvasToBlob(canvas, "image/png"),
		canvasToBlob(canvas, "image/webp", 0.8),
	]);

	return {
		jpg60: jpg60 ? formatBytes(jpg60.size) : "—",
		jpg90: jpg90 ? formatBytes(jpg90.size) : "—",
		png: png ? formatBytes(png.size) : "—",
		webp: webp ? formatBytes(webp.size) : "—",
	};
}
