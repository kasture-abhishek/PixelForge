export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

export const ACCEPTED_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
	"image/avif",
	"image/bmp",
	"image/x-ms-bmp",
];

export function isAcceptedImage(file) {
	if (!file) return false;
	return ACCEPTED_TYPES.includes(file.type) || /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(file.name || "");
}

export function formatBytes(bytes) {
	if (!bytes) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	return `${(bytes / 1024 ** unit).toFixed(unit ? 1 : 0)} ${units[unit]}`;
}
