import { Extension } from './extension';
import { window, Selection, workspace } from "vscode";
import * as vscode from 'vscode';
import { parenthesis } from './textobjects';


export interface IPrefix {
  argument(main: Extension, char: string) : void;
  apply(main: Extension) : void;
}

class Repeater implements IPrefix {
  count: number;
  main: Extension;
  
  argument(main: Extension, char: string) {
    if (!isNaN(parseInt(char))) {
      this.count = this.count * 10 + parseInt(char);
    } else {
      main.prefix = null;
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