import { window, Selection, commands, workspace } from "vscode";

import { Extension } from "./extension";

export async function deleteSelections(main: Extension): Promise<void> {
  await commands.executeCommand("cut");
}
