/**
 * This function is dangerous. Make sure to use it only with Trusted code.
 */
export const unsafeEvaluate = (input: any, code: string) => {
  return eval(`
    ${code};

    output;
  `);
};
