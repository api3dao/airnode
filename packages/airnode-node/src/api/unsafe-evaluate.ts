import { ethers } from 'ethers';

/**
 * This function is dangerous. Make sure to use it only with Trusted code.
 */
export const unsafeEvaluate = (input: any, code: string) => {
  return Function(`
    "use strict";
    const [ethers, input] = arguments

    ${code};

    return output;
  `)(ethers, input);
};
