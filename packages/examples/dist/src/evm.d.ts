import { ethers } from 'ethers';
/**
 * @returns The ethers provider connected to the provider URL specified in the "integration-info.json".
 */
export declare const getProvider: () => ethers.providers.JsonRpcProvider;
/**
 * Reads the mnemonic and provider URL from "integration-info.json" and returns the connected wallet.
 *
 * @returns The connected wallet.
 */
export declare const getUserWallet: () => ethers.Wallet;
/**
 * Reads the "secrets.env" of the particular integration to obtain the Airnode mnemonic of the Airnode wallet. This
 * wallet is not connected to the provider, since we do not need to make any transactions with it.
 *
 * @returns The Airnode wallet.
 */
export declare const getAirnodeWallet: () => ethers.Wallet;
/**
 * Derives the Airnode extended public key from the Airnode wallet.
 *
 * @param airnodeWallet
 * @returns The extended public key
 */
export declare const getAirnodeXpub: (airnodeWallet: ethers.Wallet) => string;
/**
 * Deploys the contract specified by the path to the artifact and constructor arguments. This method will also write the
 * address of the deployed contract which can be used to connect to the contract.
 *
 * @param artifactsFolderPath
 * @param args Arguments for the contract constructor to be deployed
 * @returns The deployed contract
 */
export declare const deployContract: (artifactsFolderPath: string, args?: any[]) => Promise<ethers.Contract>;
/**
 * Connect to the already deployed contract specified by the path to the compiled contract artifact.
 *
 * @param artifactsFolderPath
 * @returns The deployed contract
 */
export declare const getDeployedContract: (artifactsFolderPath: string) => Promise<ethers.Contract>;
/**
 * @returns The chain id of the chosen network
 */
export declare const readChainId: () => Promise<number>;
