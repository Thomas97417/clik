import {
  validateScene,
  validateProvenance,
  emptyScene,
  type ProjectProvenance,
  type SceneDocument,
} from "@clik/scene";
import { forgetLocalDraft } from "./last-local-draft";
import { creationNameNumber, nextCreationName } from "./creation-name";
export type Draft = {
  scene: SceneDocument;
  title: string;
  revision: number;
  stamp: string;
  dirty: boolean;
  updatedAt?: number;
  provenance?: ProjectProvenance;
  placeholder?: boolean;
};
// This reserved key is never listed as a creation. Keeping the counter in the
// same store makes name allocation atomic across tabs without a schema upgrade.
const namingKey = "metadata:creation-name";
const isLocalCreationKey = (key: unknown): key is string =>
  typeof key === "string" &&
  (key === "guest" || /^guest:[a-z0-9-]{1,80}$/i.test(key));
const isCreationKey = (key: unknown): key is string =>
  isLocalCreationKey(key) ||
  (typeof key === "string" && key.startsWith("project:"));
function validateDraft(draft: Draft | undefined) {
  if (draft) {
    validateScene(draft.scene);
    if (draft.provenance) validateProvenance(draft.provenance);
  }
  return draft;
}
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
          resolve(validateDraft(req.result));
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

/** Reserve a persistent name before editing, while keeping untouched canvases out of the collection. */
export async function prepareLocalCreation(key: string): Promise<Draft> {
  if (!isLocalCreationKey(key)) throw Error("Création locale invalide.");
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("drafts", "readwrite"),
        store = tx.objectStore("drafts"),
        current = store.get(key);
      let draft: Draft;
      let failure: unknown;
      const abort = (error: unknown) => {
        failure = error;
        tx.abort();
      };
      current.onsuccess = () => {
        try {
          if (current.result) {
            draft = validateDraft(current.result)!;
            return;
          }
          const counter = store.get(namingKey);
          counter.onsuccess = () => {
            const titles: string[] = [];
            const request = store.openCursor();
            request.onsuccess = () => {
              try {
                const cursor = request.result;
                if (cursor) {
                  if (isCreationKey(cursor.key))
                    titles.push(
                      typeof cursor.value.title === "string"
                        ? cursor.value.title
                        : "",
                    );
                  cursor.continue();
                  return;
                }
                const { title, number } = nextCreationName(
                  titles,
                  counter.result?.number,
                );
                draft = {
                  title,
                  scene: emptyScene(),
                  revision: 0,
                  stamp: crypto.randomUUID(),
                  dirty: false,
                  placeholder: true,
                };
                store.add(draft, key);
                store.put({ number }, namingKey);
              } catch (error) {
                abort(error);
              }
            };
          };
        } catch (error) {
          abort(error);
        }
      };
      tx.oncomplete = () => resolve(draft);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(failure ?? tx.error);
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
        if (isCreationKey(key)) {
          const counter = store.get(namingKey);
          counter.onsuccess = () => {
            const number = creationNameNumber(draft.title) ?? 0;
            if (!(counter.result?.number >= number))
              store.put({ number }, namingKey);
          };
        }
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
          isLocalCreationKey(cursor.key) &&
          cursor.value.placeholder !== true
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
  if (!isLocalCreationKey(key)) throw Error("Création locale introuvable.");
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
    forgetLocalDraft(key === "guest" ? "" : key.slice(6));
  } finally {
    db.close();
  }
}
