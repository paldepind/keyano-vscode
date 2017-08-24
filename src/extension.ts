import * as vscode from "vscode";
import { window, StatusBarAlignment, StatusBarItem, workspace } from 'vscode';
import { bindings } from './bindings';
import { Command, CommandResult } from './commands';
import { isTextObject, isCommand, isAction } from './utils';
import { TextObject } from './textobjects';

enum Mode {
  Command,
  Insert
}

// This class encapsulates the global state and the methods on it. A
// single instance is created when the extension is activated.
export class Extension {
  statusBarItem: StatusBarItem;
  mode: Mode;
  commandStack: Array<Command>;

  constructor() {
    this.commandStack = [];
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
    const bindingStack = bindings.get(char);

    // Bound keypress
    if (bindingStack) {
      // Loop through items in stack
      const length = bindingStack.length;
      for (let i = 0; i < length; ++i) {
        const current = bindingStack[i];
        
        // Check if the callstack handles this.
        if (!this.runOnCommandStack(char, isTextObject(current) ? current : undefined)) {
          if (isCommand(current)) {
            this.commandStack.push(current);
          } else if (isAction(current)) {
            current.execute(this);
          }
        }
      }
    } else {
      this.runOnCommandStack(char, undefined);
    }
  }

  // True if it was run on the callstack, false if not.
  private runOnCommandStack(char: string, obj: TextObject): boolean {
    const command = this.commandStack.pop();

    if (command) {
      const result = command.argument(this, char, obj);
      if (result === CommandResult.WAITING) {
        this.commandStack.push(command);
      } else if (result === CommandResult.ERROR) {
        this.commandStack = [];
      }
      return true;
    }
    return false;
  }
}

function registerCommandDisposable(context) {
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
