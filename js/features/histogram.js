export function drawHistogram(histogramCanvas, imageData, channel = "all") {
	const context = histogramCanvas.getContext("2d");
	context.clearRect(0, 0, histogramCanvas.width, histogramCanvas.height);
	const sample = imageData.data;

	const drawBins = (picker, color) => {
		const bins = new Array(32).fill(0);
		for (let index = 0; index < sample.length; index += 4) {
			bins[Math.floor(picker(sample, index) / 8)] += 1;
		}
		const max = Math.max(...bins, 1);
		context.fillStyle = color;
		bins.forEach((value, index) => {
			context.fillRect(index * 7, histogramCanvas.height, 6, -(value / max) * histogramCanvas.height);
		});
	};

	if (channel === "r") {
		drawBins((data, i) => data[i], "#EF4444");
		return;
	}
	if (channel === "g") {
		drawBins((data, i) => data[i + 1], "#22C55E");
		return;
	}
	if (channel === "b") {
		drawBins((data, i) => data[i + 2], "#3B82F6");
		return;
	}

	context.globalAlpha = 0.55;
	drawBins((data, i) => data[i], "#EF4444");
	drawBins((data, i) => data[i + 1], "#22C55E");
	drawBins((data, i) => data[i + 2], "#3B82F6");
	context.globalAlpha = 1;
}
