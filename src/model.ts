export interface SourceLink {
  label: string;
  url: string;
}

export type CaptureContext =
  | {
      kind: "source";
      source: SourceLink;
      selection?: string;
    }
  | {
      kind: "multiple-sources";
      sources: SourceLink[];
    }
  | {
      kind: "generic";
      selection?: string;
    };

export interface DraftFields {
  content?: string;
  description?: string;
}

export function normalizeSelection(selection: string | undefined): string | undefined {
  const normalized = selection?.trim();
  return normalized ? normalized : undefined;
}

function escapeLinkLabel(label: string): string {
  return label
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function escapeLinkDestination(url: string): string {
  const encodedWhitespace = Array.from(url, character =>
    character.codePointAt(0)! <= 0x20 ? encodeURIComponent(character) : character,
  ).join("");

  return encodedWhitespace.replace(/\\/g, "%5C").replace(/\(/g, "%28").replace(/\)/g, "%29");
}

export function formatMarkdownLink(source: SourceLink): string {
  return `[${escapeLinkLabel(source.label)}](${escapeLinkDestination(source.url)})`;
}

export function createDraftFields(context: CaptureContext): DraftFields {
  if (context.kind === "generic") {
    const selection = normalizeSelection(context.selection);
    return selection ? { description: selection } : {};
  }

  if (context.kind === "multiple-sources") {
    const links = context.sources.map(formatMarkdownLink).join("\n\n");
    return links ? { description: links } : {};
  }

  const link = formatMarkdownLink(context.source);
  const selection = normalizeSelection(context.selection);

  return {
    content: link,
    description: selection ? `${selection}\n\n${link}` : link,
  };
}

export function buildTodoistQuickAddUrl(fields: DraftFields): string {
  const parameters: string[] = [];

  if (fields.content) {
    parameters.push(`content=${encodeURIComponent(fields.content)}`);
  }

  if (fields.description) {
    parameters.push(`description=${encodeURIComponent(fields.description)}`);
  }

  const query = parameters.join("&");
  return `todoist://openquickadd${query ? `?${query}` : ""}`;
}
