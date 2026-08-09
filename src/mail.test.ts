import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/utils", () => ({
  runAppleScript: vi.fn(),
}));

import { ContextReadError } from "./errors";
import { createMailDeepLink, parseMailSelection } from "./mail";

const recordDelimiter = String.fromCharCode(30);
const fieldDelimiter = String.fromCharCode(31);

describe("createMailDeepLink", () => {
  it("wraps and encodes a bare Message-ID", () => {
    expect(createMailDeepLink("message@example.com")).toBe("message://%3Cmessage%40example.com%3E");
  });

  it("does not duplicate existing angle brackets", () => {
    expect(createMailDeepLink("<message@example.com>")).toBe(
      "message://%3Cmessage%40example.com%3E",
    );
  });
});

describe("parseMailSelection", () => {
  it("parses multiple selected messages in order", () => {
    const output = [
      `First subject${fieldDelimiter}first@example.com`,
      `Second subject${fieldDelimiter}second@example.com`,
    ].join(recordDelimiter);

    expect(parseMailSelection(output)).toEqual([
      { label: "First subject", url: "message://%3Cfirst%40example.com%3E" },
      { label: "Second subject", url: "message://%3Csecond%40example.com%3E" },
    ]);
  });

  it("uses a fallback label for an empty subject", () => {
    expect(parseMailSelection(`${fieldDelimiter}message@example.com`)).toEqual([
      { label: "No Subject", url: "message://%3Cmessage%40example.com%3E" },
    ]);
  });

  it("returns no sources for an empty Mail selection", () => {
    expect(parseMailSelection("")).toEqual([]);
  });

  it("rejects malformed serialized output", () => {
    expect(() => parseMailSelection("missing delimiter")).toThrow(ContextReadError);
  });
});
