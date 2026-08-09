import { runAppleScript } from "@raycast/utils";
import { ContextReadError } from "./errors";
import { SourceLink } from "./model";

const recordDelimiter = String.fromCharCode(30);
const fieldDelimiter = String.fromCharCode(31);

const readSelectedMessagesScript = `
tell application "Mail"
  set selectedMessages to selection
  set recordSeparator to character id 30
  set fieldSeparator to character id 31
  set serializedMessages to {}

  repeat with selectedMessage in selectedMessages
    set messageSubject to subject of selectedMessage as text
    set messageIdentifier to message id of selectedMessage as text
    set end of serializedMessages to messageSubject & fieldSeparator & messageIdentifier
  end repeat

  set previousDelimiters to AppleScript's text item delimiters
  set AppleScript's text item delimiters to recordSeparator
  set serializedOutput to serializedMessages as text
  set AppleScript's text item delimiters to previousDelimiters
  return serializedOutput
end tell
`;

export function createMailDeepLink(messageId: string): string {
  const bareMessageId = messageId.trim().replace(/^<|>$/g, "");
  return `message://${encodeURIComponent(`<${bareMessageId}>`)}`;
}

export function parseMailSelection(output: string): SourceLink[] {
  if (!output.trim()) {
    return [];
  }

  return output.split(recordDelimiter).map(record => {
    const separatorIndex = record.indexOf(fieldDelimiter);
    if (separatorIndex === -1) {
      throw new ContextReadError("Mail returned an unreadable message selection.");
    }

    const subject = record.slice(0, separatorIndex).trim();
    const messageId = record.slice(separatorIndex + fieldDelimiter.length).trim();
    if (!messageId) {
      throw new ContextReadError("A selected Mail message did not contain a Message-ID.");
    }

    return {
      label: subject || "No Subject",
      url: createMailDeepLink(messageId),
    };
  });
}

export async function getSelectedMailSources(): Promise<SourceLink[]> {
  try {
    const output = await runAppleScript(readSelectedMessagesScript);
    return parseMailSelection(output);
  } catch (error) {
    if (error instanceof ContextReadError) {
      throw error;
    }

    throw new ContextReadError("Could not read the selected message from Mail.", { cause: error });
  }
}
