export function warn(message: string): void {
  console.log(`Warning: ${message}`);
}

export function error(message: string): never {
  throw new Error(message);
}
