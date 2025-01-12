// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fetch = require('node-fetch');

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
            localResourceRoots: []
        };

        webviewView.webview.html = this._getHtmlContent();

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
                                    // Send incremental updates to the webview
                                    if (this._view) {
                                        this._view.webview.postMessage({ 
                                            command: 'receiveMessage', 
                                            text: fullMessage,
                                            isIncremental: true 
                                        });
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
                    // Process any remaining data in the buffer
                    if (buffer.startsWith('data: ')) {
                        const data = buffer.slice(6);
                        if (data !== '[DONE]') {
                            try {
                                const jsonData = JSON.parse(data);
                                if (jsonData.message) {
                                    fullMessage += jsonData.message;
                                    if (this._view) {
                                        this._view.webview.postMessage({ 
                                            command: 'receiveMessage', 
                                            text: fullMessage,
                                            isIncremental: true 
                                        });
                                    }
                                }
                            } catch (error) {
                                console.error('JSON parse error on final chunk:', error);
                            }
                        }
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
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    :root {
                        --input-padding-x: 10px;
                        --input-padding-y: 8px;
                    }
                    
                    body {
                        margin: 0;
                        padding: 0;
                        color: var(--vscode-foreground);
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        background-color: var(--vscode-editor-background);
                    }
                    
                    #chat-container {
                        display: flex;
                        flex-direction: column;
                        height: 100vh;
                        max-width: 100%;
                        margin: 0;
                        padding: 10px;
                    }
                    
                    #messages {
                        flex-grow: 1;
                        overflow-y: auto;
                        margin-bottom: 10px;
                        padding: 10px;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    
                    .message {
                        padding: 8px 12px;
                        border-radius: 6px;
                        max-width: 85%;
                        word-wrap: break-word;
                    }
                    
                    .user-message {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        align-self: flex-end;
                    }
                    
                    .assistant-message {
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        color: var(--vscode-editor-foreground);
                        align-self: flex-start;
                    }
                    
                    #input-container {
                        display: flex;
                        gap: 8px;
                        padding: 10px;
                        background-color: var(--vscode-editor-background);
                        border-top: 1px solid var(--vscode-widget-border);
                    }
                    
                    #message-input {
                        flex-grow: 1;
                        padding: var(--input-padding-y) var(--input-padding-x);
                        border: 1px solid var(--vscode-input-border);
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border-radius: 4px;
                        outline: none;
                    }
                    
                    #message-input:focus {
                        border-color: var(--vscode-focusBorder);
                    }
                    
                    #send-button {
                        padding: var(--input-padding-y) 15px;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    
                    #send-button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    
                    pre {
                        background-color: var(--vscode-textBlockQuote-background);
                        padding: 12px;
                        border-radius: 4px;
                        overflow-x: auto;
                        margin: 8px 0;
                    }
                    
                    code {
                        font-family: var(--vscode-editor-font-family);
                        font-size: var(--vscode-editor-font-size);
                    }
                    
                    .insert-code-button {
                        margin-top: 4px;
                        padding: 4px 8px;
                        background-color: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                        border: none;
                        border-radius: 2px;
                        cursor: pointer;
                        font-size: 12px;
                    }
                    
                    .insert-code-button:hover {
                        background-color: var(--vscode-button-secondaryHoverBackground);
                    }
                </style>
            </head>
            <body>
                <div id="chat-container">
                    <div id="messages"></div>
                    <div id="input-container">
                        <input type="text" id="message-input" placeholder="Type a message...">
                        <button id="send-button">Send</button>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const messagesDiv = document.getElementById('messages');
                    const messageInput = document.getElementById('message-input');
                    const sendButton = document.getElementById('send-button');
                    let currentMessageDiv = null;

                    function addMessage(text, isUser, isIncremental = false) {
                        if (isUser || !isIncremental || !currentMessageDiv) {
                            currentMessageDiv = document.createElement('div');
                            currentMessageDiv.className = \`message \${isUser ? 'user-message' : 'assistant-message'}\`;
                            messagesDiv.appendChild(currentMessageDiv);
                        }
                        
                        // Format code blocks with syntax highlighting
                        const formattedText = text.replace(/\`\`\`(.*?)\`\`\`/gs, (match, code) => {
                            return \`<pre><code>\${code}</code></pre>\`;
                        });
                        
                        currentMessageDiv.innerHTML = formattedText;
                        messagesDiv.scrollTop = messagesDiv.scrollHeight;

                        if (!isUser) {
                            const codeBlocks = currentMessageDiv.querySelectorAll('pre code');
                            codeBlocks.forEach(block => {
                                if (!block.nextElementSibling || !block.nextElementSibling.classList.contains('insert-code-button')) {
                                    const insertButton = document.createElement('button');
                                    insertButton.className = 'insert-code-button';
                                    insertButton.textContent = 'Insert Code';
                                    insertButton.onclick = () => {
                                        vscode.postMessage({
                                            command: 'insertCode',
                                            code: block.textContent
                                        });
                                    };
                                    block.parentElement.appendChild(insertButton);
                                }
                            });
                        }
                    }

                    sendButton.onclick = () => {
                        const text = messageInput.value.trim();
                        if (text) {
                            addMessage(text, true);
                            currentMessageDiv = null; // Reset for next response
                            vscode.postMessage({
                                command: 'sendMessage',
                                text: text
                            });
                            messageInput.value = '';
                        }
                    };

                    messageInput.onkeypress = (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendButton.click();
                        }
                    };

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'receiveMessage':
                                addMessage(message.text, false, message.isIncremental);
                                break;
                        }
                    });
                </script>
            </body>
            </html>
        `;
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
