import { validateScene, type SceneDocument } from "@clik/scene";
export type Draft = {
  scene: SceneDocument;
  title: string;
  revision: number;
  stamp: string;
  dirty: boolean;
  updatedAt?: number;
};
const database = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("clik", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("drafts");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
export async function readDraft(key: string): Promise<Draft | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction("drafts").objectStore("drafts").get(key);
      req.onsuccess = () => {
        try {
          if (req.result) validateScene(req.result.scene);
          resolve(req.result);
        } catch (e) {
          reject(e);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}
export async function writeDraft(key: string, draft: Draft, expected?: string) {
  const db = await database();
  try {
    return await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("drafts", "readwrite"),
        store = tx.objectStore("drafts"),
        req = store.get(key);
      req.onsuccess = () => {
        if (
          expected !== undefined &&
          req.result &&
          req.result.stamp !== expected
        ) {
          tx.abort();
          reject(Error("LOCAL_CONFLICT"));
          return;
        }
        store.put({ ...draft, updatedAt: Date.now() }, key);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(Error("LOCAL_CONFLICT"));
    });
  } finally {
    db.close();
  }
}

/** Only guest creations belong in this list, never another account’s backups. */
export async function listLocalCreations(): Promise<
  (Draft & { key: string })[]
> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const entries: (Draft & { key: string })[] = [];
      const request = db
        .transaction("drafts")
        .objectStore("drafts")
        .openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(
            entries.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)),
          );
          return;
        }
        if (
          typeof cursor.key === "string" &&
          (cursor.key === "guest" ||
            /^guest:[a-z0-9-]{1,80}$/i.test(cursor.key))
        ) {
          entries.push({ ...cursor.value, key: cursor.key });
        }
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** Delete exactly the local version confirmed by the user, never a newer edit. */
export async function removeLocalCreation(key: string, expectedStamp: string) {
  if (key !== "guest" && !/^guest:[a-z0-9-]{1,80}$/i.test(key))
    throw Error("Création locale introuvable.");
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("drafts", "readwrite");
      const store = tx.objectStore("drafts");
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result && request.result.stamp !== expectedStamp) {
          tx.abort();
          return;
        }
        store.delete(key);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(
          Error(
            "Cette création a été modifiée dans un autre onglet. Actualisez la page avant de réessayer.",
          ),
        );
    });
  } finally {
    db.close();
  }
}
