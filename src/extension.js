const vscode = require('vscode');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const { marked } = require('marked');
const katex = require('katex');

// Custom tokenizer for math expressions
const mathTokenizer = {
    name: 'math',
    level: 'inline',
    start(src) {
        return src.match(/\$|\\\(|\\\[/)?.index;
    },
    tokenizer(src) {
        // Display Math ($$...$$)
        const displayMatch = src.match(/^\$\$([\s\S]+?)\$\$/);
        if (displayMatch) {
            return {
                type: 'math',
                raw: displayMatch[0],
                text: displayMatch[1],
                display: true
            };
        }

        // Display Math (\[...\])
        const displayMatch2 = src.match(/^\\\[([\s\S]+?)\\\]/);
        if (displayMatch2) {
            return {
                type: 'math',
                raw: displayMatch2[0],
                text: displayMatch2[1],
                display: true
            };
        }

        // Inline Math ($...$)
        const inlineMatch = src.match(/^\$([^\$]+?)\$/);
        if (inlineMatch) {
            return {
                type: 'math',
                raw: inlineMatch[0],
                text: inlineMatch[1],
                display: false
            };
        }

        // Inline Math (\(...\))
        const inlineMatch2 = src.match(/^\\\(([\s\S]+?)\\\)/);
        if (inlineMatch2) {
            return {
                type: 'math',
                raw: inlineMatch2[0],
                text: inlineMatch2[1],
                display: false
            };
        }

        return false;
    },
    renderer(token) {
        try {
            return katex.renderToString(token.text, {
                displayMode: token.display,
                throwOnError: false
            });
        } catch (err) {
            console.error('KaTeX error:', err);
            return token.raw;
        }
    }
};

// Configure marked with custom tokenizer and renderer
marked.use({ extensions: [mathTokenizer] });

marked.setOptions({
    gfm: true,
    breaks: true
});

class DuckChatViewProvider {
    constructor(context) {
        this.context = context;
        this._view = undefined;
        this.currentVqdToken = null;
        this.messages = [];
        this.markdownConverter = marked;
        this.currentModel = 'gpt-4o-mini';
    }

    resolveWebviewView(webviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
            ]
        };

        const cssUri = webviewView.webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'chat.css'))
        );

        const htmlPath = path.join(this.context.extensionPath, 'media', 'chat.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        htmlContent = htmlContent.replace('${cssUri}', cssUri);

        webviewView.webview.html = htmlContent;

        webviewView.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'sendMessage':
                    await this.sendChatMessage(message.text, message.model);
                    break;
                case 'modelChanged':
                    this.currentModel = message.model;
                    this.messages = [];
                    await this.initializeChatSession();
                    break;
                case 'insertCode':
                    const editor = vscode.window.activeTextEditor;
                    if (editor) {
                        editor.edit(editBuilder => {
                            editBuilder.insert(editor.selection.active, message.code);
                        });
                    }
                    break;
            }
        });

        this.initializeChatSession();
    }

    async initializeChatSession() {
        try {
            const token = await this.getVqdToken();
            if (token) {
                this.currentVqdToken = token;
                console.log('Chat session initialized with token:', token);
            }
        } catch (error) {
            console.error('Failed to initialize chat session:', error);
        }
    }

    async getVqdToken() {
        try {
            const response = await fetch('https://duckduckgo.com/duckchat/v1/status', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                    'x-vqd-accept': '1'
                }
            });

            const token = response.headers.get('x-vqd-4');
            if (!token) {
                throw new Error('No VQD token in response');
            }
            return token;
        } catch (error) {
            console.error('Error getting token:', error);
            return null;
        }
    }

    async sendChatMessage(text, model) {
        try {
            // Add user message to the chat
            this.messages.push({ role: 'user', content: text });
            this._view.webview.postMessage({
                command: 'receiveMessage',
                text: this.markdownConverter(text),
                isIncremental: false
            });

            if (!this.currentVqdToken) {
                await this.initializeChatSession();
                if (!this.currentVqdToken) {
                    this._view.webview.postMessage({
                        command: 'receiveMessage',
                        text: 'Failed to initialize chat session',
                        isIncremental: false
                    });
                    return '';
                }
            }

            const response = await fetch('https://duckduckgo.com/duckchat/v1/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                    'Accept': 'text/event-stream',
                    'x-vqd-4': this.currentVqdToken
                },
                body: JSON.stringify({
                    model: model || this.currentModel,
                    messages: this.messages
                })
            });

            if (!response.ok) {
                console.error('API Response Error:', response.status, response.statusText);
                this._view.webview.postMessage({
                    command: 'receiveMessage',
                    text: `Error: ${response.status} ${response.statusText}`,
                    isIncremental: false
                });
                return '';
            }

            const newVqdToken = response.headers.get('x-vqd-4');
            if (newVqdToken) {
                this.currentVqdToken = newVqdToken;
                console.log('Updated VQD token:', newVqdToken);
            }

            let fullMessage = '';
            let buffer = '';
            let lastUpdate = 0;

            await new Promise((resolve, reject) => {
                response.body.on('data', chunk => {
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop();

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') {
                                resolve();
                                return;
                            }
                            try {
                                const jsonData = JSON.parse(data);
                                if (jsonData.message) {
                                    fullMessage += jsonData.message;
                                    const now = Date.now();
                                    if (now - lastUpdate >= 100 && this._view) {
                                        this._view.webview.postMessage({
                                            command: 'receiveMessage',
                                            text: this.markdownConverter(fullMessage),
                                            isIncremental: true
                                        });
                                        lastUpdate = now;
                                    }
                                }
                            } catch (error) {
                                console.error('JSON parse error:', error);
                                continue;
                            }
                        }
                    }
                });

                response.body.on('end', () => {
                    if (this._view) {
                        this._view.webview.postMessage({
                            command: 'receiveMessage',
                            text: this.markdownConverter(fullMessage),
                            isIncremental: true
                        });
                    }
                    resolve();
                });

                response.body.on('error', error => {
                    console.error('Stream error:', error);
                    reject(error);
                });
            });

            if (fullMessage) {
                this.messages.push({ role: 'assistant', content: fullMessage });
            }

            return '';
        } catch (error) {
            console.error('Error sending message:', error);
            this._view.webview.postMessage({
                command: 'receiveMessage',
                text: 'Error: ' + error.message,
                isIncremental: false
            });
            return '';
        }
    }
}

function activate(context) {
    console.log('Duck Chat extension is now active!');

    const provider = new DuckChatViewProvider(context);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('duckChatView', provider)
    );

    let startChatCommand = vscode.commands.registerCommand('duck-vsix.startChat', () => {
        vscode.commands.executeCommand('workbench.view.extension.duck-chat');
    });

    context.subscriptions.push(startChatCommand);
}

function deactivate() { }

module.exports = {
    activate,
    deactivate
}