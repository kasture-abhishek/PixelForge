const DB_NAME = "pixelForge";
const PENDING_STORE = "pending";
const PENDING_KEY = "upload";
const RECENT_STORE = "recent";
const MAX_RECENT = 5;

function openDb() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 2);
		request.onupgradeneeded = (event) => {
			const db = request.result;
			if (!db.objectStoreNames.contains(PENDING_STORE)) {
				db.createObjectStore(PENDING_STORE);
			}
			if (!db.objectStoreNames.contains(RECENT_STORE)) {
				db.createObjectStore(RECENT_STORE, { keyPath: "name", autoIncrement: false });
			}
		};
		request.onerror = () => reject(request.error);
		request.onsuccess = () => {
			const db = request.result;
			if (db.objectStoreNames.contains(PENDING_STORE) && db.objectStoreNames.contains(RECENT_STORE)) {
				resolve(db);
				return;
			}
			const nextVersion = db.version + 1;
			db.close();
			const upgrade = indexedDB.open(DB_NAME, nextVersion);
			upgrade.onupgradeneeded = () => {
				const udb = upgrade.result;
				if (!udb.objectStoreNames.contains(PENDING_STORE)) udb.createObjectStore(PENDING_STORE);
				if (!udb.objectStoreNames.contains(RECENT_STORE)) udb.createObjectStore(RECENT_STORE, { keyPath: "name", autoIncrement: false });
			};
			upgrade.onerror = () => reject(upgrade.error);
			upgrade.onsuccess = () => resolve(upgrade.result);
		};
	});
}

export function savePendingFile(file) {
	return openDb().then((db) => new Promise((resolve, reject) => {
		const transaction = db.transaction(PENDING_STORE, "readwrite");
		transaction.objectStore(PENDING_STORE).put(file, PENDING_KEY);
		transaction.oncomplete = () => {
			db.close();
			resolve();
		};
		transaction.onerror = () => {
			db.close();
			reject(transaction.error);
		};
	}));
}

export function takePendingFile() {
	return openDb().then((db) => new Promise((resolve, reject) => {
		const transaction = db.transaction(PENDING_STORE, "readwrite");
		const store = transaction.objectStore(PENDING_STORE);
		const getRequest = store.get(PENDING_KEY);
		getRequest.onsuccess = () => {
			if (getRequest.result) store.delete(PENDING_KEY);
		};
		transaction.oncomplete = () => {
			db.close();
			resolve(getRequest.result || null);
		};
		transaction.onerror = () => {
			db.close();
			reject(transaction.error);
		};
	}));
}

export function saveRecentFile(file) {
	return openDb().then((db) => new Promise((resolve, reject) => {
		const transaction = db.transaction(RECENT_STORE, "readwrite");
		const store = transaction.objectStore(RECENT_STORE);
		const entry = { name: file.name, file, size: file.size, type: file.type, savedAt: Date.now() };
		const putRequest = store.put(entry, entry.name);
		putRequest.onsuccess = () => {
			trimRecent(store).then(() => {
				db.close();
				resolve();
			}).catch((err) => {
				db.close();
				reject(err);
			});
		};
		putRequest.onerror = () => {
			db.close();
			reject(putRequest.error);
		};
		transaction.onerror = () => {
			db.close();
			reject(transaction.error);
		};
	}));
}

function trimRecent(store) {
	return new Promise((resolve, reject) => {
		const getAllRequest = store.getAll();
		getAllRequest.onsuccess = () => {
			const entries = getAllRequest.result;
			if (entries.length <= MAX_RECENT) {
				resolve();
				return;
			}
			entries.sort((a, b) => b.savedAt - a.savedAt);
			const toRemove = entries.slice(MAX_RECENT);
			let removed = 0;
			toRemove.forEach((entry) => {
				const delRequest = store.delete(entry.name);
				delRequest.onsuccess = () => {
					removed += 1;
					if (removed === toRemove.length) resolve();
				};
				delRequest.onerror = () => {
					removed += 1;
					if (removed === toRemove.length) resolve();
				};
			});
		};
		getAllRequest.onerror = () => reject(getAllRequest.error);
	});
}

export function getRecentFiles() {
	return openDb().then((db) => new Promise((resolve, reject) => {
		const transaction = db.transaction(RECENT_STORE, "readonly");
		const store = transaction.objectStore(RECENT_STORE);
		const getAllRequest = store.getAll();
		getAllRequest.onsuccess = () => {
			db.close();
			const entries = getAllRequest.result.sort((a, b) => b.savedAt - a.savedAt);
			resolve(entries.map((e) => ({ name: e.name, file: e.file, size: e.size, type: e.type })));
		};
		getAllRequest.onerror = () => {
			db.close();
			reject(getAllRequest.error);
		};
		transaction.onerror = () => {
			db.close();
			reject(transaction.error);
		};
	}));
}

export function removeRecentFile(name) {
	return openDb().then((db) => new Promise((resolve, reject) => {
		const transaction = db.transaction(RECENT_STORE, "readwrite");
		const store = transaction.objectStore(RECENT_STORE);
		const delRequest = store.delete(name);
		delRequest.onsuccess = () => {
			db.close();
			resolve();
		};
		delRequest.onerror = () => {
			db.close();
			reject(delRequest.error);
		};
		transaction.onerror = () => {
			db.close();
			reject(transaction.error);
		};
	}));
}
