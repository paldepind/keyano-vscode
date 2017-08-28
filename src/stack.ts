import { HandlerResult } from "./extension";

export type Stackable = symbol | number;
export type Stack = {
  head: Stackable,
  tail: Stack
} | undefined;

export type SpecificationPredicate = (element: Stackable) => HandlerResult;
export type StackableHandler = (element: Stackable | undefined) => void;

export function cons(element: Stackable, stack: Stack) {
  return { head: element, tail: stack };
}

export function readDoCallback(
  stack: Stack,
  specification: SpecificationPredicate,
  callback: StackableHandler
): Stack {
  while (stack !== undefined) {
    const head = stack.head;
    const result = specification(head);
    if (result === HandlerResult.DECLINE) {
      break;
    } else if (result === HandlerResult.ERROR) {
      callback(undefined);
      return undefined;
    }
    stack = stack.tail;
    callback(head);
    if (result === HandlerResult.ACCEPT) {
      break;
    }
  }
  return stack;
}

export function readDoCallbacks(
  stack: Stack,
  specifications: [SpecificationPredicate, StackableHandler][]
): Stack {
  for (const [specification, callback] of specifications) {
    if (stack === undefined) {
      break;
    }

    const head = stack.head;
    const result = specification(head);
    if (result === HandlerResult.DECLINE) {
      break;
    } else if (result === HandlerResult.ERROR) {
      callback(undefined);
      return undefined;
    }
    stack = stack.tail;
    callback(head);
    if (result === HandlerResult.ACCEPT) {
      break;
    }
  }
  return stack;
}

export function matchSpecifications(
  stack: Stack,
  specifications: SpecificationPredicate[]
): [Stack, (Stackable | undefined)[]] {
  const args: (Stackable | undefined)[] = [];
  stack = readDoCallbacks(stack, specifications.map(
    predicate => [predicate, element => args.push(element)] as [SpecificationPredicate, StackableHandler]
  ));
  return [stack, args];
}

export function matchSpecification(
  stack: Stack,
  specification: SpecificationPredicate
): [Stack, (Stackable | undefined)[]] {
  const args: (Stackable | undefined)[] = [];
  stack = readDoCallback(stack, specification, element => args.push(element));
  return [stack, args];
}
