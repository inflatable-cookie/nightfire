// A component style block may reference a token; it may not hold a colour.
//
// The g01.011 audit swept `var(--nightfire-*)` references, so it could not see
// values written directly, and a dark palette survived inside the shipped light
// defaults. This check reads every `ts/src/**/*.svelte` style block and fails on
// a colour literal, so the next one cannot land.
//
// Exception list, deliberately tiny: `transparent`, `currentColor` and
// `inherit` are keywords, not colours.
//
// Blind spot, on purpose: radii, spacing and font literals are the same class of
// directly written presentational value and are not covered here. This check
// guards colours only.

const NON_COLOUR_KEYWORDS = new Set(["transparent", "currentcolor", "inherit"]);

// Hex colours and functional colour notations carrying any literal argument.
const COLOUR_FUNCTION = /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\([^)]*\)/i;
const HEX_COLOUR = /#[0-9a-f]{3,8}\b/i;

// The CSS named colours. `transparent`, which is also a keyword, is handled by
// NON_COLOUR_KEYWORDS rather than listed here.
const NAMED_COLOURS = new Set([
  "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque", "black",
  "blanchedalmond", "blue", "blueviolet", "brown", "burlywood", "cadetblue", "chartreuse",
  "chocolate", "coral", "cornflowerblue", "cornsilk", "crimson", "cyan", "darkblue",
  "darkcyan", "darkgoldenrod", "darkgray", "darkgreen", "darkgrey", "darkkhaki",
  "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred", "darksalmon",
  "darkseagreen", "darkslateblue", "darkslategray", "darkslategrey", "darkturquoise",
  "darkviolet", "deeppink", "deepskyblue", "dimgray", "dimgrey", "dodgerblue", "firebrick",
  "floralwhite", "forestgreen", "fuchsia", "gainsboro", "ghostwhite", "gold", "goldenrod",
  "gray", "green", "greenyellow", "grey", "honeydew", "hotpink", "indianred", "indigo",
  "ivory", "khaki", "lavender", "lavenderblush", "lawngreen", "lemonchiffon", "lightblue",
  "lightcoral", "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightgrey",
  "lightpink", "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray",
  "lightslategrey", "lightsteelblue", "lightyellow", "lime", "limegreen", "linen",
  "magenta", "maroon", "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple",
  "mediumseagreen", "mediumslateblue", "mediumspringgreen", "mediumturquoise",
  "mediumvioletred", "midnightblue", "mintcream", "mistyrose", "moccasin", "navajowhite",
  "navy", "oldlace", "olive", "olivedrab", "orange", "orangered", "orchid", "palegoldenrod",
  "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff", "peru", "pink",
  "plum", "powderblue", "purple", "rebeccapurple", "red", "rosybrown", "royalblue",
  "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell", "sienna", "silver",
  "skyblue", "slateblue", "slategray", "slategrey", "snow", "springgreen", "steelblue",
  "tan", "teal", "thistle", "tomato", "turquoise", "violet", "wheat", "white", "whitesmoke",
  "yellow", "yellowgreen"
]);

// A declaration, not a selector: the property is the last word before the colon,
// and the value stops at the closing brace or semicolon. `.item:hover {` cannot
// match because `hover` is followed by `{`, not `:`.
const DECLARATION = /([a-zA-Z-]+)\s*:\s*([^;{}]+)[;}]/g;

export interface ColourLiteral {
  path: string;
  line: number;
  property: string;
  value: string;
  literal: string;
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
}

function lineAt(source: string, index: number): number {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (source[cursor] === "\n") line += 1;
  }
  return line;
}

function colourLiteralIn(rawValue: string): string | null {
  const value = rawValue
    .replace(/url\([^)]*\)/gi, " ")
    .replace(/"[^"]*"|'[^']*'/g, " ");

  const functional = COLOUR_FUNCTION.exec(value);
  if (functional) return functional[0].trim();

  const hex = HEX_COLOUR.exec(value);
  if (hex) return hex[0];

  for (const word of value.split(/[^A-Za-z]+/)) {
    if (!word || NON_COLOUR_KEYWORDS.has(word.toLowerCase())) continue;
    if (NAMED_COLOURS.has(word.toLowerCase())) return word;
  }

  return null;
}

export function styleBlocks(source: string): string[] {
  return Array.from(
    source.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/g),
    (match) => match[1]!,
  );
}

export function colourLiterals(source: string, path = "<source>"): ColourLiteral[] {
  const findings: ColourLiteral[] = [];
  for (const match of source.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/g)) {
    const offset = match.index! + match[0]!.indexOf(match[1]!);
    const css = stripComments(match[1]!);
    for (const declaration of css.matchAll(DECLARATION)) {
      const value = declaration[2]!;
      const literal = colourLiteralIn(value);
      if (!literal) continue;
      findings.push({
        path,
        line: lineAt(source, offset + declaration.index! + declaration[0]!.indexOf(value)),
        property: declaration[1]!,
        value: value.trim().replace(/\s+/g, " "),
        literal,
      });
    }
  }
  return findings;
}

export async function checkRepository(root = "ts/src"): Promise<ColourLiteral[]> {
  const files: string[] = [];
  for await (const path of new Bun.Glob("**/*.svelte").scan({ cwd: root, onlyFiles: true })) {
    files.push(`${root}/${path}`);
  }
  files.sort();

  const findings: ColourLiteral[] = [];
  for (const path of files) {
    findings.push(...colourLiterals(await Bun.file(path).text(), path));
  }
  return findings;
}

if (import.meta.main) {
  const findings = await checkRepository();
  if (findings.length > 0) {
    for (const finding of findings) {
      console.error(
        `${finding.path}:${finding.line} has colour literal ${finding.literal} in \`${finding.property}: ${finding.value}\``,
      );
    }
    throw new Error(
      `component styles hold ${findings.length} colour literal(s); reference a --nightfire-* token from ts/src/styles.css instead`,
    );
  }
  console.log("style literal proof passed: no colour literal in any ts/src/**/*.svelte style block");
}
