import { Extension } from "./extension";
import { window, Selection, workspace } from "vscode";
import { TextObject, isTextObjectCommand } from "./textobjects";
import { bindings } from "./bindings";

export enum CommandResult {
  Error,
  Waiting,
  Finished
}

export interface Command {
  type: string;
  argument(main: Extension, char: string | undefined): Promise<CommandResult>;
}

export function selectTextObject(textObject: TextObject, next: boolean): void {
  const editor = window.activeTextEditor;
  if (editor === undefined) {
    throw new Error("Editor was undefined");
  }
  const { document } = editor;
  const text = document.getText();
  let result;
  if (next) {
    const from = document.offsetAt(editor.selection.end);
    result = textObject.findNext(text, from);
  } else {
    const from = document.offsetAt(editor.selection.start);
    result = textObject.findPrev(text, from);
  }
  if (result !== undefined) {
    const { start, end } = result;
    const selection = new Selection(
      document.positionAt(start),
      document.positionAt(end)
    );
    editor.selection = selection;
  }
}

export const selectNext: Command = {
  type: "select-next",
  async argument(main: Extension, char: string): Promise<CommandResult> {
    const command = bindings.get(char);
    if (command !== undefined && isTextObjectCommand(command)) {
      selectTextObject(command.textObject, true);
      return CommandResult.Finished;
    } else {
      return CommandResult.Error;
    }
  }
};

export const selectPrev: Command = {
  type: "select-prev",
  async argument(main: Extension, char: string | undefined): Promise<CommandResult> {
    if (char === undefined) {
      return CommandResult.Waiting;
    }
    const command = bindings.get(char);
    if (command !== undefined && isTextObjectCommand(command)) {
      selectTextObject(command.textObject, false);
      return CommandResult.Finished;
    } else {
      return CommandResult.Error;
    }
  }
};

export const selectAll: Command = {
  type: "select-all",
  async argument(main: Extension, char: string | undefined): Promise<CommandResult> {
    if (char === undefined) {
      return CommandResult.Waiting;
    }
    const command = bindings.get(char);
    if (command !== undefined && isTextObjectCommand(command)) {
      const editor = window.activeTextEditor;
      if (editor === undefined) {
        return CommandResult.Error;
      }
      const { document } = editor;
      const text = document.getText();

      const selections = [];
      let from = 0;
      let result;
      while (result = command.textObject.findNext(text, from)) {
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
      return CommandResult.Finished;
    } else {
      return CommandResult.Error;
    }
  }
};

export const expand: Command = {
  type: "expand",
  async argument(main: Extension, char: string | undefined): Promise<CommandResult> {
    if (char === undefined) {
      return CommandResult.Waiting;
    }
    const command = bindings.get(char);
    if (command !== undefined && isTextObjectCommand(command)) {
      const editor = window.activeTextEditor;
      if (editor === undefined) {
        return CommandResult.Error;
      }
      const { document } = editor;
      const text = document.getText();
      const from = document.offsetAt(editor.selection.start);
      const to = document.offsetAt(editor.selection.end);
      const result = command.textObject.expand(text, from, to);

      if (result) {
        const { start, end } = result;

        if (start && end) {
          const selection = new Selection(
            document.positionAt(start),
            document.positionAt(end)
          );
          editor.selection = selection;

          return CommandResult.Finished;
        }
      }
    }
    return CommandResult.Error;
  }
};
