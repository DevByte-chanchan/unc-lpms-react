import test from "node:test";
import assert from "node:assert/strict";

import {
  RESIZE_SETTLE_MS,
  subscribeToResizeActivity,
} from "./resizeActivity.js";

function createResizeHarness() {
  let resizeListener;
  let nextTimerId = 1;
  const timers = new Map();

  const target = {
    addEventListener(type, listener) {
      if (type === "resize") resizeListener = listener;
    },
    removeEventListener(type, listener) {
      if (type === "resize" && resizeListener === listener) {
        resizeListener = undefined;
      }
    },
  };

  const schedule = (callback, delay) => {
    const id = nextTimerId;
    nextTimerId += 1;
    timers.set(id, { callback, delay });
    return id;
  };

  const cancel = (id) => timers.delete(id);

  return {
    target,
    schedule,
    cancel,
    fireResize() {
      resizeListener?.();
    },
    pendingTimers() {
      return [...timers.values()];
    },
    runPendingTimer() {
      const entry = [...timers.entries()].at(-1);
      assert.ok(entry, "expected a pending resize-settlement timer");
      const [id, timer] = entry;
      timers.delete(id);
      timer.callback();
    },
  };
}

test("stays active until resizing has stopped for the settlement delay", () => {
  const harness = createResizeHarness();
  const changes = [];

  subscribeToResizeActivity({
    target: harness.target,
    onChange: (active) => changes.push(active),
    schedule: harness.schedule,
    cancel: harness.cancel,
  });

  harness.fireResize();
  harness.fireResize();

  assert.deepEqual(changes, [true]);
  assert.equal(harness.pendingTimers().length, 1);
  assert.equal(harness.pendingTimers()[0].delay, RESIZE_SETTLE_MS);

  harness.runPendingTimer();
  assert.deepEqual(changes, [true, false]);
});

test("cleanup removes the listener and cancels pending settlement", () => {
  const harness = createResizeHarness();
  const changes = [];

  const unsubscribe = subscribeToResizeActivity({
    target: harness.target,
    onChange: (active) => changes.push(active),
    schedule: harness.schedule,
    cancel: harness.cancel,
  });

  harness.fireResize();
  unsubscribe();
  harness.fireResize();

  assert.deepEqual(changes, [true]);
  assert.equal(harness.pendingTimers().length, 0);
});
