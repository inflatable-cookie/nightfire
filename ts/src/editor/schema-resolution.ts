import { getSchemaDefinition } from "../editor-registry";

export interface ResolvedNightfireSchemaDefinition {
	mode: "single" | "multi";
	defaultType: string;
}

/**
 * The registry's mode and default type for a schema. A schema with no
 * registry entry edits as a single markdown block, while its stored schema
 * name is kept as given.
 */
export function resolveSchemaDefinition(schemaId: string): ResolvedNightfireSchemaDefinition {
	const definition = getSchemaDefinition(schemaId);
	if (definition) {
		return {
			mode: definition.mode,
			defaultType: definition.defaultType
		};
	}

	return {
		mode: "single",
		defaultType: "markdown"
	};
}
