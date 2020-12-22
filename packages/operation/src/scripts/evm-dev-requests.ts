//
// import '@nomiclabs/hardhat-ethers';
// import { ethers } from 'hardhat';
// import { encode } from '@airnode/airnode-abi';
// import { providers } from 'ethers';
// import config from '../config/evm-dev-config.json';
//
// // General
// let ethProvider: providers.JsonRpcProvider;
//
//
// function getRequesterIndex(requesterId: string) {
//   const requesterIndex = config.requesters.findIndex((r) => r.id === requesterId);
//   return requesterIndex + 1;
// }
//
// function getProviderId(apiProvider: string) {
//   // @ts-ignore TODO add types
//   const { mnemonic } = config.apiProviders[apiProvider];
//   const masterWallet = deriveWalletFromPath(mnemonic, 'm');
//   return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [masterWallet.address]));
// }
//
// function deriveWalletFromPath(mnemonic: string, path: string) {
//   const masterHdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
//   const designatorHdNode = masterHdNode.derivePath(path);
//   return new ethers.Wallet(designatorHdNode.privateKey, ethProvider);
// }
//
// function getDesignatedWallet(apiProvider: string, requesterIndex: number) {
//   // @ts-ignore TODO add types
//   const { mnemonic } = config.apiProviders[apiProvider];
//   return deriveWalletFromPath(mnemonic, `m/0/0/${requesterIndex}`);
// }
//
//
// async function main() {
//   ethProvider = ethers.provider;
//
//   console.log('\n=======================REQUESTS=======================');
//   await makeRequests();
//   console.log('=======================REQUESTS=======================');
// }
//
// // We recommend this pattern to be able to use async/await everywhere
// // and properly handle errors.
// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.log(error);
//     process.exit(1);
//   });
