import * as vscode from "vscode";
import { window, StatusBarAlignment, StatusBarItem, workspace } from 'vscode';
import { bindings } from "./bindings";
import { Prefix } from "./prefix";

enum Mode {
  Command,
  Insert
}

// This class encapsulates the global state and the methods on it. A
// single instance is created when the extension is activated.
export class Extension {
  statusBarItem: StatusBarItem;
  mode: Mode;
  prefix: Prefix;

  constructor() {
    this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
    this.enterCommandMode();
    this.statusBarItem.show();
  }

  enterCommandMode() {
    this.mode = Mode.Command;
    this.statusBarItem.text = "$(tools)";
    this.statusBarItem.tooltip = "Command mode";
    if (window.activeTextEditor !== undefined) {
      window.activeTextEditor.options.cursorStyle = vscode.TextEditorCursorStyle.Block;
    }
  }

  enterInsertMode() {
    this.mode = Mode.Insert;
    this.statusBarItem.text = "$(pencil)";
    this.statusBarItem.tooltip = "Insert mode";
    if (window.activeTextEditor !== undefined) {
      window.activeTextEditor.options.cursorStyle = vscode.TextEditorCursorStyle.Line;
    }
  }

  handleKey(char: string): void {
    if (this.prefix) {
      this.prefix.argument(this, char);
    } else {
      const handler = bindings.get(char);
      if (handler !== undefined) {
        handler(this);
      }
    }
  }
}

function registerCommandDisposable(context) {
  return (commandId: string, run: (...args: any[]) => void): void => {
    const disposable = vscode.commands.registerCommand(commandId, run);
    context.subscriptions.push(disposable);
  };
}

// this function is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
  const extension = new Extension();
  const registerCommand = registerCommandDisposable(context);

  registerCommand("keyano.escape", () => {
    extension.enterCommandMode();
  });

  vscode.commands.registerCommand("type", (arg) => {
    if (extension.mode === Mode.Insert) {
      vscode.commands.executeCommand("default:type", arg);
    } else {
      extension.handleKey(arg.text);
    }
  });
}

// this method is called when your extension is deactivated
export function deactivate() {
}
