import { validateScene, type SceneDocument } from "@clik/scene";
export type Draft = {
  scene: SceneDocument;
  title: string;
  revision: number;
  stamp: string;
  dirty: boolean;
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
        store.put(draft, key);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(Error("LOCAL_CONFLICT"));
    });
  } finally {
    db.close();
  }
}
