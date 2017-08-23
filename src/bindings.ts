import { Extension } from "./extension";
import { parenthesis } from "./textobjects";
import { window, Selection } from "vscode";

export const bindings = new Map<string, (main: Extension) => void>();

export function addBinding(key: string, handler: (main: Extension) => void): void {
  bindings.set(key, handler);
}

addBinding("i", (main: Extension) => main.enterInsertMode());

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