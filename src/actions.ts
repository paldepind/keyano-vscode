import { commands } from "vscode";
import { Extension } from "./extension";
import { Stack } from "./stack";
import { Command } from "./command";

export const enterInsertMode: Command = async (stack: Stack, main: Extension) => {
  main.enterInsertMode();
  return [undefined, undefined];
};

export const deleteSelections: Command = async (stack: Stack, main: Extension) => {
  await commands.executeCommand("cut");
  return [stack, undefined];
};
