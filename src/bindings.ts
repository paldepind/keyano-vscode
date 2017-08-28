import { workspace } from "vscode";
import * as actions from "./actions";
import * as textObjects from "./textobjects";
import * as flags from "./flags";
import { composeCommand, Command } from "./command";

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

export const bindings = new Map<string, Command>();

export function addBinding(key: string, command: Command): void {
  bindings.set(translateCharacter(key), command);
}

addBinding("i", actions.enterInsertMode);
addBinding("x", actions.deleteSelections);

addBinding("p", flags.previous);
addBinding("n", flags.next);
addBinding("a", flags.all);
addBinding("e", flags.expand);
addBinding("f", flags.jump);

addBinding("(", textObjects.parentheses);
addBinding("{", textObjects.curlybrackets);
addBinding("[", textObjects.brackets);
addBinding("q", textObjects.line);
addBinding("w", textObjects.word);

// right hand homerow

addBinding("j", composeCommand(flags.previous, textObjects.word));
addBinding("k", composeCommand(flags.next, textObjects.line));
addBinding("l", composeCommand(flags.previous, textObjects.line));
addBinding(";", composeCommand(flags.next, textObjects.word));
