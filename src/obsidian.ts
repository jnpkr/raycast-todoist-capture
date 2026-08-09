import { execFile } from "node:child_process";
import { join } from "node:path";
import { ContextReadError } from "./errors";
import { SourceLink } from "./model";

const obsidianCliPath = "/usr/local/bin/obsidian";

function runObsidianCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(obsidianCliPath, [command], { encoding: "utf8" }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(stdout);
    });
  });
}

export function parseObsidianOutput(output: string): Map<string, string> {
  const values = new Map<string, string>();

  for (const line of output.split("\n")) {
    const separatorIndex = line.indexOf("\t");
    if (separatorIndex === -1) {
      continue;
    }

    values.set(line.slice(0, separatorIndex), line.slice(separatorIndex + 1));
  }

  return values;
}

export async function getActiveObsidianSource(): Promise<SourceLink> {
  let fileOutput: string;
  let vaultOutput: string;

  try {
    [fileOutput, vaultOutput] = await Promise.all([
      runObsidianCommand("file"),
      runObsidianCommand("vault"),
    ]);
  } catch (error) {
    throw new ContextReadError("Could not read the active note using the Obsidian CLI.", {
      cause: error,
    });
  }

  const file = parseObsidianOutput(fileOutput);
  const vault = parseObsidianOutput(vaultOutput);
  const relativePath = file.get("path");
  const vaultPath = vault.get("path");

  if (!relativePath || !vaultPath) {
    throw new ContextReadError("Obsidian did not report an active note and vault.");
  }

  const absolutePath = join(vaultPath, relativePath);
  const label = file.get("name")?.trim() || relativePath;

  return {
    label,
    url: `obsidian://open?path=${encodeURIComponent(absolutePath)}`,
  };
}
