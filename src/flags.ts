import { Stack } from "./stack";
import { pushToStack } from "./command";

export const symbols = {
  previous: Symbol.for("previous"),
  next: Symbol.for("next"),
  expand: Symbol.for("expand"),
  jump: Symbol.for("jump"),
  all: Symbol.for("all")
};

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
export const jump = pushToStack(symbols.jump);
export const all = pushToStack(symbols.all);
