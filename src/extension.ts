import * as vscode from "vscode";
import { StatusBarItem, window, StatusBarAlignment, workspace } from "vscode";
import { Stack } from "./stack";
import { getBindings, KeyboardLayout } from "./bindings";
import { KeyCommand } from "./command";

enum Mode {
  Command,
  Insert
}

// export type KeyHandler = (stack: Stack, char: string) => Promise<HandlerResult>;

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
  bindings = getBindings("qwerty");
  keyHandler: KeyCommand | undefined;

  constructor() {
    this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
    this.statusBarStack = window.createStatusBarItem(StatusBarAlignment.Left);
    this.statusBarStack.text = ">";

    this.enterCommandMode();
    this.statusBarItem.show();
    this.statusBarStack.show();
  }

  enterCommandMode() {
    this.mode = Mode.Command;
    this.statusBarItem.text = "$(tools)";
    vscode.commands.executeCommand("setContext", "keyano.mode", "command");
    this.statusBarItem.tooltip = "Command mode";
    if (window.activeTextEditor !== undefined) {
      window.activeTextEditor.options.cursorStyle =
        vscode.TextEditorCursorStyle.Block;
    }
  }

  enterInsertMode() {
    this.mode = Mode.Insert;
    this.statusBarItem.text = "$(pencil)";
    this.statusBarItem.tooltip = "Insert mode";
    vscode.commands.executeCommand("setContext", "keyano.mode", "insert");
    if (window.activeTextEditor !== undefined) {
      window.activeTextEditor.options.cursorStyle =
        vscode.TextEditorCursorStyle.Line;
    }
  }

  setLayout(layout: KeyboardLayout) {
    this.bindings = getBindings(layout);
  }

  async handleInput(args: { text: string }): Promise<void> {
    if (this.mode === Mode.Insert) {
      await vscode.commands.executeCommand("default:type", args);
    } else {
      const command =
        this.keyHandler !== undefined
          ? this.keyHandler
          : this.bindings.get(args.text);
      if (command !== undefined) {
        const result = await command(this.stack, this, args.text);
        this.stack = result.stack;
        this.keyHandler = result.handler;
        this.statusBarStack.text = stackToString(this.stack);
      }
    }
  }
}

function registerCommandDisposable(context: vscode.ExtensionContext) {
  return (commandId: string, run: (...args: any[]) => void): void => {
    const disposable = vscode.commands.registerCommand(commandId, run);
    context.subscriptions.push(disposable);
  };
}

export let extension: Extension;

// this function is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
  extension = new Extension();

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
      extension.handleInput(arg);
    });
  } catch (error) {
    console.log(
      "Could not register type command. Another extension must have already done so."
    );
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}
