export const wrapAsArray = <T>(value: T | readonly T[]): T[] => {
  return Array.isArray(value) ? value : [value];
};
