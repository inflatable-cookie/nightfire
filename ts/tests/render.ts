import {
  fireEvent as domFireEvent,
  getQueriesForElement,
  waitFor,
  within,
} from "@testing-library/dom";
import { flushSync, mount, tick, unmount } from "svelte";

const mounted: Array<{ component: Record<string, unknown>; container: HTMLElement }> = [];

export function render(component: Parameters<typeof mount>[0], props: Record<string, unknown> = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  const instance = mount(component, { target: container, props });
  mounted.push({ component: instance, container });
  return {
    ...getQueriesForElement(container),
    component: instance,
    container,
  };
}

export const screen = getQueriesForElement(document.body);

export const fireEvent = new Proxy(domFireEvent, {
  get(target, property, receiver) {
    const value = Reflect.get(target, property, receiver);
    if (typeof value !== "function") return value;
    return async (...args: unknown[]) => {
      const result = await value(...args);
      flushSync();
      await tick();
      return result;
    };
  },
});

export function cleanup(): void {
  for (const entry of mounted.splice(0)) {
    unmount(entry.component);
    entry.container.remove();
  }
}

export { waitFor, within };
