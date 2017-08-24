import { Extension } from './extension';

export interface Action {
  execute(main: Extension): void;
}

export const enterInsertMode: Action = {
  execute(main: Extension) {
    main.enterInsertMode();
  }
}