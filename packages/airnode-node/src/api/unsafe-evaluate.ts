/**
 * This function is dangerous. Make sure to use it only with Trusted code.
 */
export const unsafeEvaluate = (_input: any, code: string) => {
  return eval(`
    const ethers = require('ethers');
    const {BigNumber} = ethers;
    const input = _input;

    ${code};

    output;
  `);
};
