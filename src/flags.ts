import { Stack } from "./stack";
import { pushToStack } from "./command";

export const symbols = {
  previous: Symbol.for("previous"),
  next: Symbol.for("next"),
  expand: Symbol.for("expand"),
};

const allFlag = {
  type: Symbol.for("all"),
  toString: () => "all"
};

export function isAll(obj: any): obj is (typeof jumpFlag) {
  return obj && obj.type === allFlag.type;
}

const jumpFlag = {
  type: Symbol.for("jump"),
  toString: () => "jump"
};

export function isJump(obj: any): obj is (typeof jumpFlag) {
  return obj && obj.type === jumpFlag.type;
}

export type Direction = symbol;

export function isDirection(value?: any): value is Direction {
  return value === symbols.next || value === symbols.previous;
}

export function isNumber(value?: any): value is number {
  return typeof value === "number";
}

export const next = pushToStack(symbols.next);
export const previous = pushToStack(symbols.previous);
export const expand = pushToStack(symbols.expand);
export const jump = pushToStack(jumpFlag);
export const all = pushToStack(allFlag);
