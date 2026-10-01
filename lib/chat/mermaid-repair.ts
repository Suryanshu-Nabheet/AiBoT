/** Candidate sources used before giving malformed assistant Mermaid to the renderer. */
function splitPackedStatements(source: string): string {
  let result = "";
  let spaces = "";
  let squareDepth = 0;
  let braceDepth = 0;
  let parenDepth = 0;
  let inQuote = false;
  let inLinkLabel = false;

  for (const character of source) {
    if (character === '"' && squareDepth > 0) inQuote = !inQuote;
    if (!inQuote) {
      if (character === "[") squareDepth += 1;
      if (character === "]") squareDepth = Math.max(0, squareDepth - 1);
      if (character === "{") braceDepth += 1;
      if (character === "}") braceDepth = Math.max(0, braceDepth - 1);
      if (character === "(") parenDepth += 1;
      if (character === ")") parenDepth = Math.max(0, parenDepth - 1);
      if (character === "|" && squareDepth === 0) inLinkLabel = !inLinkLabel;
    }

    const insideNode = squareDepth > 0 || braceDepth > 0 || parenDepth > 0;
    if ((character === " " || character === "\t") && !inQuote) {
      spaces += character;
      continue;
    }

    if (
      spaces.length > 1 &&
      !insideNode &&
      !inLinkLabel &&
      result.trimEnd().length > 0
    ) {
      result = `${result.trimEnd()}\n`;
    } else {
      result += spaces;
    }
    spaces = "";
    result += character;
  }

  return `${result}${spaces}`;
}

function repairFlowchartLinks(source: string): string {
  return source
    .split("\n")
    .map((line) => {
      const normalized = line.replace(
        /(-->|==>|-\.->|---)\s*\|\s*([^|\n]*?)\s*\|\s*/g,
        (_match, arrow: string, label: string) => `${arrow}|${label.trim()}|`,
      );

      return normalized.replace(
        /((?:-->|==>|-\.->|---)\s*(?:\|[^|\n]*\|\s*)?)\[([^\]\n]+)\]/g,
        (_match, edge: string, label: string) => {
          const id = label
            .normalize("NFKD")
            .replace(/[^a-zA-Z0-9]+/g, " ")
            .trim()
            .split(/\s+/)
            .map((part: string) =>
              part ? part[0].toUpperCase() + part.slice(1) : "",
            )
            .join("");
          return `${edge}${id || "DiagramNode"}[${label}]`;
        },
      );
    })
    .join("\n");
}

export function buildMermaidRepairCandidates(source: string): string[] {
  const original = source.replace(/\r\n?/g, "\n").trim();
  const splitSource = splitPackedStatements(original);
  const normalized = splitSource
    .replace(
      /^(flowchart|graph)\s+(TB|TD|BT|LR|RL)\s+(?=subgraph\b)/i,
      "$1 $2\n",
    )
    .replace(/\\?<br\s*\/?>/gi, " ");
  const normalizedStatements = normalized
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (/^subgraph\s+/i.test(trimmed)) {
        return trimmed.replace(/^subgraph/i, "subgraph");
      }
      if (/^end$/i.test(trimmed)) return "end";
      return trimmed;
    })
    .filter(Boolean)
    .join("\n");

  const repairedLinks = repairFlowchartLinks(normalizedStatements);
  const subgraphCount = repairedLinks.match(/^subgraph\b/gim)?.length ?? 0;
  const endCount = repairedLinks.match(/^end\s*$/gim)?.length ?? 0;
  const balanced =
    subgraphCount > endCount
      ? `${repairedLinks}\n${Array.from(
          { length: subgraphCount - endCount },
          () => "end",
        ).join("\n")}`
      : repairedLinks;

  return [
    ...new Set([original, normalizedStatements, repairedLinks, balanced]),
  ];
}
