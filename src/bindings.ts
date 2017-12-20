import * as actions from "./actions";
import * as textObjects from "./textobjects";
import * as flags from "./flags";
import { composeCommand, Command } from "./command";

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

for (const [from, to] of qwertyToColemak) {
  const upperCase = from === ";" ? ":" : from.toUpperCase();
  qwertyToColemak.set(upperCase, to.toUpperCase());
}

export type Bindings = Map<string, Command>;

const originalBindings: Bindings = new Map<string, Command>();

function addBinding(key: string, command: Command): void {
  originalBindings.set(key, command);
}

export type KeyboardLayout = "qwerty" | "colemak";

function translateBindings(translations: Map<string, string>, bindings: Bindings) {
  const translated = new Map();
  for (const [key, command] of bindings) {
    let newKey = translations.get(key);
    if (newKey === undefined) {
      newKey = key;
    }
    translated.set(newKey, command);
  }
  return translated;
}

export function getBindings(layout: KeyboardLayout): Bindings {
  if (layout === "qwerty") {
    return originalBindings;
  } else {
    return translateBindings(qwertyToColemak, originalBindings);
  }
}

// the classic lower left setup

addBinding("z", actions.undo);
addBinding("x", actions.cut);
addBinding("c", actions.copy);
addBinding("v", actions.paste);

addBinding("t", actions.join);
addBinding("T", actions.joinSelect);

// mode switching

addBinding("i", actions.insertBefore);
addBinding("o", actions.insertAfter);

addBinding("p", flags.previous);
addBinding("n", flags.next);
addBinding("a", flags.all);
addBinding("e", flags.expand);
addBinding("f", flags.jump);

// text objects

addBinding("(", textObjects.parentheses);
addBinding("{", textObjects.curlybrackets);
addBinding("[", textObjects.brackets);
addBinding("y", composeCommand(flags.next, textObjects.buffer));
addBinding("q", textObjects.line);
addBinding("w", textObjects.word);
addBinding("\"", textObjects.quotes);
addBinding("`", textObjects.tick);
addBinding("~", textObjects.tripleTick);
addBinding("d", textObjects.findText);

// right hand homerow

addBinding("j", composeCommand(flags.previous, textObjects.word));
addBinding("k", composeCommand(flags.next, textObjects.line));
addBinding("l", composeCommand(flags.previous, textObjects.line));
addBinding(";", composeCommand(flags.next, textObjects.word));
