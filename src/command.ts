import { Extension, KeyHandler } from "./extension";
import { Stack, Stackable, cons } from "./stack";
export type Command = (stack: Stack, main: Extension) => Promise<[Stack, KeyHandler | undefined]>;

export function pushToStack(element: Stackable): Command {
  return async stack => [cons(element, stack), undefined];
}

export function composeCommand(...commands: Command[]): Command {
  return async (stack: Stack, main: Extension) => {
    let handler;
    for (const command of commands) {
      [stack, handler] = await command(stack, main);
    }
    return [stack, handler];
  };
}
