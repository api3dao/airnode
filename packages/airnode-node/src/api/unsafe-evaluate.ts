import { runInThisContext } from 'vm';

/**
 * This function is dangerous. Make sure to use it only with Trusted code.
 */
export const unsafeEvaluate = (_input: any, code: string) =>
  eval(`
      const ethers = require('ethers');
      const input = _input;

      ${code};

      output;
  `);

/**
 * This function runs asynchronous code in a Node VM.

 * @code should be written as ({input, resolve}) => {something; resolve({...input, something: 1})};
 * Refer to vmContext here for what's available.
 *
 * Some libraries one might expect to be available may not necessarily be available in cloud environments due to
 * being stripped out by webpack. In these cases these libraries may need to be minified and included in the `code`
 * payload.
 *
 * The value given to `resolve` is expected to be the equivalent of `output` above.
 */
export const unsafeEvaluateAsync = async (input: any, code: string) =>
  new Promise((resolve) => {
    const vmContext = {
      require,
      input,
      resolve,
    };

    runInThisContext(code, { displayErrors: true })(vmContext);
  });
