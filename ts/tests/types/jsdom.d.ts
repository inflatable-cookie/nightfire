// jsdom ships without type declarations. The test harness and the renderer
// consumer check use only the constructor and the window it returns, so that
// is all this declares. Adding @types/jsdom would need a PROVENANCE entry.
declare module "jsdom" {
  export interface JSDOMOptions {
    url?: string;
    [option: string]: unknown;
  }

  export class JSDOM {
    constructor(html?: string, options?: JSDOMOptions);
    readonly window: Window & typeof globalThis;
  }
}
