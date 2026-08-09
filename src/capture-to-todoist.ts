import { open, showHUD } from "@raycast/api";
import { readCaptureContext } from "./context";
import { ContextReadError } from "./errors";
import { buildTodoistQuickAddUrl, createDraftFields } from "./model";

function errorMessage(error: unknown): string {
  if (error instanceof ContextReadError) {
    return error.message;
  }

  return "Could not capture the current context.";
}

export default async function captureToTodoist(): Promise<void> {
  try {
    const context = await readCaptureContext();
    const draft = createDraftFields(context);
    await open(buildTodoistQuickAddUrl(draft));
  } catch (error) {
    console.error(error);
    await showHUD(errorMessage(error));
  }
}
