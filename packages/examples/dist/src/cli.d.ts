/**
 * Executes the function passed as an argument and properly shuts down the node environment.
 *
 * Any uncaught error or promise rejection will be printed out in the console.
 */
export declare const runAndHandleErrors: (fn: () => Promise<unknown>) => void;
/**
 * Run the command passed as an argument in the current shell and stream the output of the command in the CLI.
 */
export declare const runShellCommand: (command: string) => void;
export declare const cliPrint: {
    info: (text: string) => void;
    warning: (text: string) => void;
    error: (text: string) => void;
};
