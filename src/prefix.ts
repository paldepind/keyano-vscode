import { Extension } from "./extension";
import { window, Selection, workspace } from "vscode";
import * as vscode from "vscode";
import { parenthesis } from "./textobjects";

export interface Prefix {
  argument(main: Extension, char: string): void;
  apply(main: Extension): void;
}

class Repeater implements Prefix {
  count: number;
  main: Extension;

  argument(main: Extension, char: string) {
    if (!isNaN(parseInt(char, 10))) {
      this.count = this.count * 10 + parseInt(char, 10);
    } else {
      main.prefix = undefined;
      for (let i = 0; i < this.count; ++i) {
        main.handleKey(char);
      }
    }
  }

  apply(main: Extension) {
    this.count = 0;
    main.prefix = this;
  }
}

export const repeater = new Repeater();
