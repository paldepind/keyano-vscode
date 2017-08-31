import { workspace, window, Selection, TextDocument } from "vscode";
import * as stackHelpers from "./stack";
import { symbols, isDirection, isNumber, isJump, isAll } from "./flags";
import * as jump from "./jump";
import { HandlerResult } from "./extension";
import { Command } from "./command";

type Range = {
  start: number,
  end: number
};
export function rangeToSelection(document: TextDocument, range: Range): Selection {
  return new Selection(
    document.positionAt(range.start),
    document.positionAt(range.end)
  );
}
export function selectionToRange(document: TextDocument, selection: Selection): Range {
  return { start: document.offsetAt(selection.start), end: document.offsetAt(selection.end) };
}

export interface TextObject {
  findNext(text: string, range: Range): Range | undefined;
  findPrev(text: string, range: Range): Range | undefined;
  expand(text: string, range: Range): Range | undefined;
  // matches(text: string): boolean;
  // inside(text: string): Range;
}

// Do not touch source variable.
function textObjectToCommand(source: TextObject): Command {
  return async (stack) => {
    if (window.activeTextEditor === undefined) {
      return [undefined, undefined];
    }
    const editor = window.activeTextEditor;
    // Give us a variable to play with.
    let textObject = source;

    const {
      newStack, args: { direction, shouldJump, selectAll }
    } = stackHelpers.readArgumentsFromStack(stack, {
      direction: { isType: isDirection, defaultTo: symbols.next },
      shouldJump: { isType: isJump, defaultTo: false, handler: () => true },
      selectAll: { isType: isAll, defaultTo: false, handler: () => true }
    });
    stack = newStack;

    const { document } = editor;
    const text = document.getText();
    const selection = selectionToRange(document, editor.selection);

    switch (direction) {
      case symbols.previous:
        textObject = reverse(textObject);
      case symbols.expand:
        {
          const range = textObject.expand(text, selection);
          if (range !== undefined) {
            editor.selection = rangeToSelection(document, range);
          }
        }
        break;
      default:
        break;
    }

    if (shouldJump) {
      const targets = jump.setTargets(textObject);
      let keys = "";
      return [stack, char => {
        if (char.search(/[a-z]/i) === -1) {
          return HandlerResult.ERROR;
        }

        keys = keys.concat(char);
        if (keys.length < 2) {
          return HandlerResult.AWAIT;
        } else {
          jump.goToTarget(keys, targets);
          return HandlerResult.ACCEPT;
        }
      }];
    } else if (selectAll) {
      const selections = [];
      let range = textObject.findNext(text, { start: 0, end: 0 });
      while (range !== undefined) {
        selections.push(rangeToSelection(document, range));
        range = textObject.findNext(text, range);
      }

      if (selections.length > 0) {
        editor.selections = selections;
      }
    } else {
      const range = textObject.findNext(text, selection);
      if (range !== undefined) {
        editor.selection = rangeToSelection(document, range);
      }
    }

    return [stack, undefined];
  };
}

function reverse(textObject: TextObject): TextObject {
  const newTextObject = Object.assign({}, textObject);
  newTextObject.findNext = textObject.findPrev;
  newTextObject.findPrev = textObject.findNext;
  return newTextObject;
}

enum CharacterType {
  Whitespace,
  Word,
  NonWord
}

function isWhitespace(char: string): boolean {
  if (
    char === "\u0020" || char === "\u0009" || char === "\u000A" ||
    char === "\u000C" || char === "\u000D"
  ) {
    return true;
  } else {
    return false;
  }
}

const wordSeperators = new Set("~!@#$ %^&*()-=+[{]}\\|;:'\",.<>/?");

function isWordSeperator(char: string): boolean {
  return wordSeperators.has(char);
}

function findWhere(
  text: string,
  predicate: (char: string) => boolean,
  from: number,
  direction: number = 1
): number {
  let i = from;
  while (0 <= i && i < text.length && predicate(text[i]) === false) {
    i += direction;
  }
  return i;
}

function getCharacterType(char: string): CharacterType {
  if (isWhitespace(char)) {
    return CharacterType.Whitespace;
  } else if (wordSeperators.has(char)) {
    return CharacterType.NonWord;
  } else {
    return CharacterType.Word;
  }
}

function isWordChar(char: string): boolean {
  return getCharacterType(char) === CharacterType.Word;
}

function notWordChar(char: string): boolean {
  return !isWordChar(char);
}

