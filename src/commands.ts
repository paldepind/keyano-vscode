import { Extension } from "./extension";
import { window, Selection, workspace } from "vscode";
import { TextObject, isTextObjectCommand } from "./textobjects";
import { bindings } from "./bindings";
import { setTargets, goToTarget } from "./jump";

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
  const from = document.offsetAt(editor.selection.start);
  const to = document.offsetAt(editor.selection.end);
  const result =
    next ? textObject.findNext(text, from, to) : textObject.findPrev(text, from, to);
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
      let to = 0;
      let result;
      while (result = command.textObject.findNext(text, from, to)) {
        const { start, end } = result;
        selections.push(new Selection(
          document.positionAt(start),
          document.positionAt(end)
        ));
        from = start;
        to = end;
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

export const jumpAll = {
  targets: undefined,
  keys: "",
  type: "jump-all",
  async argument(main: Extension, char: string | undefined): Promise<CommandResult> {
    if (char === undefined) {
      return CommandResult.Waiting;
    }
    if (this.targets === undefined) {
      const command = bindings.get(char);
      if (command !== undefined && isTextObjectCommand(command)) {
        this.targets = setTargets(command.textObject);
        return CommandResult.Waiting;
      } else {
        return CommandResult.Error;
      }
    } else if (this.targets && this.keys.length === 0) {
      this.keys = char;
      return CommandResult.Waiting;
    } else {
      console.log("jumping", this.keys);
      goToTarget(this.keys + char, this.targets);
      this.keys = "";
      this.targets = undefined;
      return CommandResult.Finished;
    }
  }
};