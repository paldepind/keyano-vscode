import { window, Selection, TextDocument } from "vscode";
import * as stackHelpers from "./stack";
import { directions, isDirection, isNumber, isJump, isAll, Direction, isExpand } from "./flags";
import * as jump from "./jump";
import { HandlerResult } from "./extension";
import { Command } from "./command";
import { rangeToSelection, selectionToRange, Range } from "./editor";

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
      newStack, args: { direction, shouldJump, expand, selectAll }
    } = stackHelpers.readArgumentsFromStack(stack, {
        direction: { isType: isDirection, defaultTo: undefined }, // undefined = use findNext normally.
        shouldJump: { isType: isJump, defaultTo: false, handler: () => true },
        expand: { isType: isExpand, defaultTo: false, handler: () => true },
        selectAll: { isType: isAll, defaultTo: false, handler: () => true }
      });
    stack = newStack;

    const { document } = editor;
    const text = document.getText();
    const selection = selectionToRange(document, editor.selection);

    if (direction === directions.previous) {
      textObject = reverse(textObject);
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
      const startRange = direction === undefined ? { start: 0, end: 0 } : selection;
      let range = textObject.findNext(text, startRange);
      while (range !== undefined) {
        selections.push(rangeToSelection(document, range));
        range = textObject.findNext(text, range);
      }

      if (selections.length > 0) {
        editor.selections = selections;
      }
    } else if (expand) {
      const range = textObject.expand(text, selection);
      if (range !== undefined) {
        editor.selection = rangeToSelection(document, range);
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

function findWhere(
  text: string,
  predicate: (char: string) => boolean,
  from: number,
  direction: number = 1
): number {
  let i = from;
  while (i >= 0 && i < text.length) {
    if (predicate(text[i])) {
      return i;
    }
    i += direction;
  }
  return -1;
}

function findBorder(
  text: string,
  inside: (char: string) => boolean,
  outside: (char: string) => boolean,
  from: number,
  direction: number = 1
): number {
  let i = from + direction;
  while (i >= 0 && i < text.length) {
    if ((i === 0 || i === text.length - 1) && inside(text[i])) {
      return i;
    } else if (outside(text[i]) && inside(text[i - direction])) {
      return i - direction;
    }
    i += direction;
  }
  return -1;
}

export const word = textObjectToCommand({
  findNext(text: string, { start, end }: Range) {
    end = findWhere(text, isWordChar, end, 1) + 1;
    if (end > 0) {
      end = findWhere(text, notWordChar, end - 1);
      end = end >= 0 ? end : text.length;
    } else {
      return undefined;
    }

    start = findWhere(text, notWordChar, end - 1, -1) + 1;
    start = start >= 0 ? start : 0;

    return { start, end: end };
  },

  findPrev(text: string, { start, end }: Range) {
    start = findWhere(text, isWordChar, start - 1, -1);
    if (start > 0) {
      start = findWhere(text, notWordChar, start, -1) + 1;
    } else if (start < 0) {
      return undefined;
    }

    end = findWhere(text, notWordChar, start + 1, 1);
    end = end >= 0 ? end : text.length;

    return { start, end };
  },

  expand(text: string, range: Range) {
    let start = findWhere(text, isWordChar, range.start, -1);
    if (start > 0) {
      start = findWhere(text, notWordChar, start, -1) + 1;
    }
    let end = findWhere(text, isWordChar, range.end - 1, 1) + 1;
    if (end > 0) {
      end = findWhere(text, notWordChar, end - 1);
      end = end >= 0 ? end : text.length;
    }

    if (start === range.start && end === range.end) {
      start = findWhere(text, isWordChar, range.start - 1, -1);
      if (start > 0) {
        start = findWhere(text, notWordChar, start, -1) + 1;
      } else {
        start = range.start;
      }
      end = findWhere(text, isWordChar, range.end, 1) + 1;
      if (end > 0) {
        end = findWhere(text, notWordChar, end - 1);
        end = end >= 0 ? end : text.length;
      } else {
        end = range.end;
      }
    }
    return start !== range.start || end !== range.end ? { start, end } : undefined;
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
  findNext(text: string, range: Range): Range | undefined {
    let end = text.indexOf("\n", range.end + 1);
    end = end >= 0 ? end : text.length - (text[text.length - 1] === "\n" ? 1 : 0);
    let start = text.lastIndexOf("\n", end - 1) + 1;

    return start !== range.start || end !== range.end ? { start, end } : undefined;
  },

  findPrev(text: string, range: Range): Range | undefined {
    const start = text.lastIndexOf("\n", range.start - 2) + 1;
    let end = text.indexOf("\n", start);
    end = end >= 0 ? end : text.length;
    return start !== range.start || end !== range.end ? { start, end } : undefined;
  },

  expand(text: string, range: Range): Range | undefined {
    let start = text.lastIndexOf("\n", range.start - 1) + 1;
    let end = text.indexOf("\n", range.end);
    end = end >= 0 ? end : text.length;
    if (start === range.start && end === range.end) {
      start = text.lastIndexOf("\n", start - 2) + 1;
      end = text.indexOf("\n", end + 1);
      end = end >= 0 ? end : text.length - (text[text.length - 1] === "\n" ? 1 : 0);
    }
    return start !== range.start || end !== range.end ? { start, end } : undefined;
  }
});

class SingleDelimiter implements TextObject {
  constructor(private delimiter: string) { }

  findNext(text: string, range: Range): Range | undefined {
    let start = text.indexOf(this.delimiter, range.start);
    let end = text.indexOf(this.delimiter, start + this.delimiter.length) + this.delimiter.length;
    return start >= 0 && end > start ? { start, end} : undefined;
  }
  findPrev(text: string, range: Range): Range | undefined {
    throw new Error("Method not implemented.");
  }
  expand(text: string, range: Range): Range | undefined {
    throw new Error("Method not implemented.");
  }
}

export const quotes = textObjectToCommand(new SingleDelimiter("\""));
export const tick = textObjectToCommand(new SingleDelimiter("`"));
export const tripleTick = textObjectToCommand(new SingleDelimiter("```"));

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