export const word = textObjectToCommand({
  findPrev(text: string, range: Range) {
    const end = findWhere(
      text,
      (char) => getCharacterType(char) === CharacterType.Word,
      range.start - 1,
      -1
    ) + 1;
    const start = findWhere(text, notWordChar, end - 1, -1) + 1;
    return { start, end };
  },
  findNext(text: string, range: Range) {
    const start = findWhere(text,
      (char) => getCharacterType(char) === CharacterType.Word,
      range.end,
      1
    );
    const end = findWhere(text, notWordChar, start, 1);
    return { start, end };
  },
  expand(text: string, range: Range) {
    let end = findWhere(text, notWordChar, range.end);
    let start = findWhere(text, notWordChar, range.start, -1) + 1;
    return { start, end };
  }
});

function entireDocumentRange(text: string, { start, end }: Range): Range | undefined {
  return start !== 0 || end !== text.length
    ? { start: 0, end: text.length }
    : undefined;
}

export const buffer = textObjectToCommand({
  findPrev: entireDocumentRange,
  findNext: entireDocumentRange,
  expand: entireDocumentRange
});

export const line = textObjectToCommand({
  // FIX ME: Return undefined when no change.

  findPrev(text: string, range: Range): Range | undefined {
    if (text[range.start - 1] === "\n") {
      // Selection starts at the beginning of line
      return {
        start: text.lastIndexOf("\n", range.start - 2) + 1,
        end: range.start
      };
    }
    const start = text.lastIndexOf("\n", range.start) + 1;
    const nextLineBreak = text.indexOf("\n", range.start + 1);
    const end = nextLineBreak === -1 ? text.length : nextLineBreak + 1;
    return { start, end };
  },

  findNext(text: string, range: Range): Range | undefined {
    const start = text.lastIndexOf("\n", range.end) + 1;
    let end = text.indexOf("\n", range.end) + 1;
    if (end === 0) {
      end = text.length;
    }
    return { start, end };
  },

  expand(text: string, range: Range): Range | undefined {
    // Fixes edge case when cursor is at the start of a line, with no selection made.
    if (range.start === range.end) {
      return this.findNext(text, range);
    }

    let end = text.indexOf("\n", range.end) + 1;
    if (end === 0) {
      end = text.length;
    }

    if (text[range.start - 1] === "\n") {
      // Selection starts at the beginning of line
      return {
        start: text.lastIndexOf("\n", range.start - 2) + 1,
        end: end
      };
    }
    const start = text.lastIndexOf("\n", range.start) + 1;

    return { start, end };
  }
});

class PairObject implements TextObject {
  constructor(private open: string, private close: string) {
  }

  private findMatchingRight(text: string, origin: number, counter: number = 0): number {
    for (let i = origin; i < text.length; ++i) {
      if (text[i] === this.open) {
        ++counter;
      } else if (text[i] === this.close) {
        --counter;
        if (counter === 0) {
          return i;
        }
      }
    }

    return -1;
  }

  private findMatchingLeft(text: string, origin: number, counter: number = 0): number {
    for (let i = origin; i >= 0; --i) {
      if (text[i] === this.close) {
        ++counter;
      } else if (text[i] === this.open) {
        --counter;
        if (counter === 0) {
          return i;
        }
      }
    }

    return -1;
  }

  private find(text: string, delimiter: number): Range | undefined {
    if (text[delimiter] === this.open) {
      const start = delimiter;
      const end = this.findMatchingRight(text, delimiter) + 1;
      return { start, end };
    } else if (text[delimiter] === this.close) {
      const end = delimiter + 1;
      const start = this.findMatchingLeft(text, end - 1);
      return { start, end };
    }
    return undefined;
  }

  findNext(text: string, range: Range): Range | undefined {
    for (let delimiter = range.end; delimiter < text.length; ++delimiter) {
      if (text[delimiter] === this.open || text[delimiter] === this.close) {
        return this.find(text, delimiter);
      }
    }
    return undefined;
  }

  findPrev(text: string, range: Range): Range | undefined {
    for (let delimiter = range.start - 1; delimiter >= 0; --delimiter) {
      if (text[delimiter] === this.open || text[delimiter] === this.close) {
        return this.find(text, delimiter);
      }
    }
    return undefined;
  }

  expand(text: string, range: Range): Range | undefined {
    // FIX ME: Does not balance
    const end = this.findMatchingRight(text, range.end, 1) + 1;
    const start = this.findMatchingLeft(text, range.start - 1, 1);

    return start === -1 || end === 0 ? undefined : { start, end };
  }
}
export const parentheses = textObjectToCommand(new PairObject("(", ")"));
export const curlybrackets = textObjectToCommand(new PairObject("{", "}"));
export const brackets = textObjectToCommand(new PairObject("[", "]"));
