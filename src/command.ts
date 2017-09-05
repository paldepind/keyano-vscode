import { Extension } from "./extension";
import { Stack, Stackable, cons } from "./stack";

export type CommandResult = Promise<{ stack: Stack, handler?: KeyCommand }>;

export type Command = (stack: Stack, main: Extension) => CommandResult;
export type KeyCommand = (stack: Stack, main: Extension, key: string) => CommandResult;

export function pushToStack(element: Stackable): Command {
  return async (stack) => ({ stack: cons(element, stack) });
}

export function composeCommand(...commands: Command[]): Command {
  return async (stack: Stack, main: Extension) => {
    let handler;
    for (const command of commands) {
      ({ stack, handler } = await command(stack, main));
    }
    return { stack, handler };
  };
}
