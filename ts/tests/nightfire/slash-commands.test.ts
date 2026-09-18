import { describe, expect, it } from "../vitest";
import {
  buildNightfireSlashCommands,
  filterNightfireSlashCommands,
  findNightfireSlashMatch,
  removeNightfireSlashText
} from "../../src/slash-commands";

describe("nightfire/slash-commands", () => {
  it("builds default commands and merges custom aliases for registered block types", () => {
    const commands = buildNightfireSlashCommands(
      [
        { type: "markdown", label: "Markdown" },
        { type: "download_card", label: "Download card" }
      ],
      {
        enabled: true,
        commands: [
          {
            type: "download_card",
            aliases: ["file"],
            keywords: ["attachment"]
          },
          {
            type: "unknown",
            label: "Ignored"
          }
        ]
      }
    );

    expect(commands).toEqual([
      expect.objectContaining({
        type: "download_card",
        aliases: expect.arrayContaining(["download_card", "file"]),
        keywords: expect.arrayContaining(["attachment"])
      }),
      expect.objectContaining({
        type: "markdown",
        label: "Markdown"
      })
    ]);
  });

  it("filters commands across labels, aliases, and keywords", () => {
    const commands = [
      {
        id: "insert-markdown",
        type: "markdown",
        label: "Markdown",
        description: "Insert a markdown block.",
        aliases: ["paragraph"],
        keywords: ["text"]
      },
      {
        id: "insert-download_card",
        type: "download_card",
        label: "Download card",
        description: "Insert a download card block.",
        aliases: ["file"],
        keywords: ["attachment"]
      }
    ];

    expect(filterNightfireSlashCommands(commands, "para")).toEqual([commands[0]]);
    expect(filterNightfireSlashCommands(commands, "attachment")).toEqual([commands[1]]);
  });

  it("detects slash tokens at the caret and removes them after selection", () => {
    const context = {
      value: "Intro /down",
      selectionStart: 11,
      selectionEnd: 11
    };

    const match = findNightfireSlashMatch(context);
    expect(match).toEqual({
      start: 6,
      end: 11,
      query: "down"
    });
    expect(removeNightfireSlashText(context.value, match!)).toBe("Intro ");
  });

  it("ignores selections and non-command slashes", () => {
    expect(findNightfireSlashMatch({
      value: "https://example.com",
      selectionStart: 19,
      selectionEnd: 19
    })).toBeNull();

    expect(findNightfireSlashMatch({
      value: "/download",
      selectionStart: 0,
      selectionEnd: 9
    })).toBeNull();
  });
});
