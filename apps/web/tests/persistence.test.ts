// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { emptyScene } from "@clik/scene";
import { useEditor } from "../src/lib/clik/store";
const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
  drafts: new Map(),
  user: { _id: "alice" },
  remote: {
    title: "Projet",
    scene: JSON.stringify({ version: 1, catalog: "clik-1", nodes: [] }),
    revision: 3,
  },
  authenticated: true,
}));
vi.mock("convex/react", () => ({
  useConvex: () => ({ query: async () => mocks.remote }),
  useConvexAuth: () => ({
    isAuthenticated: mocks.authenticated,
    isLoading: false,
  }),
  useConvexConnectionState: () => ({ isWebSocketConnected: true }),
  useQuery: (ref: unknown, args: unknown) =>
    args === "skip"
      ? undefined
      : String((ref as any)[Symbol.for("functionName")]).includes("auth:")
        ? mocks.user
        : mocks.remote,
  useMutation: (ref: any) =>
    String(ref[Symbol.for("functionName")]).includes("create")
      ? mocks.create
      : mocks.save,
}));
vi.mock("../src/lib/clik/local", () => ({
  readDraft: async (key: string) => mocks.drafts.get(key),
  writeDraft: async (key: string, draft: unknown) => {
    mocks.drafts.set(key, draft);
  },
  removeLocalCreation: (key: string, stamp: string) => mocks.remove(key, stamp),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), info: vi.fn() } }));
import { useProject } from "../src/lib/clik/use-project";
beforeEach(() => {
  mocks.drafts.clear();
  mocks.save.mockReset().mockResolvedValue(4);
  mocks.create.mockReset().mockResolvedValue("new-project");
  mocks.remove
    .mockReset()
    .mockImplementation(async (key: string, stamp: string) => {
      const draft = mocks.drafts.get(key);
      if (draft && draft.stamp !== stamp) throw Error("LOCAL_CONFLICT");
      mocks.drafts.delete(key);
    });
  mocks.authenticated = true;
  Object.defineProperty(navigator, "onLine", {
    value: true,
    configurable: true,
  });
  vi.stubGlobal(
    "BroadcastChannel",
    class {
      postMessage() {}
      close() {}
      onmessage = null;
    },
  );
  useEditor.getState().load(emptyScene(), "Test");
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("conserve les changements hors ligne et les envoie à la reconnexion", async () => {
  const { result } = renderHook(() => useProject("project"));
  await waitFor(() => expect(result.current.ready).toBe(true));
  Object.defineProperty(navigator, "onLine", {
    value: false,
    configurable: true,
  });
  act(() => {
    window.dispatchEvent(new Event("offline"));
    useEditor.getState().add("brick-1x1");
  });
  await waitFor(() =>
    expect(mocks.drafts.get("project:alice:project")?.dirty).toBe(true),
  );
  expect(mocks.save).not.toHaveBeenCalled();
  vi.useFakeTimers();
  Object.defineProperty(navigator, "onLine", {
    value: true,
    configurable: true,
  });
  await act(async () => {
    window.dispatchEvent(new Event("online"));
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1100);
  });
  expect(mocks.save).toHaveBeenCalledWith(
    expect.objectContaining({ revision: 3, title: "Projet" }),
  );
  expect(mocks.drafts.get("project:alice:project").dirty).toBe(false);
  expect(result.current.status).toBe("Enregistré");
});
it("un conflit serveur préserve le brouillon local et propose une copie", async () => {
  mocks.save.mockRejectedValue(new Error("CONFLICT"));
  const { result } = renderHook(() => useProject("project"));
  await waitFor(() => expect(result.current.ready).toBe(true));
  vi.useFakeTimers();
  await act(async () => useEditor.getState().add("brick-1x1"));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1100);
  });
  expect(result.current.conflict).toBe(true);
  expect(mocks.drafts.get("project:alice:project").scene.nodes).toHaveLength(1);
  await act(async () => {
    await result.current.copy();
  });
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({ title: "Projet · copie" }),
  );
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(mocks.drafts.has("project:alice:project")).toBe(true);
});
it.each([undefined, "my-creation"])(
  "transfère le projet local %s et retire uniquement sa copie locale",
  async (draftId) => {
    const key = draftId ? `guest:${draftId}` : "guest";
    mocks.drafts.set(key, {
      scene: emptyScene(),
      title: "Mon idée",
      revision: 0,
      stamp: "draft",
      dirty: false,
    });
    mocks.drafts.set("guest:another", { title: "Autre projet" });
    const { result } = renderHook(() => useProject(undefined, draftId));
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(async () => {
      await result.current.copy();
    });
    expect(mocks.create).toHaveBeenCalledWith({
      title: "Mon idée",
      scene: JSON.stringify(emptyScene()),
      localSourceId: `local:${key}:draft`,
    });
    expect(mocks.drafts.has(key)).toBe(false);
    expect(mocks.drafts.has("guest:another")).toBe(true);
    // A final effect from the previous editor cannot recreate the transferred draft.
    act(() => useEditor.getState().add("brick-1x1"));
    await act(async () => {});
    expect(mocks.drafts.has(key)).toBe(false);
  },
);

