import { runInNewContext } from 'vm';

/**
 * This function is dangerous. Make sure to use it only with Trusted code.
 */
export const unsafeEvaluate = (input: any, code: string, timeout: number) => {
  const vmContext = {
    require,
    input,
    vmOutput: undefined,
  } as { deferredOutput?: any };

  runInNewContext(`${code}; deferredOutput = output;`, vmContext, {
    displayErrors: true,
    timeout,
  });

  return vmContext.deferredOutput;
};

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
export const unsafeEvaluateAsync = async (input: any, code: string, timeout: number) =>
  new Promise((resolve) => {
    const vmContext = {
      require,
      input,
      resolve,
    };

    runInNewContext(code, vmContext, { displayErrors: true, timeout });
  });
