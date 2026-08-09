import { Application, BrowserExtension } from "@raycast/api";
import { ContextReadError } from "./errors";
import { SourceLink } from "./model";

interface BrowserTab {
  active: boolean;
  id: number;
  title?: string;
  url: string;
}

const browserBundleIds = new Set([
  "com.apple.Safari",
  "com.apple.SafariTechnologyPreview",
  "com.brave.Browser",
  "com.google.Chrome",
  "com.google.Chrome.canary",
  "com.microsoft.edgemac",
  "com.operasoftware.Opera",
  "com.vivaldi.Vivaldi",
  "company.thebrowser.Browser",
  "org.chromium.Chromium",
]);

const browserNames = new Set([
  "Arc",
  "Brave Browser",
  "Chromium",
  "Google Chrome",
  "Google Chrome Canary",
  "Microsoft Edge",
  "Opera",
  "Safari",
  "Safari Technology Preview",
  "Vivaldi",
]);

export function isSupportedBrowser(application: Application): boolean {
  return (
    (application.bundleId !== undefined && browserBundleIds.has(application.bundleId)) ||
    browserNames.has(application.name)
  );
}

async function readFocusedTitle(): Promise<string | undefined> {
  try {
    const title = await BrowserExtension.getContent({ cssSelector: "title", format: "text" });
    return title.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function disambiguateByHtml(candidates: BrowserTab[]): Promise<BrowserTab | undefined> {
  if (candidates.length === 0) {
    return undefined;
  }

  const uniqueUrls = new Set(candidates.map(tab => tab.url));
  if (uniqueUrls.size === 1) {
    return candidates[0];
  }

  try {
    const focusedHtml = await BrowserExtension.getContent({ format: "html" });
    const candidateHtml = await Promise.allSettled(
      candidates.map(async tab => ({
        html: await BrowserExtension.getContent({ format: "html", tabId: tab.id }),
        tab,
      })),
    );
    const matchingTabs = candidateHtml
      .filter(
        (result): result is PromiseFulfilledResult<{ html: string; tab: BrowserTab }> =>
          result.status === "fulfilled",
      )
      .filter(result => result.value.html === focusedHtml)
      .map(result => result.value.tab);

    if (matchingTabs.length === 1 || new Set(matchingTabs.map(tab => tab.url)).size === 1) {
      return matchingTabs[0];
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export async function getFocusedBrowserSource(): Promise<SourceLink> {
  let tabs: BrowserTab[];

  try {
    tabs = await BrowserExtension.getTabs();
  } catch (error) {
    throw new ContextReadError(
      "Could not access the current browser tab. Enable the Raycast Browser Extension.",
      {
        cause: error,
      },
    );
  }

  const activeTabs = tabs.filter(tab => tab.active && tab.url);
  if (activeTabs.length === 0) {
    throw new ContextReadError("No active browser tab was found.");
  }

  let focusedTitle: string | undefined;
  let focusedTab: BrowserTab | undefined;

  if (activeTabs.length === 1) {
    focusedTab = activeTabs[0];
  } else {
    focusedTitle = await readFocusedTitle();
    const titleMatches = focusedTitle
      ? activeTabs.filter(tab => tab.title?.trim() === focusedTitle)
      : activeTabs.filter(tab => !tab.title?.trim());

    focusedTab =
      titleMatches.length === 1 ? titleMatches[0] : await disambiguateByHtml(titleMatches);
  }

  if (!focusedTab) {
    throw new ContextReadError(
      "Could not identify the focused browser tab among multiple windows.",
    );
  }

  return {
    label: focusedTab.title?.trim() || focusedTitle || focusedTab.url,
    url: focusedTab.url,
  };
}
