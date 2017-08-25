import { Extension } from './extension';
import { window, Selection, workspace } from "vscode";
import { isTextObject } from './utils';
import { TextObject } from "./textobjects";

export enum CommandResult {
  ERROR,
  WAITING,
  FINISHED
}

export interface Command {
  argument(main: Extension, char: string, obj: TextObject | undefined): CommandResult;
}

export const selectNext: Command = {
  argument(main: Extension, char: string, obj: TextObject | undefined): CommandResult {
    if (obj) {
      const editor = window.activeTextEditor;
      if (editor === undefined) {
        return CommandResult.ERROR;
      }
      const { document } = editor;
      const text = document.getText();
      const from = document.offsetAt(editor.selection.end);

      const result = obj.findNext(text, from);
      if (result) {
        const { start, end } = result;

        if (start && end) {
          const selection = new Selection(
            document.positionAt(start),
            document.positionAt(end)
          );
          editor.selection = selection;

          return CommandResult.FINISHED;
        }
      }
    }

    return CommandResult.ERROR;
  }
}

export const selectPrev: Command = {
  argument(main: Extension, char: string, obj: TextObject | undefined): CommandResult {
    if (obj) {
      const editor = window.activeTextEditor;
      if (editor === undefined) {
        return CommandResult.ERROR;
      }

      const { document } = editor;
      const text = document.getText();
      const from = document.offsetAt(editor.selection.start);
      const result = obj.findPrev(text, from);

      if (result) {
        const { start, end } = result;

        if (start && end) {
          const selection = new Selection(
            document.positionAt(start),
            document.positionAt(end)
          );
          editor.selection = selection;

          return CommandResult.FINISHED;
        }
      }
    }

    return CommandResult.ERROR;
  }
}

export const selectAll: Command = {
  argument(main: Extension, char: string, obj: TextObject | undefined): CommandResult {
    if (obj) {
      const editor = window.activeTextEditor;
      if (editor === undefined) {
        return CommandResult.ERROR;
      }
      const { document } = editor;
      const text = document.getText();

      const selections = [];
      let from = 0;
      let result;
      while (result = obj.findNext(text, from)) {
        const { start, end } = result;

        selections.push(new Selection(
          document.positionAt(start),
          document.positionAt(end)
        ));

        from = end;
      }
      
      if (selections.length > 0) {
        editor.selections = selections;
      }

      return CommandResult.FINISHED;
    }

    return CommandResult.ERROR;
  }
}

export const expand: Command = {
  argument(main: Extension, char: string, obj: TextObject | undefined): CommandResult {
    if (obj) {
      const editor = window.activeTextEditor;
      if (editor === undefined) {
        return CommandResult.ERROR;
      }
      const { document } = editor;
      const text = document.getText();
      const from = document.offsetAt(editor.selection.start);
      const to = document.offsetAt(editor.selection.end);
      const result = obj.expand(text, from, to);

      if (result) {
        const { start, end } = result;

        if (start && end) {
          const selection = new Selection(
            document.positionAt(start),
            document.positionAt(end)
          );
          editor.selection = selection;

          return CommandResult.FINISHED;
        }
      }
    }

    return CommandResult.ERROR;
  }
}