// tslint:disable:no-empty-interface no-namespace interface-name

declare class Array<T> {
  constructor();
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

interface String {
  concat(string: string): string;
  readonly length: number;
}

declare namespace console {
  export function log(message: string): void;
}
