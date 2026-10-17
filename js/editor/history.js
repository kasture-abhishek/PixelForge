export function cloneState(state) {
	return Object.fromEntries(Object.entries(state)
		.filter(([key]) => key !== "original" && key !== "file")
		.map(([key, value]) => [key, Array.isArray(value) ? structuredClone(value) : value]));
}

export function pushHistoryEntry(history, originalStack, historyIndex, snapshot, original) {
	if (historyIndex < history.length - 1) {
		history.splice(historyIndex + 1);
		originalStack.splice(historyIndex + 1);
	}
	history.push(snapshot);
	originalStack.push(original);
	return history.length - 1;
}

export function initialHistoryState() {
	return {
		history: [],
		originalStack: [],
		historyIndex: -1,
	};
}
