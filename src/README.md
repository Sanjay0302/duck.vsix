# Duck AI - Chat privately

[Duck.ai](duck.ai) is a free and anonymous AI chat service launched by DuckDuckGo.

Chat privately with ChatGPT, Claude, and other 3rd-party AI models for free with Duck.ai. **No account needed!**

This Visual Studio Code extension that allows you to chat with Duck AI directly within the editor, providing a user-friendly interface to interact.

## Features

- No-history tab.
- Chat session vanish.
- Simple and Clean UI.
- `katex` for math expression rendered.
- `marked` for real-time markdown rendering.
- Code snippet insertion directly into your editor.
- Uses simple GET POST API call to duck.ai endpoint.
- Responsive `Code block`, `Block Quotes`, `Table` support and other markdown support.
- Multi AI model includes `GPT 4o-mini`, `o3-mini`, `Claude-3 Haiku`, `Meta Llama`, `Mixtral`

## Requirements

- Active internet connection for DuckDuckGo API access

## Privacy & Data Flow

This extension is **not** an official DuckDuckGo product and does not use any documented, stable API. It works by replicating the request flow of DuckDuckGo's own web client against `duck.ai`'s undocumented backend. That means:

- DuckDuckGo can change that backend at any time without notice, which would break this extension until it's updated.
- Everything you type into the chat panel — including any code you paste — leaves your editor and is sent to DuckDuckGo's servers, and from there to whichever model you've selected (OpenAI, Anthropic, Meta, or Mistral), under duck.ai's own privacy terms.
- **Avoid pasting proprietary, confidential, or secret-bearing code** into the chat panel.

## Security

A few implementation details worth knowing if you're reviewing or contributing:

- The DuckDuckGo anti-bot "VQD" token handshake requires executing a short script returned by DuckDuckGo's server. That runs inside an [`isolated-vm`](https://github.com/laverdet/isolated-vm) sandbox — a separate V8 isolate with no access to Node internals — rather than directly in the extension process.
- The chat webview sanitizes all rendered Markdown/HTML through [DOMPurify](https://github.com/cure53/DOMPurify) before writing to `innerHTML`, and is scoped by a per-load Content-Security-Policy (nonce-based, `connect-src 'none'`).
- Runtime dependencies are kept at zero known vulnerabilities — run `npm run audit` to check.

## Extension Settings

This extension currently has no settings.

Future updates may include:

> - `duckChat.defaultModel`: Choose the default AI model (default: 'gpt-4o-mini')
>
> - `duckChat.chatVanish`: Enable/disable chat persistance (default: true)
>
> - `duckChat.chatHistory`: Enable/disable chat history (default: false)

## Known Issues

- Math rendering may occasionally fail for complex LaTeX expressions.
- Token refresh might be required for long chat sessions.
- Syntax highlighting for code responses not implemented as marked has removed highlight feature, trying to resolve this using `higlight.js`.

## Release Notes

### 1.0.0

Initial release of Duck Chat VSCode Extension:

- Basic chat functionality
- Markdown and LaTeX support
- Code snippet insertion
- Multiple model support
- Improved markdown rendering
- Added error handling for API requests
- Added support for additional AI models
- Improved chat UI responsiveness
- Enhanced code snippet handling

---

## Working with Duck Chat

The extension can be accessed in two ways:

- Via the Duck Chat icon in the activity bar
- Using the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and searching for "Start Duck Chat"

For more information and updates, visit:

- [Extension Repository](https://github.com/Sanjay0302/duck.vsix/)
- [Issue Tracker](https://github.com/Sanjay0302/duck.vsix/issues)

## Privacy Policy and Terms of Use

By using this extension user should adhere to Privacy Policy and Terms of Use provided by [DuckDuckGo](https://duckduckgo.com/terms).

[Privacy Policy and Terms of Use](https://duckduckgo.com/duckai/privacy-terms)

See [Privacy & Data Flow](#privacy--data-flow) above for what that means in practice for this extension.

## FAQ

1. What is Chat session vanish.
   The chat bubbles vanishes when the chat window is out of focus.

**Enjoy chatting with Duck AI!**
