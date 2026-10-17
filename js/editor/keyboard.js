export function setupKeyboardHandlers({
	onInput = () => false,
	onUndo,
	onRedo,
	onEscape,
	onTool,
	onHistogram,
} = {}) {
	document.addEventListener("keydown", (event) => {
		if (onInput(event.target)) return;
		const key = event.key.toLowerCase();
		if ((event.ctrlKey || event.metaKey) && key === "z") {
			event.preventDefault();
			if (onUndo) onUndo();
			return;
		}
		if ((event.ctrlKey || event.metaKey) && key === "y") {
			event.preventDefault();
			if (onRedo) onRedo();
			return;
		}
		if (event.key === "Escape") {
			if (onEscape) onEscape();
			return;
		}
		if (event.ctrlKey || event.metaKey) return;
		const tools = { v: "select", c: "crop", b: "brush", e: "eraser", t: "text", p: "pixel" };
		if (tools[key]) {
			event.preventDefault();
			if (onTool) onTool(tools[key]);
			return;
		}
		if (key === "h") {
			event.preventDefault();
			if (onHistogram) onHistogram();
		}
	});
}
