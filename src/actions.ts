import { commands, window, Selection } from "vscode";
import { Extension } from "./extension";
import { Stack } from "./stack";
import { Command } from "./command";
import { getSelections, setSelections, getText, replaceText } from "./editor";
import { last, flatten } from "./utils";

export function actionCommand(f: (stack: Stack, main: Extension) => Thenable<void>): Command {
  return async (stack: Stack, main: Extension) => {
    await f(stack, main);
    return { stack };
  };
}

function insert(before: boolean): Command {
  const prop = before ? "start" : "end";
  return async (stack: Stack, main: Extension) => {
    const editor = window.activeTextEditor!;
    editor.selections = editor.selections.map((s) => new Selection(s[prop], s[prop]));
    main.enterInsertMode();
    return { stack: undefined };
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

function trimLeft(s: string): string {
  return s.replace(/^\s+/, "");
}

function joinHandleSelection(selection: Selection) {
  const text = getText(selection);
  const lines = text.split("\n").map((s, i) => i === 0 ? s : trimLeft(s));
  const offsets = lines.reduce((acc, line) => {
    acc.push(last(acc) + line.length + 1);
    return acc;
  }, [-1]).slice(1, -1);
  const newText = lines.join(" ");
  const edit = replaceText(selection, newText);
  return { selection, offsets, edit };
}

export const join = actionCommand(async () => {
  // FIXME: Buggy when multiple selections are set
  const results = getSelections().map(joinHandleSelection);
  await Promise.all(results.map((r) => r.edit));
});

export const joinSelect = actionCommand(async () => {
  const results = getSelections().map(joinHandleSelection);
  await Promise.all(results.map((r) => r.edit));
  setSelections(flatten(results.map(({ selection, offsets }) => {
    const startPos = selection.start;
    return offsets.map((offset) => new Selection(
      startPos.translate({ characterDelta: offset }),
      startPos.translate({ characterDelta: offset + 1 })
    ));
  })));
});
