type Range = {
  start: number,
  end: number
};

export interface TextObject {
  findNext(text: string, from: number): Range;
  findPrev(text: string, from: number): Range;
  expand(text: string, from: number, to: number): Range;
}

export const line: TextObject = {
  findPrev(text: string, from: number): Range {
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

  findNext(text: string, from: number): Range {
    const start = text.lastIndexOf("\n", from) + 1;
    let end = text.indexOf("\n", from) + 1;
    if (end === 0) {
      end = text.length;
    }
    return { start, end };
  },
  
  expand(text: string, from: number, to: number): Range {
    // Fixes edge case when cursor is at the start of a line, with no selection made.
    if (from === to) {
      return this.findNext(text, from);
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
};

class PairObject implements TextObject {
  constructor(private open: string, private close: string) {
  }

  private findMatchingRight(text: string, origin: number, counter: number = 0) {
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

  private findMatchingLeft(text: string, origin: number, counter: number = 0) {
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

  private find(text, delimiter): Range | undefined {
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

  findNext(text: string, from: number): Range | undefined {
    for (let delimiter = from; delimiter < text.length; ++delimiter) {
      if (text[delimiter] === this.open || text[delimiter] === this.close) {
        return this.find(text, delimiter);
      }
    }

    return undefined;
  }

  findPrev(text: string, from: number): Range | undefined {
    for (let delimiter = from - 1; delimiter >= 0; --delimiter) {
      if (text[delimiter] === this.open || text[delimiter] === this.close) {
        return this.find(text, delimiter);
      }
    }

    return undefined;
  }

  expand(text: string, from: number, to: number): Range | undefined {
    const end = this.findMatchingRight(text, to, 1) + 1;
    const start = this.findMatchingLeft(text, from - 1, 1);

    return start === -1 || end === 0 ? undefined : { start, end };
  }
}

export const parenthesis = new PairObject("(", ")");
