import { workspace, window, Selection } from "vscode";

import { Command, CommandResult, selectTextObject } from "./commands";

type Range = {
  start: number,
  end: number
};

export interface TextObject {
  findNext(text: string, from: number, to: number): Range | undefined;
  findPrev(text: string, from: number, to: number): Range | undefined;
  expand(text: string, from: number, to: number): Range | undefined;
  // matches(text: string): boolean;
  // inside(text: string): Range;
}

class TextObjectCommand implements Command {
  type = "text-object";
  constructor(public textObject: TextObject) { }
  async argument(): Promise<CommandResult> {
    selectTextObject(this.textObject, true);
    return CommandResult.Finished;
  }
}

export function isTextObjectCommand(c: Command): c is TextObjectCommand {
  return c.type === "text-object";
}

export function textObjectToCommand(t: TextObject): Command {
  return new TextObjectCommand(t);
}

// word

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
  while (0 <= i && predicate(text[i]) === false) {
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

export const word = textObjectToCommand({
  findPrev() {
    return undefined; // FIXME: add find prev
  },
  findNext(text: string, from: number, to: number): Range {
    let end = findWhere(text, isWhitespace, from);
    let start = findWhere(text, isWhitespace, from, -1) + 1;
    return { start, end };
  },
  expand(text: string, from: number, to: number) {
    let end = findWhere(text, isWhitespace, to);
    let start = findWhere(text, isWhitespace, from, -1) + 1;
    return { start, end };
  }
});

// line

export const line = textObjectToCommand({
  // FIX ME: Return undefined when no change.

  findPrev(text: string, from: number, to: number): Range | undefined {
    if (text[from - 1] === "\n") {
      // Selection starts at the beginning of line
      return {
        start: text.lastIndexOf("\n", from - 2) + 1,
        end: from
      };
    }
    const start = text.lastIndexOf("\n", from) + 1;
    const nextLineBreak = text.indexOf("\n", from + 1);
    const end = nextLineBreak === -1 ? text.length : nextLineBreak + 1;
    return { start, end };
  },

  findNext(text: string, from: number, to: number): Range | undefined {
    const start = text.lastIndexOf("\n", to) + 1;
    let end = text.indexOf("\n", to) + 1;
    if (end === 0) {
      end = text.length;
    }
    return { start, end };
  },

  expand(text: string, from: number, to: number): Range | undefined {
    // Fixes edge case when cursor is at the start of a line, with no selection made.
    if (from === to) {
      return this.findNext(text, from, to);
    }

    let end = text.indexOf("\n", to) + 1;
    if (end === 0) {
      end = text.length;
    }

    if (text[from - 1] === "\n") {
      // Selection starts at the beginning of line
      return {
        start: text.lastIndexOf("\n", from - 2) + 1,
        end: end
      };
    }
    const start = text.lastIndexOf("\n", from) + 1;

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

  findNext(text: string, from: number, to: number): Range | undefined {
    for (let delimiter = to; delimiter < text.length; ++delimiter) {
      if (text[delimiter] === this.open || text[delimiter] === this.close) {
        return this.find(text, delimiter);
      }
    }
    return undefined;
  }

  findPrev(text: string, from: number, to: number): Range | undefined {
    for (let delimiter = from - 1; delimiter >= 0; --delimiter) {
      if (text[delimiter] === this.open || text[delimiter] === this.close) {
        return this.find(text, delimiter);
      }
    }
    return undefined;
  }

  expand(text: string, from: number, to: number): Range | undefined {
    // FIX ME: Does not balance
    const end = this.findMatchingRight(text, to, 1) + 1;
    const start = this.findMatchingLeft(text, from - 1, 1);

    return start === -1 || end === 0 ? undefined : { start, end };
  }
}

export const parenthesis = textObjectToCommand(new PairObject("(", ")"));
