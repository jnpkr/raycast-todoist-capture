# Todoist Capture

A personal macOS Raycast extension that turns the current application context into an unsaved Todoist Quick Add draft. It uses `todoist://openquickadd`, so there is no Todoist API token and the task isn't saved until you review and submit it.

## Capture behaviour

| Context                         | Todoist content                                      | Todoist description                                  |
| :------------------------------ | :--------------------------------------------------- | :--------------------------------------------------- |
| Browser page or Obsidian note   | Markdown link to the source                          | Selected text followed by the link, or just the link |
| One selected Mail message       | Markdown link using the subject and `message://` URL | Selected text followed by the link, or just the link |
| Multiple selected Mail messages | Empty                                                | One Markdown link per message                        |
| Other application               | Empty                                                | Selected text, if any                                |

Mail normally provides the message identifier directly. If that value is empty, the extension recovers it from the email's `Message-ID` header.

## Requirements

- macOS with Raycast and Todoist installed
- `pnpm`
- Raycast Browser Extension enabled for browser capture
- Permission for Raycast to automate Mail when macOS requests it
- Obsidian CLI available at `/usr/local/bin/obsidian` for Obsidian capture

## Run locally

```bash
pnpm install
pnpm dev
```

In Raycast, find **Capture to Todoist** and assign it a global hotkey. Trigger the hotkey while the source application is still frontmost; opening the command through Raycast search changes the active application and therefore the context being captured.

Stop the development watcher with `Ctrl+C`.

## Checks

```bash
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

## Code map

- `src/capture-to-todoist.ts`: command entry point and error handling
- `src/context.ts`: frontmost-application detection and routing
- `src/browser.ts`, `src/mail.ts`, `src/obsidian.ts`: application-specific context extraction
- `src/model.ts`: Markdown formatting and Todoist URI construction
- `src/*.test.ts`: unit tests alongside the implementation
