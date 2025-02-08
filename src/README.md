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

- `vscode webview-ui-toolkit` 1.2.2 or higher
- Active internet connection for DuckDuckGo API access

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

## FAQ

1. What is Chat session vanish.
   The chat bubbles vanishes when the chat window is out of focus.

**Enjoy chatting with Duck AI!**
