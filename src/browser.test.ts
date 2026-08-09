import { beforeEach, describe, expect, it, vi } from "vitest";

const browserMocks = vi.hoisted(() => ({
  getContent: vi.fn(),
  getTabs: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  BrowserExtension: browserMocks,
}));

import { ContextReadError } from "./errors";
import { getFocusedBrowserSource, isSupportedBrowser } from "./browser";

describe("isSupportedBrowser", () => {
  it("recognizes supported browsers by bundle ID", () => {
    expect(
      isSupportedBrowser({
        bundleId: "com.google.Chrome",
        name: "Localized Chrome name",
        path: "/Applications/Google Chrome.app",
      }),
    ).toBe(true);
  });

  it("does not classify an unrelated application as a browser", () => {
    expect(
      isSupportedBrowser({
        bundleId: "com.apple.TextEdit",
        name: "TextEdit",
        path: "/System/Applications/TextEdit.app",
      }),
    ).toBe(false);
  });
});

describe("getFocusedBrowserSource", () => {
  beforeEach(() => {
    browserMocks.getContent.mockReset();
    browserMocks.getTabs.mockReset();
  });

  it("returns the only active tab", async () => {
    browserMocks.getTabs.mockResolvedValue([
      { active: true, id: 1, title: "Example", url: "https://example.com" },
      { active: false, id: 2, title: "Other", url: "https://other.example" },
    ]);

    await expect(getFocusedBrowserSource()).resolves.toEqual({
      label: "Example",
      url: "https://example.com",
    });
  });

  it("matches the focused title when multiple windows have active tabs", async () => {
    browserMocks.getTabs.mockResolvedValue([
      { active: true, id: 1, title: "First", url: "https://first.example" },
      { active: true, id: 2, title: "Focused", url: "https://focused.example" },
    ]);
    browserMocks.getContent.mockResolvedValue("Focused");

    await expect(getFocusedBrowserSource()).resolves.toEqual({
      label: "Focused",
      url: "https://focused.example",
    });
  });

  it("uses page HTML to disambiguate duplicate active titles", async () => {
    browserMocks.getTabs.mockResolvedValue([
      { active: true, id: 1, title: "Duplicate", url: "https://first.example" },
      { active: true, id: 2, title: "Duplicate", url: "https://second.example" },
    ]);
    browserMocks.getContent.mockImplementation(
      async (options?: { cssSelector?: string; tabId?: number }) => {
        if (options?.cssSelector === "title") return "Duplicate";
        if (options?.tabId === 1) return "<html>first</html>";
        if (options?.tabId === 2) return "<html>focused</html>";
        return "<html>focused</html>";
      },
    );

    await expect(getFocusedBrowserSource()).resolves.toEqual({
      label: "Duplicate",
      url: "https://second.example",
    });
  });

  it("fails rather than returning the wrong tab when focus is ambiguous", async () => {
    browserMocks.getTabs.mockResolvedValue([
      { active: true, id: 1, title: "Duplicate", url: "https://first.example" },
      { active: true, id: 2, title: "Duplicate", url: "https://second.example" },
    ]);
    browserMocks.getContent.mockImplementation(
      async (options?: { cssSelector?: string; tabId?: number }) => {
        if (options?.cssSelector === "title") return "Duplicate";
        if (options?.tabId === 1) return "<html>first</html>";
        if (options?.tabId === 2) return "<html>second</html>";
        return "<html>neither</html>";
      },
    );

    await expect(getFocusedBrowserSource()).rejects.toThrow(ContextReadError);
  });

  it("reports unavailable browser access", async () => {
    browserMocks.getTabs.mockRejectedValue(new Error("Browser extension unavailable"));
    await expect(getFocusedBrowserSource()).rejects.toThrow("Enable the Raycast Browser Extension");
  });
});
