import isArray from 'lodash/isArray';

type CommandArg = string | [string, string] | [string, string, string];

export function formatTerraformArguments(args: CommandArg[]) {
  return args
    .map((arg) => {
      if (!isArray(arg)) {
        return arg;
      }

      if (arg.length === 2) {
        return `${arg[0]}=${arg[1]}`;
      }

      return `${arg[0]}="${arg[1]}=${arg[2]}"`;
    })
    .map((arg) => `-${arg}`);
}

/**
 * Checks if the environment is a GCP or AWS cloud function
 */
export const isCloudFunction = () => process.env.LAMBDA_TASK_ROOT || process.env.FUNCTION_TARGET;
