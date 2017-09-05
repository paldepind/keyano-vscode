export interface Stackable {
  toString: () => string;
}

export type Stack = {
  head: Stackable,
  tail: Stack
} | undefined;

type Argument<A, B> = {
  isType: (elm: any) => elm is A,
  handler?: (elm: A) => B
  defaultTo: B
};

type Specification = { [k: string]: Argument<any, any> };

type Result<S extends Specification> = {
  args: {
    [K in keyof S]: S[K]["defaultTo"]
  },
  newStack: Stack
};

function id<A>(a: A): A {
  return a;
}

export function readArgumentsFromStack<S extends Specification>(
  stack: Stack, spec: S
): Result<S> {
  const args = Object.entries(spec).reduce((acc: any, [key, { defaultTo }]) => {
    acc[key] = defaultTo;
    return acc;
  }, {});
  while (stack !== undefined) {
    const head = stack.head;
    const match = Object.entries(spec).find(([key, { isType }]) => isType(head));
    if (match !== undefined) {
      const [key, { handler = id }] = match;
      args[key] = handler(head);
    } else {
      break;
    }
    stack = stack.tail;
  }
  return {
    args,
    newStack: stack
  };
}

export function cons(element: Stackable, stack: Stack) {
  return { head: element, tail: stack };
}
