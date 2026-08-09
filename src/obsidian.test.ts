import { describe, expect, it } from "vitest";
import { parseObsidianOutput } from "./obsidian";

describe("parseObsidianOutput", () => {
  it("parses the documented tab-separated CLI output", () => {
    const result = parseObsidianOutput(
      "path\tProjects/Launch plan.md\nname\tLaunch plan\nextension\tmd\n",
    );

    expect(result.get("path")).toBe("Projects/Launch plan.md");
    expect(result.get("name")).toBe("Launch plan");
    expect(result.get("extension")).toBe("md");
  });

  it("preserves tabs in values after the first separator", () => {
    const result = parseObsidianOutput("name\tTitle\twith tab\n");
    expect(result.get("name")).toBe("Title\twith tab");
  });

  it("ignores non-field output", () => {
    expect(parseObsidianOutput("No active file\n").size).toBe(0);
  });
});
