export function drawStrokes(context, strokes) {
	strokes.forEach((stroke) => {
		if (stroke.points.length < 2) return;
		context.save();
		context.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
		context.strokeStyle = stroke.tool === "eraser" ? "rgba(0,0,0,1)" : "#ef4444";
		context.lineWidth = stroke.size;
		context.lineCap = "round";
		context.lineJoin = "round";
		context.beginPath();
		stroke.points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
		context.stroke();
		context.restore();
	});
}

export function drawTexts(context, texts) {
	context.save();
	context.fillStyle = "#ef4444";
	context.font = "bold 32px Space Grotesk, sans-serif";
	texts.forEach((text) => context.fillText(text.value, text.x, text.y));
	context.restore();
}

export function bakeCrop(sourceCanvas, x, y, width, height) {
	const baked = document.createElement("canvas");
	baked.width = Math.max(1, Math.round(width));
	baked.height = Math.max(1, Math.round(height));
	baked.getContext("2d").drawImage(sourceCanvas, x, y, width, height, 0, 0, baked.width, baked.height);
	return baked;
}