it("conserve le projet local si l’enregistrement en ligne échoue", async () => {
  const draft = {
    scene: emptyScene(),
    title: "Mon idée",
    revision: 0,
    stamp: "draft",
    dirty: false,
  };
  mocks.drafts.set("guest", draft);
  mocks.create.mockRejectedValueOnce(Error("Serveur indisponible"));
  const { result } = renderHook(() => useProject());
  await waitFor(() => expect(result.current.ready).toBe(true));
  await act(async () => {
    await expect(result.current.copy()).rejects.toThrow("indisponible");
  });
  expect(mocks.drafts.get("guest")).toEqual(draft);
  expect(mocks.remove).not.toHaveBeenCalled();
  await act(async () => {
    await result.current.copy();
  });
  expect(mocks.drafts.has("guest")).toBe(false);
  expect(mocks.create.mock.calls[0][0].localSourceId).toBe(
    mocks.create.mock.calls[1][0].localSourceId,
  );
});

it("attend la confirmation du serveur avant de retirer le projet local", async () => {
  mocks.drafts.set("guest", {
    scene: emptyScene(),
    title: "Mon idée",
    revision: 0,
    stamp: "draft",
    dirty: false,
  });
  let confirm!: (id: string) => void;
  mocks.create.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        confirm = resolve;
      }),
  );
  const { result } = renderHook(() => useProject());
  await waitFor(() => expect(result.current.ready).toBe(true));
  let transfer!: Promise<unknown>;
  act(() => {
    transfer = result.current.copy();
  });
  await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
  expect(mocks.drafts.has("guest")).toBe(true);
  expect(mocks.remove).not.toHaveBeenCalled();
  await act(async () => {
    await expect(result.current.copy()).rejects.toThrow(
      "Enregistrement en cours",
    );
    confirm("new-project");
    await transfer;
  });
  expect(mocks.drafts.has("guest")).toBe(false);
});

it("préserve une modification faite par un autre onglet pendant le transfert", async () => {
  const draft = {
    scene: emptyScene(),
    title: "Mon idée",
    revision: 0,
    stamp: "draft",
    dirty: false,
  };
  mocks.drafts.set("guest", draft);
  mocks.create.mockImplementationOnce(async () => {
    mocks.drafts.set("guest", {
      ...draft,
      title: "Version plus récente",
      stamp: "newer",
    });
    return "new-project";
  });
  const { result } = renderHook(() => useProject());
  await waitFor(() => expect(result.current.ready).toBe(true));
  await act(async () => {
    await result.current.copy();
  });
  expect(mocks.drafts.get("guest").title).toBe("Version plus récente");
});
