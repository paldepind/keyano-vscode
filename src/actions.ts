import { window, Selection, commands, workspace } from "vscode";
import { Extension } from "./extension";

export interface Action {
  execute(main: Extension): Promise<void>;
}

export const enterInsertMode: Action = {
  async execute(main: Extension) {
    main.enterInsertMode();
  }
};

export const deleteSelections: Action = {
  async execute(main: Extension): Promise<void> {
    await commands.executeCommand("cut");
  }
};
