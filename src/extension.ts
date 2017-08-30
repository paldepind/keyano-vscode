import * as vscode from "vscode";
import { StatusBarItem, window, StatusBarAlignment } from "vscode";
import { Stack, Stackable, cons } from "./stack";
import { bindings } from "./bindings";

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

function stackToString(stack: Stack): string {
  let str = "";
  while (stack !== undefined) {
    str += " > " + stack.head.toString();
    stack = stack.tail;
  }
  return str;
}

// This class encapsulates the global state and the methods on it. A
// single instance is created when the extension is activated.

export class Extension {
  statusBarItem: StatusBarItem;
  statusBarStack: StatusBarItem;
  mode: Mode;
  stack: Stack;
  keyHandler: KeyHandler | undefined;

  constructor() {
    this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
    this.statusBarStack = window.createStatusBarItem(StatusBarAlignment.Left);
    this.statusBarStack.text = "a > B > C";

    this.enterCommandMode();
    this.statusBarItem.show();
    this.statusBarStack.show();
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

    const command = bindings.get(char);
    if (command !== undefined) {
      [this.stack, this.keyHandler] = await command(this.stack, this);
      this.statusBarStack.text = stackToString(this.stack);
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
