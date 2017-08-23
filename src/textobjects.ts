type Range = {
  start: number,
  end: number
};

export interface TextObject {
  findNext(text: string, from: number): Range;
  findPrev(text: string, from: number): Range;
  expand(text: string, from: number, to: number): Range;
}

class PairObject implements TextObject {
  constructor(private open: string, private close: string) {
  }

  private findRight(text: string, origin: number, counter: number = 0) {
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

  private findLeft(text: string, origin: number, counter: number = 0) {
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

  findNext(text: string, from: number) {
    const start = text.indexOf(this.open, from);
    const end = this.findRight(text, start) + 1;

    return start === -1 || end === 0 ? undefined : { start, end };
  }
  findPrev(text: string, from: number) {
    const end = text.lastIndexOf(this.close, from) + 1;
    const start = this.findLeft(text, end);

    return start === -1 || end === 0 ? undefined : { start, end };
  }
  expand(text: string, from: number, to: number): Range {
    const end = this.findRight(text, to, 1) + 1;
    const start = this.findLeft(text, from - 1, 1);

    console.log("start: " + start);
    console.log("end: " + end);

    return start === -1 || end === 0 ? undefined : { start, end };
  }
}

export const parenthesis = new PairObject("(", ")");
