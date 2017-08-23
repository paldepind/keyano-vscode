import { Extension } from './extension';
import { parenthesis, line } from "./textobjects";
import { window, Selection, workspace } from "vscode";
import * as vscode from 'vscode';
import { repeater } from './prefix';

const configuration = workspace.getConfiguration("keyano");

const qwertyToColemak = new Map([
  ["q", "q"],
  ["w", "w"],
  ["e", "f"],
  ["r", "p"],
  ["t", "g"],
  ["y", "j"],
  ["u", "l"],
  ["i", "u"],
  ["o", "y"],
  ["p", ";"],
  ["a", "a"],
  ["s", "s"],
  ["d", "s"],
  ["f", "t"],
  ["g", "d"],
  ["h", "h"],
  ["j", "n"],
  ["k", "e"],
  ["l", "i"],
  [";", "o"],
  ["z", "z"],
  ["x", "x"],
  ["c", "c"],
  ["v", "v"],
  ["b", "b"],
  ["n", "k"],
  ["m", "m"]
]);

function translateCharacter(char: string): string {
  const layout = configuration.keyboardLayout;
  if (layout === "colemak") {
    return qwertyToColemak.get(char);
  } else {
    return char;
  }
}

export const bindings = new Map<string, (main: Extension) => void>();

export function addBinding(key: string, handler: (main: Extension) => void): void {
  bindings.set(translateCharacter(key), handler);
}

addBinding("i", (main: Extension) => main.enterInsertMode());

addBinding("T", (main: Extension) => {
  const editor = window.activeTextEditor;
  if (editor === undefined) {
    return;
  }

  const { document } = editor;
  editor.edit((editBuilder: vscode.TextEditorEdit) => {
    editBuilder.insert(new vscode.Position(0, 0), "fisk (taske (torsk (tanke) (mozarella) (hest) (hund) (diverse (dyr))))\n\"quote test\"");
  });
});

addBinding("p", (main: Extension) => {
  const editor = window.activeTextEditor;
  if (editor === undefined) {
    return;
  }
  const { document } = editor;
  const text = document.getText();
  const from = document.offsetAt(editor.selection.end);
  const { start, end } = parenthesis.findNext(text, from);
  const selection = new Selection(
    document.positionAt(start),
    document.positionAt(end)
  );
  editor.selection = selection;
});

addBinding("P", (main: Extension) => {
  const editor = window.activeTextEditor;
  if (editor === undefined) {
    return;
  }
  const { document } = editor;
  const text = document.getText();
  const from = document.offsetAt(editor.selection.start);
  const { start, end } = parenthesis.findPrev(text, from);
  const selection = new Selection(
    document.positionAt(start),
    document.positionAt(end)
  );
  editor.selection = selection;
});

addBinding("e", (main: Extension) => {
  const editor = window.activeTextEditor;
  if (editor === undefined) {
    return;
  }
  const { document } = editor;
  const text = document.getText();
  const from = document.offsetAt(editor.selection.start);
  const to = document.offsetAt(editor.selection.end);
  const { start, end } = parenthesis.expand(text, from, to);
  const selection = new Selection(
    document.positionAt(start),
    document.positionAt(end)
  );
  editor.selection = selection;
});

addBinding("k", (main: Extension) => {
  const editor = window.activeTextEditor;
  if (editor === undefined) {
    return;
  }
  const { document } = editor;
  const text = document.getText();
  const from = document.offsetAt(editor.selection.end);
  const { start, end } = line.findNext(text, from);
  const selection = new Selection(
    document.positionAt(start),
    document.positionAt(end)
  );
  editor.selection = selection;
});

addBinding("l", (main: Extension) => {
  const editor = window.activeTextEditor;
  if (editor === undefined) {
    return;
  }
  const { document } = editor;
  const text = document.getText();
  const from = document.offsetAt(editor.selection.start);
  const { start, end } = line.findPrev(text, from);
  const selection = new Selection(
    document.positionAt(start),
    document.positionAt(end)
  );
  editor.selection = selection;
});

for (let i = 0; i < 10; ++i) {
  addBinding(i.toString(), (main: Extension) => {
    repeater.apply(main);
    repeater.argument(main, i.toString());
  });
}
