import * as vscode from 'vscode';
import { window, Selection, workspace } from "vscode";
import { Extension } from './extension';
import { parenthesis, line, word } from "./textobjects";

import { repeater } from './prefix';
import { deleteSelections } from "./actions";

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

export const bindings = new Map<string, (main: Extension) => Promise<void>>();

export function addBinding(key: string, handler: (main: Extension) => Promise<void>): void {
  bindings.set(translateCharacter(key), handler);
}

addBinding("i", async (main: Extension) => main.enterInsertMode());

addBinding("T", async (main: Extension) => {
  const editor = window.activeTextEditor;
  if (editor === undefined) {
    return;
  }

  const { document } = editor;
  editor.edit((editBuilder: vscode.TextEditorEdit) => {
    editBuilder.insert(new vscode.Position(0, 0), "fisk (taske (torsk (tanke) (mozarella) (hest) (hund) (diverse (dyr))))\n\"quote test\"");
  });
});

addBinding("p", async (main: Extension) => {
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

addBinding("P", async (main: Extension) => {
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

addBinding("e", async (main: Extension) => {
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

addBinding("k", async (main: Extension) => {
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

addBinding("l", async (main: Extension) => {
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

addBinding("j", async (main: Extension) => {
  const editor = window.activeTextEditor;
  if (editor === undefined) {
    return;
  }
  const { document } = editor;
  const text = document.getText();
  const from = document.offsetAt(editor.selection.start);
  const { start, end } = word.findNext(text, from);
  const selection = new Selection(
    document.positionAt(start),
    document.positionAt(end)
  );
  editor.selection = selection;
});

for (let i = 0; i < 10; ++i) {
  addBinding(i.toString(), async (main: Extension) => {
    repeater.apply(main);
    repeater.argument(main, i.toString());
  });
}

addBinding("x", deleteSelections);
