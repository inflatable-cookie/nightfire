import {
  fireEvent as domFireEvent,
  getQueriesForElement,
  waitFor,
  within
} from "@testing-library/dom";
import { flushSync, mount, tick, unmount } from "svelte";

const mounted: Array<{ component: Record<string, unknown>; container: HTMLElement }> = [];

export function render(
  component: Parameters<typeof mount>[0],
  props: Record<string, unknown> = {}
) {
  const container = document.createElement("div");
  document.body.append(container);
  const instance = mount(component, { target: container, props });
  mounted.push({ component: instance, container });
  return {
    ...getQueriesForElement(container),
    component: instance,
    container
  };
}

export const screen = getQueriesForElement(document.body);

type AsyncFireEvent = {
  [K in keyof typeof domFireEvent]: (typeof domFireEvent)[K] extends (
    ...args: infer Args
  ) => infer Result
    ? (...args: Args) => Promise<Awaited<Result>>
    : (typeof domFireEvent)[K];
};

export const fireEvent: AsyncFireEvent = new Proxy(domFireEvent, {
  get(target, property, receiver): unknown {
    const value: unknown = Reflect.get(target, property, receiver);
    if (typeof value !== "function") {
      return value;
    }
    const fn = value as (...args: Array<unknown>) => unknown;
    return async (...args: Array<unknown>): Promise<unknown> => {
      const result: unknown = await fn(...args);
      flushSync();
      await tick();
      return result;
    };
  }
}) as unknown as AsyncFireEvent;

export function cleanup(): void {
  for (const entry of mounted.splice(0)) {
    void unmount(entry.component);
    entry.container.remove();
  }
}

export { waitFor, within };
