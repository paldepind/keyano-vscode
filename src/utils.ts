export function last<A>(array: A[]): A {
  return array[array.length - 1];
}

export function flatten<A>(array: A[][]): A[] {
  return array.reduce((acc, a) => acc.concat(a), []);
}
