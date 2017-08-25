import { window, Selection, commands, workspace } from "vscode";
import { Extension } from "./extension";
import { CommandResult, Command } from "./commands";

export interface Action {
  execute(main: Extension): Promise<void>;
}

function createAction(
  name: string, execute: (main: Extension) => Promise<void>
): Command {
  return {
    type: `action-${name}`,
    async argument(main: Extension, char: string | undefined): Promise<CommandResult> {
      await execute(main);
      return CommandResult.Finished;
    }
  };
}

export const enterInsertMode = createAction(
  "insert",
  async (main: Extension) => main.enterInsertMode()
);

export const deleteSelections = createAction(
  "delete",
  async (main: Extension) => {
    await commands.executeCommand("cut");
  }
);
