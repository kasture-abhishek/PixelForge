const FILTER_MAP = {
	grayscale: "grayscale(1)",
	sepia: "sepia(1)",
	invert: "invert(1)",
	vivid: "saturate(1.8) contrast(1.1)",
	cool: "hue-rotate(20deg) saturate(1.1)",
	warm: "sepia(.25) saturate(1.25)",
	fade: "contrast(.85) brightness(1.08)",
};

export function namedFilter(filter) {
	return FILTER_MAP[filter] || "none";
}

export function buildFilterString(editState) {
	return [
		`brightness(${100 + editState.brightness}%)`,
		`contrast(${100 + editState.contrast}%)`,
		`saturate(${100 + editState.saturation}%)`,
		`hue-rotate(${editState.hue}deg)`,
		`blur(${editState.blur}px)`,
		namedFilter(editState.filter),
	].join(" ");
}
