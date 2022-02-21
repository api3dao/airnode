// NOTE: This file is referenced as a pathGroup pattern in .eslintrc (import/order)

/**
 * Mocks the console for silenced tests and otherwise enables it for local development.
 */
export const mockConsole = () => {
  if (process.env.SILENCE_LOGGER) {
    // Mock console log for github
    jest.spyOn(console, 'log').mockImplementation();
  } else {
    // Workaround to fix broken console for local tests
    console.log('Running test with console enabled');
  }
};
