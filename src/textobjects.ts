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
  constructor(private start: string, private end: string) {
  }
  findNext(text: string, from: number) {
    const start = text.indexOf(this.start, from);
    // FIXME: Find matching pair correctly
    const end = text.indexOf(this.end, start) + 1;
    return { start, end };
  }
  findPrev(text: string, from: number) {
    const end = text.lastIndexOf(this.end, from) + 1;
    // FIXME: Find matching pair correctly
    const start = text.lastIndexOf(this.end, end);
    return { start, end };
  }
  expand(text: string, from: number, to: number): Range {
    return <any>"FIXME";
  }
}

export const parenthesis = new PairObject("(", ")");