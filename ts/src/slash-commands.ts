import type { BlockTypeOption } from "./editor-registry";
import type { MarkdownEditorContext } from "./markup/markdown-editor-context";

export interface NightfireSlashCommandInput {
  type: string;
  id?: string;
  label?: string;
  description?: string;
  aliases?: string[];
  keywords?: string[];
}

export interface NightfireSlashCommand {
  id: string;
  type: string;
  label: string;
  description: string | null;
  aliases: string[];
  keywords: string[];
}

export interface NightfireSlashCommandsConfig {
  enabled?: boolean;
  includeDefaults?: boolean;
  commands?: NightfireSlashCommandInput[];
}

export interface NightfireSlashMatch {
  start: number;
  end: number;
  query: string;
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
}

function normaliseSearchValue(value: string): string {
  return value.toLowerCase().trim();
}

function nonBlank(value: string | undefined): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function buildDefaultCommand(option: BlockTypeOption): NightfireSlashCommand {
  return {
    id: `insert-${option.type}`,
    type: option.type,
    label: option.label,
    description: `Insert a ${option.label.toLowerCase()} block.`,
    aliases: [option.type],
    keywords: []
  };
}

export function buildNightfireSlashCommands(
  typeOptions: BlockTypeOption[],
  config: NightfireSlashCommandsConfig | null | undefined
): NightfireSlashCommand[] {
  const allowedTypes = new Map(typeOptions.map((option) => [option.type, option.label]));
  const commands = new Map<string, NightfireSlashCommand>();

  if (config?.includeDefaults !== false) {
    for (const option of typeOptions) {
      commands.set(option.type, buildDefaultCommand(option));
    }
  }

  for (const input of config?.commands ?? []) {
    const defaultLabel = allowedTypes.get(input.type);
    if (!defaultLabel) {
      continue;
    }

    const existing = commands.get(input.type) ?? buildDefaultCommand({
      type: input.type,
      label: defaultLabel
    });

    commands.set(input.type, {
      id: input.id ?? existing.id,
      type: input.type,
      // A blank label is not a label: it must not erase the one the default
      // command already has.
      label: nonBlank(input.label) ?? existing.label,
      description: input.description ?? existing.description,
      aliases: dedupe([...(existing.aliases ?? []), ...(input.aliases ?? [])]),
      keywords: dedupe([...(existing.keywords ?? []), ...(input.keywords ?? [])])
    });
  }

  return Array.from(commands.values()).sort((left, right) => left.label.localeCompare(right.label));
}

export function filterNightfireSlashCommands(
  commands: NightfireSlashCommand[],
  query: string
): NightfireSlashCommand[] {
  const normalisedQuery = normaliseSearchValue(query);
  if (normalisedQuery.length === 0) {
    return commands;
  }

  return commands.filter((command) => {
    const haystack = dedupe([
      command.label,
      command.type,
      command.description ?? "",
      ...command.aliases,
      ...command.keywords
    ]).map(normaliseSearchValue);

    return haystack.some((value) => value.includes(normalisedQuery));
  });
}

export function findNightfireSlashMatch(
  context: MarkdownEditorContext
): NightfireSlashMatch | null {
  // A cursor from another document version (or a stale editor state) can sit
  // past the end of the value; clamp before slicing so the match stays inside it.
  const selectionStart = clampToLength(context.selectionStart, context.value.length);
  const selectionEnd = clampToLength(context.selectionEnd, context.value.length);

  if (selectionStart !== selectionEnd) {
    return null;
  }

  const beforeCursor = context.value.slice(0, selectionStart);
  const lineStart = beforeCursor.lastIndexOf("\n") + 1;
  const linePrefix = beforeCursor.slice(lineStart);
  const match = /(?:^|\s)\/([^\s/]*)$/.exec(linePrefix);

  if (!match) {
    return null;
  }

  const token = match[0];
  const query = match[1] ?? "";
  const offset = token.startsWith("/") ? 0 : 1;
  const start = selectionStart - token.length + offset;

  return {
    start,
    end: selectionStart,
    query
  };
}

function clampToLength(offset: number, length: number): number {
  if (!Number.isFinite(offset)) return 0;
  return Math.min(Math.max(Math.trunc(offset), 0), length);
}

export function removeNightfireSlashText(
  value: string,
  match: Pick<NightfireSlashMatch, "start" | "end">
): string {
  return `${value.slice(0, match.start)}${value.slice(match.end)}`;
}
