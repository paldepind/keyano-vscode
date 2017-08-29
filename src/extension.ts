import * as vscode from "vscode";
import { StatusBarItem, window, StatusBarAlignment, workspace } from "vscode";
import { Stack, Stackable, cons } from "./stack";
import { getBindings, KeyboardLayout, Bindings } from "./bindings";

enum Mode {
  Command,
  Insert
}

export enum HandlerResult {
  DECLINE,
  AWAIT,
  ACCEPT,
  ERROR
}

export type KeyHandler = (char: string) => HandlerResult;

// This class encapsulates the global state and the methods on it. A
// single instance is created when the extension is activated.
export class Extension {
  statusBarItem: StatusBarItem;
  mode: Mode;
  stack: Stack;
  bindings = getBindings("qwerty");
  keyHandler: KeyHandler | undefined;

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

  setLayout(layout: KeyboardLayout) {
    this.bindings = getBindings(layout);
  }

  async handleKey(char: string): Promise<void> {
    if (this.keyHandler !== undefined) {
      const result = await this.keyHandler(char);
      if (result === HandlerResult.AWAIT) {
        return;
      }
      this.keyHandler = undefined;
      if (result === HandlerResult.ACCEPT) {
        return;
      } else if (result === HandlerResult.ERROR) {
        this.stack = undefined;
        return;
      }
    }

    const command = this.bindings.get(char);
    if (command !== undefined) {
      [this.stack, this.keyHandler] = await command(this.stack, this);
    }
  }
}

function registerCommandDisposable(context: vscode.ExtensionContext) {
  return (commandId: string, run: (...args: any[]) => void): void => {
    const disposable = vscode.commands.registerCommand(commandId, run);
    context.subscriptions.push(disposable);
  };
}

export const extension = new Extension();

// this function is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
  const registerCommand = registerCommandDisposable(context);

  // Load configured layout and watch for changes
  extension.setLayout(workspace.getConfiguration("keyano").keyboardLayout);
  workspace.onDidChangeConfiguration(() => {
    const layout = workspace.getConfiguration("keyano").keyboardLayout;
    extension.setLayout(layout);
  });

  registerCommand("keyano.escape", () => {
    extension.enterCommandMode();
  });

  try {
    vscode.commands.registerCommand("type", (arg) => {
      if (extension.mode === Mode.Insert) {
        vscode.commands.executeCommand("default:type", arg);
      } else {
        extension.handleKey(arg.text);
      }
    });
  } catch (error) {
    console.log("Could not register type command. Another extension must have already done so.");
  }
}

// this method is called when your extension is deactivated
export function deactivate() {
}
