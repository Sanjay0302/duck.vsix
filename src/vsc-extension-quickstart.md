### What's in the Folder

- **`package.json`**: This file acts as the manifest. It contains metadata about your extension, including the commands you register. This is where you define the names and titles that’ll show up in the command palette.
  
- **`extension.js`**: This is where you implement your commands. The `activate` function is called when your extension runs for the first time, and it uses `registerCommand` to bind your command to its implementation.

>  Go to source folder use `npm install` and then use `npx vsce package` to get the vsix file for the extension.

---

### Getting Started

1. **Launch:** Press **F5** to open a new VS Code window with your extension activated.
2. **Execute Command:** To run your command, press **Ctrl+Shift+P** (Windows/Linux) or **Cmd+Shift+P** (Mac) and type `Hello World`.
3. **Debug:** Set breakpoints in `extension.js` to debug your code. The debug console will show output from your extension.

---

### Making Changes

- After modifying `extension.js`, relaunch your extension using the debug toolbar.
- Alternatively, you can reload the VS Code window with **Ctrl+R** (Windows/Linux) or **Cmd+R** (Mac) to reflect any changes.

---

### Explore the API

- You can find the complete set of APIs in `node_modules/@types/vscode/index.d.ts`. This file contains type definitions that will help you understand how to interact with the VS Code API.

---

### Running Tests

1. **Install Test Runner:** Add the [Extension Test Runner](https://marketplace.visualstudio.com/items?itemName=ms-vscode.extension-test-runner).
2. **Access Testing View:** Open the Testing view from the activity bar and click on **Run Test**, or use **Ctrl/Cmd + ; A**.
3. **Modify Tests:** Edit `test/extension.test.js` or create new test files in the `test` folder. Ensure your test files match the pattern `**.test.js` for them to be recognized.

---

### Go Further

- **UX Guidelines:** Follow the [UX guidelines](https://code.visualstudio.com/api/ux-guidelines/overview) for consistency with VS Code's interface.
  
- **Publish Extension:** Learn how to [publish your extension](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) on the marketplace.

- **CI Setup:** For continuous integration, follow the instructions for setting up [Continuous Integration](https://code.visualstudio.com/api/working-with-extensions/continuous-integration).

- **Issue Reporting:** Integrate a flow for users to report issues and feature requests by following the [issue reporting guide](https://code.visualstudio.com/api/get-started/wrapping-up#issue-reporting).

