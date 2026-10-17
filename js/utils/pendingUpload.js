const DB_NAME = "pixelForge";
const STORE = "pending";
const KEY = "upload";

function openDb() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
		};
		request.onerror = () => reject(request.error);
		request.onsuccess = () => {
			const db = request.result;
			if (db.objectStoreNames.contains(STORE)) {
				resolve(db);
				return;
			}
			const nextVersion = db.version + 1;
			db.close();
			const upgrade = indexedDB.open(DB_NAME, nextVersion);
			upgrade.onupgradeneeded = () => {
				if (!upgrade.result.objectStoreNames.contains(STORE)) {
					upgrade.result.createObjectStore(STORE);
				}
			};
			upgrade.onerror = () => reject(upgrade.error);
			upgrade.onsuccess = () => resolve(upgrade.result);
		};
	});
}

export function savePendingFile(file) {
	return openDb().then((db) => new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE, "readwrite");
		transaction.objectStore(STORE).put(file, KEY);
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
		const transaction = db.transaction(STORE, "readwrite");
		const store = transaction.objectStore(STORE);
		const getRequest = store.get(KEY);
		getRequest.onsuccess = () => {
			if (getRequest.result) store.delete(KEY);
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
