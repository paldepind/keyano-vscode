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
  ["s", "r"],
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

function addBindings(map: Record<string, Command>): void {
  for (const key of Object.keys(map)) {
    addBinding(key, map[key]);
  }
}

export type KeyboardLayout = "qwerty" | "colemak";

function translateBindings(
  translations: Map<string, string>,
  bindings: Bindings
) {
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

addBindings({
  z: actions.undo,
  x: actions.cut,
  c: actions.copy,
  v: actions.paste,
  t: actions.join,
  T: actions.joinSelect,

  // mode switching
  d: actions.change,
  i: actions.insertBefore,
  o: actions.insertAfter,

  // flags
  p: flags.previous,
  n: flags.next,
  a: flags.all,
  e: flags.expand,
  s: flags.jump,

  // text objects
  "(": textObjects.parentheses,
  "{": textObjects.curlybrackets,
  "[": textObjects.brackets,
  y: composeCommand(flags.next, textObjects.buffer),
  q: textObjects.line,
  w: textObjects.word,
  '"': textObjects.quotes,
  "`": textObjects.tick,
  "~": textObjects.tripleTick,
  f: textObjects.findText,
  O: textObjects.operator,

  // right hand homerow
  j: composeCommand(flags.previous, textObjects.word),
  k: composeCommand(flags.next, textObjects.line),
  l: composeCommand(flags.previous, textObjects.line),
  ";": composeCommand(flags.next, textObjects.word),

  m: composeCommand(flags.previous, textObjects.character),
  "/": textObjects.character
});
