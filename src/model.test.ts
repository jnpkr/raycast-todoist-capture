import { describe, expect, it } from "vitest";
import {
  buildTodoistQuickAddUrl,
  createDraftFields,
  formatMarkdownLink,
  normalizeSelection,
} from "./model";

describe("normalizeSelection", () => {
  it("trims surrounding whitespace while preserving internal line breaks", () => {
    expect(normalizeSelection("  First line\n\nSecond line  ")).toBe("First line\n\nSecond line");
  });

  it("treats whitespace-only text as no selection", () => {
    expect(normalizeSelection(" \n\t ")).toBeUndefined();
  });
});

describe("formatMarkdownLink", () => {
  it("escapes labels and unsafe destination characters", () => {
    expect(
      formatMarkdownLink({
        label: "A [title] \\ with\nspacing",
        url: "https://example.com/a path/(draft)",
      }),
    ).toBe("[A \\[title\\] \\\\ with spacing](https://example.com/a%20path/%28draft%29)");
  });
});

describe("createDraftFields", () => {
  const source = { label: "Example", url: "https://example.com/page" };
  const link = "[Example](https://example.com/page)";

  it("places a source link in both fields when there is no selection", () => {
    expect(createDraftFields({ kind: "source", source })).toEqual({
      content: link,
      description: link,
    });
  });

  it("places selected text before the repeated description link", () => {
    expect(
      createDraftFields({ kind: "source", source, selection: "  Selected passage  " }),
    ).toEqual({
      content: link,
      description: `Selected passage\n\n${link}`,
    });
  });

  it("puts multiple links only in the description", () => {
    expect(
      createDraftFields({
        kind: "multiple-sources",
        sources: [
          { label: "First", url: "message://first" },
          { label: "Second", url: "message://second" },
        ],
      }),
    ).toEqual({
      description: "[First](message://first)\n\n[Second](message://second)",
    });
  });

  it("uses generic selected text only as the description", () => {
    expect(createDraftFields({ kind: "generic", selection: " Selected " })).toEqual({
      description: "Selected",
    });
  });

  it("creates an empty draft for a generic context without a selection", () => {
    expect(createDraftFields({ kind: "generic" })).toEqual({});
  });
});

describe("buildTodoistQuickAddUrl", () => {
  it("opens an empty Quick Add without query parameters", () => {
    expect(buildTodoistQuickAddUrl({})).toBe("todoist://openquickadd");
  });

  it("encodes each field once without corrupting nested URLs or Unicode", () => {
    const content = "[Café](obsidian://open?path=%2FNotes%2FCaf%C3%A9.md)";
    const description = "Résumé & notes\n\n" + content;
    const result = new URL(buildTodoistQuickAddUrl({ content, description }));

    expect(result.protocol).toBe("todoist:");
    expect(result.hostname).toBe("openquickadd");
    expect(result.searchParams.get("content")).toBe(content);
    expect(result.searchParams.get("description")).toBe(description);
  });

  it("omits empty fields", () => {
    expect(buildTodoistQuickAddUrl({ content: "", description: "Selected" })).toBe(
      "todoist://openquickadd?description=Selected",
    );
  });
});
