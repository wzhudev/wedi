export function pluralize(count: number, word: string): string {
  return count === 1 ? word : word + 's';
}
