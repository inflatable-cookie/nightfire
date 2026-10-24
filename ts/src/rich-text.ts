// Public rich-text rendering surface.
//
// Import this subpath to render stored rich-text documents and to register
// consumer-owned inline-node renderers. It loads no editor, no registration
// side effect, and no Poodle: a learner-facing renderer may import it directly.
//
//   import {
//     registerRichTextInlineNodeRenderer,
//     renderRichTextHtml
//   } from "@inflatable-cookie/nightfire/rich-text";

export {
  getRichTextInlineNodeRenderer,
  isAdmittedBuiltinRichTextNodeType,
  registerRichTextInlineNodeRenderer,
  unregisterRichTextInlineNodeRenderer
} from "./rich-text/inline-node-registry";
export type {
  RichTextInlineNode,
  RichTextInlineNodeContext,
  RichTextInlineNodeRenderer
} from "./rich-text/inline-node-registry";
export { renderRichTextHtml } from "./rich-text/render-html";
export type { RenderRichTextHtmlOptions } from "./rich-text/render-html";
