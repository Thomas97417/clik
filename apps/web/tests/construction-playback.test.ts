// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { emptyScene, makePart } from "@clik/scene";
import { useConstructionPlayback } from "../src/lib/clik/use-construction-playback";

const scene = {
  ...emptyScene(),
  nodes: [
    { ...makePart("brick-1x1", "#4079e8"), createdAt: 1000 },
    { ...makePart("brick-2x2", "#4079e8", [3, 0, 0]), createdAt: 2000 },
  ],
};

beforeEach(() => {
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 1),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it.each(["playing", "paused", "finished"])(
  "a placement interrupts %s playback and restores every piece",
  (mode) => {
    const { result, rerender } = renderHook(
      ({ editing }) => useConstructionPlayback(scene, editing),
      { initialProps: { editing: false } },
    );
    act(() => {
      if (mode === "playing") result.current.toggle();
      else
        result.current.seek(mode === "finished" ? result.current.duration : 0);
    });
    expect(result.current.active).toBe(true);
    rerender({ editing: true });
    expect(result.current.active).toBe(false);
    expect(result.current.playing).toBe(false);
    expect(result.current.scene).toBe(scene);
    // Releasing the pointer must not resurrect the interrupted video.
    rerender({ editing: false });
    expect(result.current.active).toBe(false);
    expect(result.current.playing).toBe(false);
    expect(result.current.scene).toBe(scene);
    expect(result.current.time).toBe(result.current.duration);
  },
);

it("does not enter playback during a placement, and can play again after release", () => {
  const { result, rerender } = renderHook(
    ({ editing }) => useConstructionPlayback(scene, editing),
    { initialProps: { editing: true } },
  );
  act(() => {
    result.current.toggle();
    result.current.seek(0);
  });
  expect(result.current.active).toBe(false);
  expect(result.current.scene).toBe(scene);
  rerender({ editing: false });
  act(() => result.current.toggle());
  expect(result.current.active).toBe(true);
  expect(result.current.playing).toBe(true);
  expect(result.current.scene?.nodes).toHaveLength(0);
});
