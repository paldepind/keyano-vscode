import { Extension } from "./extension";
import { window, Selection, workspace } from "vscode";
import * as vscode from "vscode";
import { TextObject } from "./textobjects";
import * as textObjects from "./textobjects";
import { Command, selectAll } from "./commands";
import * as commands from "./commands";
import { Action } from "./actions";
import * as actions from "./actions";

const configuration = workspace.getConfiguration("keyano");

const qwertyToColemak = new Map([
  ["q", "q"],
  ["w", "w"],
  ["e", "f"],
  ["r", "p"],
  ["t", "g"],
  ["y", "j"],
  ["u", "l"],
  ["i", "u"],
  ["o", "y"],
  ["p", ";"],
  ["a", "a"],
  ["s", "s"],
  ["d", "s"],
  ["f", "t"],
  ["g", "d"],
  ["h", "h"],
  ["j", "n"],
  ["k", "e"],
  ["l", "i"],
  [";", "o"],
  ["z", "z"],
  ["x", "x"],
  ["c", "c"],
  ["v", "v"],
  ["b", "b"],
  ["n", "k"],
  ["m", "m"]
]);

function translateCharacter(char: string): string {
  const layout = configuration.keyboardLayout;
  if (layout === "colemak") {
    const translated = qwertyToColemak.get(char);
    return translated === undefined ? char : translated;
  } else {
    return char;
  }
}

export const bindings = new Map<string, Array<Command | Action | TextObject>>();

export function addBinding(key: string, stack: Array<Command | Action | TextObject>): void {
  bindings.set(translateCharacter(key), stack);
}

addBinding("i", [actions.enterInsertMode]);
addBinding("x", [actions.deleteSelections]);

addBinding("<", [commands.selectPrev]);
addBinding(">", [commands.selectNext]);
addBinding("a", [commands.selectAll]);
addBinding("e", [commands.expand]);

addBinding("p", [textObjects.parenthesis]);
addBinding("o", [textObjects.line]);
addBinding("j", [commands.selectNext, textObjects.word]);

addBinding("k", [commands.selectNext, textObjects.line]);
addBinding("l", [commands.selectPrev, textObjects.line]);
