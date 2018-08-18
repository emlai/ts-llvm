// tslint:disable:no-empty-interface no-namespace interface-name

interface Array<T> {
  readonly length: number;
  push(value: T): void;
  [index: number]: T;
}

interface Boolean {}

interface Function {}

interface IArguments {}

interface Number {}

interface Object {}

interface RegExp {}

interface String {}

declare namespace console {
  export function log(message: string): void;
}
