import '@nomiclabs/hardhat-ethers';
import { ethers } from 'hardhat';
import { providers, Wallet } from 'ethers';

// ========================================================================
// WARNING: DO NOT RE-USE THIS MNEMONIC ANYWHERE ELSE!
// ========================================================================
const MNEMONIC = 'bracket simple lock network census onion spy real spread pig hawk lonely';

let provider: providers.JsonRpcProvider;
let wallets: { [name: string]: Wallet };
let xpub: string;

function deriveExtendedPublicKey() {
  const wallet = ethers.Wallet.fromMnemonic(MNEMONIC);
  const hdNode = ethers.utils.HDNode.fromMnemonic(wallet.mnemonic.phrase);
  return hdNode.neuter().extendedKey;
}

function deriveWalletFromPath(path: string) {
  const masterHdNode = ethers.utils.HDNode.fromMnemonic(MNEMONIC);
  const designatorHdNode = masterHdNode.derivePath(path);
  return new ethers.Wallet(designatorHdNode.privateKey, provider);
}

async function fundProviderMasterWallet() {
  const signer = provider.getSigner(0);
  await signer.sendTransaction({ to: wallets.providerAdmin.address, value: ethers.utils.parseEther('100') });
}

async function main() {
  provider = ethers.provider;
  xpub = deriveExtendedPublicKey();

  wallets = { providerAdmin: deriveWalletFromPath('m') };

  const Airnode = await ethers.getContractFactory('Airnode');
  const airnode = await Airnode.deploy();
  await airnode.deployed();

  const Convenience = await ethers.getContractFactory('Convenience');
  const convenience = await Convenience.deploy(airnode.address);
  await convenience.deployed();

  await fundProviderMasterWallet();

  const { providerAdmin } = wallets;
  await airnode.connect(providerAdmin).createProvider(providerAdmin.address, xpub);

  const providerId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [providerAdmin.address]));
  const endpointId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], ['convertToUsd']));

  await airnode
    .connect(providerAdmin)
    .updateEndpointAuthorizers(providerId, endpointId, [ethers.constants.AddressZero]);

  // const providerPromises = config.providers.map(async (provider: any) => {
  //   return await airnode
  //     .connect(adminAddress)
  //     .createProvider(adminAddress, provider.designationDeposit, provider.minimumBalance);
  // });
  //
  // const providers = await Promise.all(providerPromises);

  console.log('Protocol deployed to:', airnode.address);
  console.log('Convenience deployed to:', convenience.address);
  console.log('Extended Public Key:', xpub);
  console.log('Provider ID:', providerId);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
