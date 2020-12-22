// import '@nomiclabs/hardhat-ethers';
// import { ethers } from 'hardhat';
// import { encode } from '@airnode/airnode-abi';
// import { providers } from 'ethers';
// import config from '../config/evm-dev-config.json';
//
// // Types
// type RequestType = 'short' | 'regular' | 'full';
//
// interface RequestParameter {
//   name: string;
//   type: string;
//   value: string;
// }
//
// interface Request {
//   apiProvider: string;
//   client: string;
//   requesterId: string;
//   type: RequestType;
// }
//
// interface ShortRequest extends Request {
//   parameters: RequestParameter[];
//   template: string;
// }
//
// interface RegularRequest extends Request {
//   fulfillFunctionName: string;
//   parameters: RequestParameter[];
//   template: string;
// }
//
// interface FullRequest extends Request {
//   endpoint: string;
//   fulfillFunctionName: string;
//   parameters: RequestParameter[];
// }
//
// // General
// let ethProvider: providers.JsonRpcProvider;
//
// const CLIENT_ABI = [
//   'function makeShortRequest(bytes32 templateId, bytes calldata parameters)',
//   'function makeRequest(bytes32 templateId, uint256 requesterIndex, address designatedWallet, address fulfillAddress, bytes4 fulfillFunctionId, bytes calldata parameters)',
//   'function makeFullRequest(bytes32 providerId, bytes32 endpointId, uint256 requesterIndex, address designatedWallet, address fulfillAddress, bytes4 fulfillFunctionId, bytes calldata parameters)',
//   'function fulfill(bytes32 requestId, uint256 statusCode, bytes32 data)',
//   'function fulfillBytes(bytes32 requestId, uint256 statusCode, bytes calldata data)',
// ];
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
// async function makeShortRequest(request: ShortRequest) {
//   const requesterIndex = getRequesterIndex(request.requesterId);
//   const signer = ethProvider.getSigner(requesterIndex);
//
//   // @ts-ignore TODO add types
//   const clientAddress = config.addresses.clients[request.client];
//   const client = new ethers.Contract(clientAddress, CLIENT_ABI, ethProvider);
//   const encodedParameters = encode(request.parameters);
//
//   // @ts-ignore TODO add types
//   const templateAddress = config.addresses.templates[request.apiProvider][request.template];
//
//   await client.connect(signer).makeShortRequest(templateAddress, encodedParameters);
// }
//
// async function makeRegularRequest(request: RegularRequest) {
//   const requesterIndex = getRequesterIndex(request.requesterId);
//   const signer = ethProvider.getSigner(requesterIndex);
//
//   // @ts-ignore TODO add types
//   const clientAddress = config.addresses.clients[request.client];
//   const client = new ethers.Contract(clientAddress, CLIENT_ABI, ethProvider);
//   const encodedParameters = encode(request.parameters);
//
//   // @ts-ignore TODO add types
//   const templateAddress = config.addresses.templates[request.apiProvider][request.template];
//
//   // @ts-ignore TODO add types
//   const designatedWallet = getDesignatedWallet(request.apiProvider, requesterIndex);
//
//   await client
//     .connect(signer)
//     .makeRequest(
//       templateAddress,
//       requesterIndex,
//       designatedWallet.address,
//       client.address,
//       client.interface.getSighash(`${request.fulfillFunctionName}(bytes32,uint256,bytes32)`),
//       encodedParameters
//     );
// }
//
// async function makeFullRequest(request: FullRequest) {
//   const requesterIndex = getRequesterIndex(request.requesterId);
//   const signer = ethProvider.getSigner(requesterIndex);
//   const providerId = getProviderId(request.apiProvider);
//   const endpointId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], [request.endpoint]));
//
//   // @ts-ignore TODO add types
//   const clientAddress = config.addresses.clients[request.client];
//   const client = new ethers.Contract(clientAddress, CLIENT_ABI, ethProvider);
//   const encodedParameters = encode(request.parameters);
//
//   // @ts-ignore TODO add types
//   const designatedWallet = getDesignatedWallet(request.apiProvider, requesterIndex);
//
//   await client
//     .connect(signer)
//     .makeFullRequest(
//       providerId,
//       endpointId,
//       requesterIndex,
//       designatedWallet.address,
//       client.address,
//       client.interface.getSighash(`${request.fulfillFunctionName}(bytes32,uint256,bytes32)`),
//       encodedParameters
//     );
// }
//
// async function makeRequests() {
//   for (const [index, request] of config.requests.entries()) {
//     switch (request.type as RequestType) {
//       case 'short':
//         await makeShortRequest(request as ShortRequest);
//         break;
//
//       case 'regular':
//         await makeRegularRequest(request as RegularRequest);
//         break;
//
//       case 'full':
//         await makeFullRequest(request as FullRequest);
//         break;
//     }
//
//     console.log(`Request #${index} submitted`);
//     if (index + 1 < config.requests.length) {
//       console.log('-------------------------------------------------------');
//     }
//   }
// }
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
