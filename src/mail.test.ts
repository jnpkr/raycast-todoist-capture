import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/utils", () => ({
  runAppleScript: vi.fn(),
}));

import { ContextReadError } from "./errors";
import { createMailDeepLink, extractMessageIdFromHeaders, parseMailSelection } from "./mail";

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

describe("extractMessageIdFromHeaders", () => {
  it("extracts a Message-ID case-insensitively", () => {
    const headers = [
      "From: sender@example.com",
      "Message-Id: <fallback@example.com>",
      "Subject: Appointment Reminder",
    ].join("\r\n");

    expect(extractMessageIdFromHeaders(headers)).toBe("<fallback@example.com>");
  });

  it("unfolds a continued Message-ID header", () => {
    const headers = "Message-ID:\r\n\t<folded@example.com>\r\nSubject: Reminder";

    expect(extractMessageIdFromHeaders(headers)).toBe("<folded@example.com>");
  });

  it("returns undefined when the headers do not contain a Message-ID", () => {
    expect(
      extractMessageIdFromHeaders("From: sender@example.com\r\nSubject: Reminder"),
    ).toBeUndefined();
  });
});

describe("parseMailSelection", () => {
  it("parses multiple selected messages using property and header Message-IDs", () => {
    const output = [
      `First subject${fieldDelimiter}first@example.com${fieldDelimiter}`,
      `Second subject${fieldDelimiter}${fieldDelimiter}From: sender@example.com\r\nMessage-Id: <second@example.com>`,
    ].join(recordDelimiter);

    expect(parseMailSelection(output)).toEqual([
      { label: "First subject", url: "message://%3Cfirst%40example.com%3E" },
      { label: "Second subject", url: "message://%3Csecond%40example.com%3E" },
    ]);
  });

  it("prefers Mail's message id property when both sources contain a value", () => {
    const output = `Subject${fieldDelimiter}property@example.com${fieldDelimiter}Message-ID: <header@example.com>`;

    expect(parseMailSelection(output)).toEqual([
      { label: "Subject", url: "message://%3Cproperty%40example.com%3E" },
    ]);
  });

  it("uses a fallback label for an empty subject", () => {
    expect(parseMailSelection(`${fieldDelimiter}message@example.com${fieldDelimiter}`)).toEqual([
      { label: "No Subject", url: "message://%3Cmessage%40example.com%3E" },
    ]);
  });

  it("returns no sources for an empty Mail selection", () => {
    expect(parseMailSelection("")).toEqual([]);
  });

  it("rejects malformed serialized output", () => {
    expect(() => parseMailSelection("missing delimiter")).toThrow(ContextReadError);
  });

  it("rejects a message without a property or header Message-ID", () => {
    const output = `Subject${fieldDelimiter}${fieldDelimiter}From: sender@example.com`;

    expect(() => parseMailSelection(output)).toThrow(
      "A selected Mail message did not contain a Message-ID.",
    );
  });
});
