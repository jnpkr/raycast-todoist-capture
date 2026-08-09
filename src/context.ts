import { getFrontmostApplication, getSelectedText } from "@raycast/api";
import { getFocusedBrowserSource, isSupportedBrowser } from "./browser";
import { getSelectedMailSources } from "./mail";
import { CaptureContext, normalizeSelection } from "./model";
import { getActiveObsidianSource } from "./obsidian";

const mailBundleId = "com.apple.mail";
const obsidianBundleId = "md.obsidian";

async function getOptionalSelection(): Promise<string | undefined> {
  try {
    return normalizeSelection(await getSelectedText());
  } catch {
    return undefined;
  }
}

export async function readCaptureContext(): Promise<CaptureContext> {
  const application = await getFrontmostApplication();
  const selection = await getOptionalSelection();

  if (isSupportedBrowser(application)) {
    return {
      kind: "source",
      source: await getFocusedBrowserSource(),
      selection,
    };
  }

  if (application.bundleId === mailBundleId) {
    const sources = await getSelectedMailSources();
    if (sources.length > 1) {
      return { kind: "multiple-sources", sources };
    }

    if (sources.length === 1) {
      return { kind: "source", source: sources[0], selection };
    }

    return { kind: "generic", selection };
  }

  if (application.bundleId === obsidianBundleId) {
    return {
      kind: "source",
      source: await getActiveObsidianSource(),
      selection,
    };
  }

  return { kind: "generic", selection };
}
