import { Extension } from './extension';
import { window, Selection, workspace } from "vscode";
import { isTextObject } from './utils';
import { TextObject } from "./textobjects";

export enum CommandResult {
  ERROR,
  BLOCK,
  BLOCK_AND_REMOVE
}

export interface Command {
  argument(main: Extension, char: string, obj: TextObject): CommandResult;
}

export const selectNext: Command = {
  argument(main, char, obj) {
    if (obj) {
      const editor = window.activeTextEditor;
      if (editor === undefined) {
        return;
      }
      const { document } = editor;
      const text = document.getText();
      const from = document.offsetAt(editor.selection.end);
      const { start, end } = obj.findNext(text, from);
      const selection = new Selection(
        document.positionAt(start),
        document.positionAt(end)
      );
      editor.selection = selection;

      return CommandResult.BLOCK_AND_REMOVE;
    }

    return CommandResult.ERROR;
  }
}

export const selectPrev: Command = {
  argument(main, char, obj) {
    if (isTextObject(obj)) {
      const editor = window.activeTextEditor;
      if (editor === undefined) {
        return;
      }
      const { document } = editor;
      const text = document.getText();
      const from = document.offsetAt(editor.selection.start);
      const { start, end } = obj.findPrev(text, from);
      const selection = new Selection(
        document.positionAt(start),
        document.positionAt(end)
      );
      editor.selection = selection;

      return CommandResult.BLOCK_AND_REMOVE;
    }

    return CommandResult.ERROR;
  }
}