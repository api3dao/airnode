export const setEnvVariables = (variables: Record<string, string>) => {
  const OLD_ENV = process.env;

  beforeAll(() => {
    jest.resetModules();
    process.env = {
      ...OLD_ENV,
      ...variables,
    };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });
};
