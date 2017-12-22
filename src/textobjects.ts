import { window } from "vscode";
import * as stackHelpers from "./stack";
import { Stack } from "./stack";
import {
  directions,
  isDirection,
  isJump,
  isAll,
  isExpand
} from "./flags";
import * as jump from "./jump";
import { Command, CommandResult } from "./command";
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
      return { stack: undefined };
    }
    const editor = window.activeTextEditor;
    // Give us a variable to play with.
    let textObject = source;

    const {
      newStack,
      args: { direction, shouldJump, expand, selectAll }
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
      return {
        stack,
        handler: async function handler(stack2, _, char) {
          keys = keys.concat(char);
          if (keys.length < 2) {
            return { stack: stack2, handler };
          } else {
            jump.goToTarget(keys, targets);
            return { stack: stack2 };
          }
        }
      };
    } else if (selectAll) {
      const selections = [];
      const startRange =
        direction === undefined ? { start: 0, end: 0 } : selection;
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

    return { stack };
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
    char === "\u0020" ||
    char === "\u0009" ||
    char === "\u000A" ||
    char === "\u000C" ||
    char === "\u000D"
  ) {
    return true;
  } else {
    return false;
  }
}

const wordSeperators = new Set("~!@#$ %^&*()-=+[{]}\\|;:'\",.<>/?");

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
  direction: 1 | -1 = 1
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
    return start !== range.start || end !== range.end
      ? { start, end }
      : undefined;
  }
});

function entireDocumentRange(
  text: string,
  { start, end }: Range
): Range | undefined {
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
    end =
      end >= 0 ? end : text.length - (text[text.length - 1] === "\n" ? 1 : 0);
    let start = text.lastIndexOf("\n", end - 1) + 1;

    return start !== range.start || end !== range.end
      ? { start, end }
      : undefined;
  },

  findPrev(text: string, range: Range): Range | undefined {
    const start = text.lastIndexOf("\n", range.start - 2) + 1;
    let end = text.indexOf("\n", start);
    end = end >= 0 ? end : text.length;
    return start !== range.start || end !== range.end
      ? { start, end }
      : undefined;
  },

  expand(text: string, range: Range): Range | undefined {
    let start = text.lastIndexOf("\n", range.start - 1) + 1;
    let end = text.indexOf("\n", range.end);
    end = end >= 0 ? end : text.length;
    if (start === range.start && end === range.end) {
      start = text.lastIndexOf("\n", start - 2) + 1;
      end = text.indexOf("\n", end + 1);
      end =
        end >= 0 ? end : text.length - (text[text.length - 1] === "\n" ? 1 : 0);
    }
    return start !== range.start || end !== range.end
      ? { start, end }
      : undefined;
  }
});

class SingleDelimiter implements TextObject {
  constructor(private delimiter: string) {}

  findNext(text: string, range: Range): Range | undefined {
    let start = text.indexOf(this.delimiter, range.end);
    let end =
      text.indexOf(this.delimiter, start + this.delimiter.length) +
      this.delimiter.length;
    return start >= 0 && end > start ? { start, end } : undefined;
  }
  findPrev(text: string, range: Range): Range | undefined {
    let end =
      text.lastIndexOf(this.delimiter, range.start - 1) + this.delimiter.length;
    let start = text.lastIndexOf(
      this.delimiter,
      end - this.delimiter.length - 1
    );
    return start >= 0 && end > start + this.delimiter.length
      ? { start, end }
      : undefined;
  }
  expand(text: string, range: Range): Range | undefined {
    let start = text.lastIndexOf(
      this.delimiter,
      range.start - this.delimiter.length
    );
    let end = text.indexOf(this.delimiter, range.end) + this.delimiter.length;
    return start >= 0 && end > start + this.delimiter.length
      ? { start, end }
      : undefined;
  }
}

export const quotes = textObjectToCommand(new SingleDelimiter('"'));
export const tick = textObjectToCommand(new SingleDelimiter("`"));
export const tripleTick = textObjectToCommand(new SingleDelimiter("```"));

function pairedDelimiter(open: string, close: string): TextObject {
  if (
    open === close &&
    open.indexOf(close) === -1 &&
    close.indexOf(open) === -1
  ) {
    throw new Error(
      "Open and close delimiters can not be identical, nor contain each other! " +
        open +
        " === " +
        close
    );
  }

  function findNextDelimiter(
    text: string,
    from: number,
    direction: 1 | -1
  ): { index: number; delimiter: string } {
    while (from >= 0 && from < text.length) {
      if (text.substr(from, open.length) === open) {
        return { index: from, delimiter: open };
      } else if (text.substr(from, close.length) === close) {
        return { index: from, delimiter: close };
      }
      from += direction;
    }
    return { index: -1, delimiter: "" };
  }

  function findPartner(
    text: string,
    needs: string,
    from: number,
    direction: 1 | -1,
    count: number = 0
  ): number {
    const has = needs === open ? close : open;
    while (from >= 0 && from < text.length) {
      if (text.substr(from, has.length) === has) {
        ++count;
      } else if (text.substr(from, needs.length) === needs) {
        --count;
      }
      if (count === 0) {
        return from;
      }
      from += direction;
    }
    return -1;
  }

  return {
    findNext(text: string, range: Range): Range | undefined {
      const { index, delimiter } = findNextDelimiter(text, range.end, 1);
      if (delimiter === open) {
        const start = index;
        const end = findPartner(text, close, start, 1) + close.length;
        return end > 0 ? { start, end } : undefined;
      } else if (delimiter === close) {
        const end = index + close.length;
        const start = findPartner(text, open, index, -1);
        return start >= 0 ? { start, end } : undefined;
      }
      return undefined;
    },

    findPrev(text: string, range: Range): Range | undefined {
      const { index, delimiter } = findNextDelimiter(text, range.start - 1, -1);
      if (delimiter === open) {
        const start = index;
        const end = findPartner(text, close, start, 1) + close.length;
        return end > 0 ? { start, end } : undefined;
      } else if (delimiter === close) {
        const end = index + close.length;
        const start = findPartner(text, open, index, -1);
        return start >= 0 ? { start, end } : undefined;
      }
      return undefined;
    },

    expand(_text: string, _range: Range): Range | undefined {
      return undefined; // TODO: Implement this
    }
  };
}

export const parentheses = textObjectToCommand(pairedDelimiter("(", ")"));
export const curlybrackets = textObjectToCommand(pairedDelimiter("{", "}"));
export const brackets = textObjectToCommand(pairedDelimiter("[", "]"));

function stringObject(literal: string): TextObject {
  const { length } = literal;
  return {
    findNext(text, { end }) {
      const nextMatch = text.indexOf(literal, end);
      return nextMatch !== -1
        ? { start: nextMatch, end: nextMatch + length }
        : undefined;
    },
    findPrev(text, { start }) {
      const nextMatch = text.lastIndexOf(literal, start);
      return nextMatch !== -1
        ? { start: nextMatch, end: nextMatch + length }
        : undefined;
    },
    expand(text, { end }) {
      const nextMatch = text.indexOf(literal, end);
      return nextMatch !== -1
        ? { start: nextMatch, end: nextMatch + length }
        : undefined;
    }
  };
}

export async function findText(initialStack: Stack) {
  let literal = "";
  async function handler(stack: Stack, main: any, char: string): CommandResult {
    if (char === "\n") {
      if (literal !== "") {
        return await textObjectToCommand(stringObject(literal))(stack, main);
      } else {
        return { stack };
      }
    } else {
      literal += char;
      return { stack, handler };
    }
  }
  return { stack: initialStack, handler };
}
