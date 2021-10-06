export interface IntegrationInfo {
    integration: string;
    airnodeType: 'aws' | 'local';
    accessKeyId: string;
    secretKey: string;
    network: 'rinkeby' | 'localhost';
    mnemonic: string;
    providerUrl: string;
}
/**
 * @returns The contents of the "integration-info.json" file (throws if it doesn't exist)
 */
export declare const readIntegrationInfo: () => IntegrationInfo;
/**
 * @returns The contents of the "aws.env" file (throws if it doesn't exist)
 */
export declare const readAwsSecrets: () => import("dotenv").DotenvParseOutput;
/**
 * @returns The contents of the "secrets.env" file for the current integration (throws if it doesn't exist)
 */
export declare const readAirnodeSecrets: () => import("dotenv").DotenvParseOutput;
/**
 * @returns The contents of the "config.json" file for the current integration (throws if it doesn't exist)
 */
export declare const readConfig: () => any;
/**
 * @param secrets The lines of the secrets file
 * @returns All the lines joined followed by a new line symbol
 */
export declare const formatSecrets: (secrets: string[]) => string;
/**
 * @param filename
 * @returns The "filename" with the last extension removed
 */
export declare const removeExtension: (filename: string) => string;
