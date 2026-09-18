import ItemListRenderer from "./ItemListRenderer.svelte";
import TableRenderer from "./TableRenderer.svelte";
import { registerBlockRenderer } from "../render-registry";

// Block renderers for the generic layout family.
//
// Registered against the wildcard schema so a profile that admits these types gets
// them without repeating a registration.

registerBlockRenderer(null, "table", TableRenderer);
registerBlockRenderer(null, "item_list", ItemListRenderer);
