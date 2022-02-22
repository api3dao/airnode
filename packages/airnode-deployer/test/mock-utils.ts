// NOTE: This file is referenced as a pathGroup pattern in .eslintrc (import/order)

import fs from 'fs';

// Declare originalFs outside of mockReadFileSync to prevent infinite recursion errors in mockReadFileSync.
const originalFs = fs.readFileSync;

/**
 * Mocks the fs library if the file path includes the specified file path substring
 * and otherwise returns the original content.
 */
export const mockReadFileSync = (
  filePathSubstr: string,
  mockValue: unknown,
  options?: { replacer?: (number | string)[] | null; space?: string | number }
) => {
  return jest.spyOn(fs, 'readFileSync').mockImplementation((...args) => {
    const path = args[0].toString();
    if (path.includes(filePathSubstr)) {
      return JSON.stringify(mockValue, options?.replacer, options?.space);
    }
    return originalFs(...args);
  });
};
