const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../utils');

describe('AirnodeRrpV0DryRun', () => {
  let roles;
  let airnodeRrp, airnodeRrpDryRun, rrpRequester;
  let airnodeAddress, airnodeMnemonic, airnodeXpub, airnodeWallet;
  let sponsorWalletAddress;

  beforeEach(async () => {
    const accounts = await hre.ethers.getSigners();
    roles = {
      deployer: accounts[0],
      sponsor: accounts[1],
      randomPerson: accounts[9],
    };
    const airnodeRrpFactory = await hre.ethers.getContractFactory('AirnodeRrpV0', roles.deployer);
    airnodeRrp = await airnodeRrpFactory.deploy();
    const airnodeRrpDryRunFactory = await hre.ethers.getContractFactory('AirnodeRrpV0DryRun', roles.deployer);
    airnodeRrpDryRun = await airnodeRrpDryRunFactory.deploy();
    const rrpRequesterFactory = await hre.ethers.getContractFactory('MockRrpRequesterV0', roles.deployer);
    rrpRequester = await rrpRequesterFactory.deploy(airnodeRrp.address);
    ({ airnodeAddress, airnodeMnemonic, airnodeXpub } = utils.generateRandomAirnodeWallet());
    airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic, "m/44'/60'/0'/0/0");
    sponsorWalletAddress = utils.deriveSponsorWalletAddress(airnodeXpub, roles.sponsor.address);
    await roles.deployer.sendTransaction({
      to: airnodeAddress,
      value: hre.ethers.utils.parseEther('1'),
    });
    await roles.deployer.sendTransaction({
      to: sponsorWalletAddress,
      value: hre.ethers.utils.parseEther('1'),
    });
  });

  describe('fulfill', function () {
    context('Signature is valid', function () {
      it('returns `true` and emits FulfilledRequest', async function () {
        const endpointId = utils.generateRandomBytes32();
        const requestTimeParameters = utils.generateRandomBytes();
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            [
              'uint256',
              'address',
              'address',
              'uint256',
              'address',
              'bytes32',
              'address',
              'address',
              'address',
              'bytes4',
              'bytes',
            ],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              rrpRequester.address,
              (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters,
            ]
          )
        );
        const fulfillData = hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello']);
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [requestId, fulfillData]))
          )
        );
        const staticCallResult = await airnodeRrpDryRun.callStatic.fulfill(
          requestId,
          airnodeAddress,
          rrpRequester.address,
          rrpRequester.interface.getSighash('fulfill'),
          fulfillData,
          signature,
          { gasLimit: 500000 }
        );
        expect(staticCallResult.callSuccess).to.equal(true);
        expect(staticCallResult.callData).to.equal('0x');
        await expect(
          airnodeRrpDryRun.fulfill(
            requestId,
            airnodeAddress,
            rrpRequester.address,
            rrpRequester.interface.getSighash('fulfill'),
            fulfillData,
            signature,
            { gasLimit: 500000 }
          )
        )
          .to.emit(airnodeRrpDryRun, 'FulfilledRequest')
          .withArgs(airnodeAddress, requestId, fulfillData);
        const estimatedGas = await airnodeRrpDryRun.estimateGas.fulfill(
          requestId,
          airnodeAddress,
          rrpRequester.address,
          rrpRequester.interface.getSighash('fulfill'),
          fulfillData,
          signature
        );
        // The estimated gas will be ~40,000. This number can slightly change
        // with future forks, and differ greatly between roll-ups and regular
        // chains.
        expect(estimatedGas.toNumber()).to.greaterThan(30000);
        expect(estimatedGas.toNumber()).to.lessThan(50000);
      });
    });
    context('Signature is not valid', function () {
      it('reverts', async function () {
        const endpointId = utils.generateRandomBytes32();
        const requestTimeParameters = utils.generateRandomBytes();
        const requestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            [
              'uint256',
              'address',
              'address',
              'uint256',
              'address',
              'bytes32',
              'address',
              'address',
              'address',
              'bytes4',
              'bytes',
            ],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              rrpRequester.address,
              (await airnodeRrp.requesterToRequestCountPlusOne(rrpRequester.address)).sub(1),
              airnodeAddress,
              endpointId,
              roles.sponsor.address,
              sponsorWalletAddress,
              rrpRequester.address,
              rrpRequester.interface.getSighash('fulfill'),
              requestTimeParameters,
            ]
          )
        );
        const fulfillData = hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello']);
        await expect(
          airnodeRrpDryRun.fulfill(
            requestId,
            airnodeAddress,
            rrpRequester.address,
            rrpRequester.interface.getSighash('fulfill'),
            fulfillData,
            '0x123456',
            { gasLimit: 500000 }
          )
        ).to.be.revertedWith('ECDSA: invalid signature length');
        await expect(
          airnodeRrpDryRun.estimateGas.fulfill(
            requestId,
            airnodeAddress,
            rrpRequester.address,
            rrpRequester.interface.getSighash('fulfill'),
            fulfillData,
            '0x123456'
          )
        ).to.be.revertedWith('ECDSA: invalid signature length');
      });
    });
  });
});
