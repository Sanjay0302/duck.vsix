// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

let currentPanel = undefined;

class DuckChatViewProvider {
    constructor(context) {
        this.context = context;
        this._view = undefined;
        this.currentVqdToken = null;
        this.messages = [];
    }

    resolveWebviewView(webviewView, context, token) {
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

        // Read and process the HTML template
        const htmlPath = path.join(this.context.extensionPath, 'media', 'chat.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        htmlContent = htmlContent.replace('${cssUri}', cssUri);

        webviewView.webview.html = htmlContent;

        webviewView.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'sendMessage':
                    const response = await this.sendChatMessage(message.text);
                    webviewView.webview.postMessage({ command: 'receiveMessage', text: response });
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

        // Initialize the chat session
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

    async sendChatMessage(message) {
        if (!this.currentVqdToken) {
            await this.initializeChatSession();
            if (!this.currentVqdToken) {
                return 'Failed to initialize chat session';
            }
        }

        try {
            // Add the new message to the conversation history
            this.messages.push({ role: 'user', content: message });

            const response = await fetch('https://duckduckgo.com/duckchat/v1/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                    'Accept': 'text/event-stream',
                    'x-vqd-4': this.currentVqdToken
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: this.messages
                })
            });

            if (!response.ok) {
                console.error('API Response Error:', response.status, response.statusText);
                return `Error: ${response.status} ${response.statusText}`;
            }

            // Get the new VQD token from the response
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
                    buffer = lines.pop(); // Keep the last partial line in the buffer

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
                                    // Only update if 100ms has passed since last update
                                    const now = Date.now();
                                    if (now - lastUpdate >= 100 && this._view) {
                                        this._view.webview.postMessage({ 
                                            command: 'receiveMessage', 
                                            text: fullMessage,
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
                    // Send final update regardless of time passed
                    if (this._view) {
                        this._view.webview.postMessage({ 
                            command: 'receiveMessage', 
                            text: fullMessage,
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

            // Add the assistant's response to the conversation history
            if (fullMessage) {
                this.messages.push({ role: 'assistant', content: fullMessage });
            }

            return fullMessage || 'No response received';
        } catch (error) {
            console.error('Error sending message:', error);
            return 'Error: ' + error.message;
        }
    }

    _getHtmlContent() {
        // This method is no longer needed
    }
}

function activate(context) {
    console.log('Duck Chat extension is now active!');

    const provider = new DuckChatViewProvider(context);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('duckChatView', provider)
    );

    let startChatCommand = vscode.commands.registerCommand('duck-vsx.startChat', () => {
        vscode.commands.executeCommand('workbench.view.extension.duck-chat');
    });

    context.subscriptions.push(startChatCommand);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
}
