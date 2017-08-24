import { TextObject } from './textobjects';
import { Command } from './commands';
import { Action } from './actions';

export function isTextObject(obj: any): obj is TextObject {
  return obj
    && typeof obj.findNext === "function"
    && typeof obj.findPrev === "function"
    && typeof obj.findNext === "function";
}

export function isCommand(obj: any): obj is Command {
  return obj
    && typeof obj.argument === "function";
}

export function isAction(obj: any): obj is Action {
  return obj
    && typeof obj.execute === "function";
}