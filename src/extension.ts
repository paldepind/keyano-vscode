// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { window, StatusBarAlignment, StatusBarItem } from "vscode";

enum Mode {
  Command,
  Insert
}

type Range = {
  start: number,
  end: number
};

interface Object {
  findNext(text: string, from: number): Range;
  findPrev(text: string, from: number): Range;
  expand(text: string, from: number, to: number): Range;
}

class PairObject implements Object {
  constructor(private open: string, private close: string) {
  }

  private findRight(text: string, origin: number, counter: number = 0) {
    for (let i = origin; i < text.length; ++i) {
      if (text[i] === this.open) {
        ++counter;
      } else if (text[i] === this.close) {
        --counter;
        if (counter === 0) {
          return i;
        }
      }
    }

    return -1;
  }

  private findLeft(text: string, origin: number, counter: number = 0) {
    for (let i = origin; i >= 0; --i) {
      if (text[i] === this.close) {
        ++counter;
      } else if (text[i] === this.open) {
        --counter;
        if (counter === 0) {
          return i;
        }
      }
    }

    return -1;
  }

  findNext(text: string, from: number) {
    const start = text.indexOf(this.open, from);
    const end = this.findRight(text, start) + 1;

    return start === -1 || end === 0 ? undefined : { start, end };
  }
  findPrev(text: string, from: number) {
    const end = text.lastIndexOf(this.close, from) + 1;
    const start = this.findLeft(text, end);

    return start === -1 || end === 0 ? undefined : { start, end };
  }
  expand(text: string, from: number, to: number): Range {
    const end = this.findRight(text, to, 1) + 1;
    const start = this.findLeft(text, from - 1, 1);

    console.log("start: " + start);
    console.log("end: " + end);

    return start === -1 || end === 0 ? undefined : { start, end };
  }
}

const parenthesis = new PairObject("(", ")");

// handles the bindings

const bindings = new Map<string, (main: Keyano) => void>();

bindings.set("i", (main: Keyano) => main.enterInsertMode());

bindings.set("p", (main: Keyano) => {
  console.log("Next");
  const editor = window.activeTextEditor;
  if (editor === undefined) {
    return;
  }
  const { document } = editor;
  const text = document.getText();
  const from = document.offsetAt(editor.selection.end);
  const { start, end } = parenthesis.findNext(text, from);
  const selection = new vscode.Selection(
    document.positionAt(start),
    document.positionAt(end)
  );
  editor.selection = selection;
});

bindings.set("P", (main: Keyano) => {
  console.log("Previous");
  const editor = window.activeTextEditor;
  if (editor === undefined) {
    return;
  }
  const { document } = editor;
  const text = document.getText();
  const from = document.offsetAt(editor.selection.start);
  const { start, end } = parenthesis.findPrev(text, from);
  const selection = new vscode.Selection(
    document.positionAt(start),
    document.positionAt(end)
  );
  editor.selection = selection;
});

bindings.set("e", (main: Keyano) => {
  console.log("Expand");
  const editor = window.activeTextEditor;
  if (editor === undefined) {
    return;
  }
  const { document } = editor;
  const text = document.getText();
  const from = document.offsetAt(editor.selection.start);
  const to = document.offsetAt(editor.selection.end);
  const { start, end } = parenthesis.expand(text, from, to);
  const selection = new vscode.Selection(
    document.positionAt(start),
    document.positionAt(end)
  );
  editor.selection = selection;
});

// This class encapsulates the global state and the methods on it. A
// single instance is created when the extension is activated.
class Keyano {
  statusBarItem: StatusBarItem;
  mode: Mode;

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
    const handler = bindings.get(char);
    if (handler !== undefined) {
      handler(this);
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
  const extension = new Keyano();
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