// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { emptyScene } from "@clik/scene";
import { useEditor } from "../src/lib/clik/store";
const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  create: vi.fn(),
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
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
import { useProject } from "../src/lib/clik/use-project";
beforeEach(() => {
  mocks.drafts.clear();
  mocks.save.mockReset().mockResolvedValue(4);
  mocks.create.mockReset().mockResolvedValue("new-project");
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
});
it("conserver le brouillon après connexion crée un projet sans effacer le brouillon invité", async () => {
  mocks.drafts.set("guest", {
    scene: emptyScene(),
    title: "Mon idée",
    revision: 0,
    stamp: "draft",
    dirty: false,
  });
  const { result } = renderHook(() => useProject());
  await waitFor(() => expect(result.current.ready).toBe(true));
  await act(async () => {
    await result.current.copy();
  });
  expect(mocks.create).toHaveBeenCalledWith({
    title: "Mon idée",
    scene: JSON.stringify(emptyScene()),
  });
  expect(mocks.drafts.has("guest")).toBe(true);
});
