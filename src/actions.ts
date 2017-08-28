import { commands, window, Selection } from "vscode";
import { Extension } from "./extension";
import { Stack } from "./stack";
import { Command } from "./command";

export function actionCommand(f: (stack: Stack, main: Extension) => Thenable<void>): Command {
  return async (stack: Stack, main: Extension) => {
    await f(stack, main);
    return [stack, undefined];
  };
}

function insert(before: boolean): Command {
  const prop = before ? "start" : "end";
  return async (stack: Stack, main: Extension) => {
    const editor = window.activeTextEditor!;
    editor.selections = editor.selections.map((s) => new Selection(s[prop], s[prop]));
    main.enterInsertMode();
    return [undefined, undefined];
  };
}

export const insertBefore = insert(true);
export const insertAfter = insert(false);

export const undo = actionCommand(() => commands.executeCommand("undo"));

export const cut = actionCommand(
  () => commands.executeCommand("editor.action.clipboardCutAction")
);

export const copy = actionCommand(
  () => commands.executeCommand("editor.action.clipboardCopyAction")
);

export const paste = actionCommand(
  () => commands.executeCommand("editor.action.clipboardPasteAction")
);
