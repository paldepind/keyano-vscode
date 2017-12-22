import { pushToStack } from "./command";

export const directions = {
  previous: Symbol.for("previous"),
  next: Symbol.for("next")
};

const allFlag = {
  type: Symbol.for("all"),
  toString: () => "all"
};

export function isAll(obj: any): obj is typeof jumpFlag {
  return obj && obj.type === allFlag.type;
}

const jumpFlag = {
  type: Symbol.for("jump"),
  toString: () => "jump"
};

export function isJump(obj: any): obj is typeof jumpFlag {
  return obj && obj.type === jumpFlag.type;
}

const expandFlag = {
  type: Symbol.for("expand"),
  toString: () => "expand"
};

export function isExpand(obj: any): obj is typeof expandFlag {
  return obj && obj.type === expandFlag.type;
}

export type Direction = symbol;

export function isDirection(value?: any): value is Direction {
  return value === directions.next || value === directions.previous;
}

export function isNumber(value?: any): value is number {
  return typeof value === "number";
}

export const next = pushToStack(directions.next);
export const previous = pushToStack(directions.previous);
export const expand = pushToStack(expandFlag);
export const jump = pushToStack(jumpFlag);
export const all = pushToStack(allFlag);
