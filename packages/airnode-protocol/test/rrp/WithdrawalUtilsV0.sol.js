const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../utils');

describe('WithdrawalUtilsV0', () => {
  let roles;
  let airnodeRrp, rrpRequester;
  let airnodeAddress, airnodeMnemonic, airnodeXpub;
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
    const rrpRequesterFactory = await hre.ethers.getContractFactory('MockRrpRequesterV0', roles.deployer);
    rrpRequester = await rrpRequesterFactory.deploy(airnodeRrp.address);
    ({ airnodeAddress, airnodeMnemonic, airnodeXpub } = utils.generateRandomAirnodeWallet());
    sponsorWalletAddress = utils.deriveSponsorWalletAddress(airnodeXpub, roles.sponsor.address);
    await roles.deployer.sendTransaction({
      to: sponsorWalletAddress,
      value: hre.ethers.utils.parseEther('1'),
    });
  });

  describe('requestWithdrawal', function () {
    it('requests withdrawal', async function () {
      const initialSponsorToWithdrawalRequestCount = await airnodeRrp.sponsorToWithdrawalRequestCount(
        roles.sponsor.address
      );
      expect(initialSponsorToWithdrawalRequestCount).to.equal(0);
      const firstExpectedSponsorToWithdrawalRequestCount = initialSponsorToWithdrawalRequestCount.add(1);
      const chainId = (await hre.ethers.provider.getNetwork()).chainId;
      const firstExpectedWithdrawalRequestId = hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(
          ['uint256', 'address', 'address', 'uint256'],
          [chainId, airnodeRrp.address, roles.sponsor.address, firstExpectedSponsorToWithdrawalRequestCount]
        )
      );
      await expect(airnodeRrp.connect(roles.sponsor).requestWithdrawal(airnodeAddress, sponsorWalletAddress))
        .to.emit(airnodeRrp, 'RequestedWithdrawal')
        .withArgs(airnodeAddress, roles.sponsor.address, firstExpectedWithdrawalRequestId, sponsorWalletAddress);
      expect(await airnodeRrp.sponsorToWithdrawalRequestCount(roles.sponsor.address)).to.equal(
        firstExpectedSponsorToWithdrawalRequestCount
      );
      // Make another request to check if withdrawal request IDs are unique
      const secondExpectedSponsorToWithdrawalRequestCount = firstExpectedSponsorToWithdrawalRequestCount.add(1);
      const secondExpectedWithdrawalRequestId = hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(
          ['uint256', 'address', 'address', 'uint256'],
          [chainId, airnodeRrp.address, roles.sponsor.address, secondExpectedSponsorToWithdrawalRequestCount]
        )
      );
      await expect(airnodeRrp.connect(roles.sponsor).requestWithdrawal(airnodeAddress, sponsorWalletAddress))
        .to.emit(airnodeRrp, 'RequestedWithdrawal')
        .withArgs(airnodeAddress, roles.sponsor.address, secondExpectedWithdrawalRequestId, sponsorWalletAddress);
      expect(await airnodeRrp.sponsorToWithdrawalRequestCount(roles.sponsor.address)).to.equal(
        secondExpectedSponsorToWithdrawalRequestCount
      );
    });
  });

  describe('fulfillWithdrawal', function () {
    context('Caller is sponsor wallet', function () {
      it('fulfills withdrawal when parameters are correct', async function () {
        // Make the withdrawal request
        await airnodeRrp.connect(roles.sponsor).requestWithdrawal(airnodeAddress, sponsorWalletAddress);
        const withdrawalRequestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              roles.sponsor.address,
              await airnodeRrp.sponsorToWithdrawalRequestCount(roles.sponsor.address),
            ]
          )
        );
        // Calculate the amount to be withdrawn
        const sponsorBalance = await hre.ethers.provider.getBalance(roles.sponsor.address);
        const sponsorWallet = utils
          .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
          .connect(hre.ethers.provider);
        const gasEstimate = await airnodeRrp
          .connect(sponsorWallet)
          .estimateGas.fulfillWithdrawal(withdrawalRequestId, airnodeAddress, roles.sponsor.address, {
            value: 1,
            gasLimit: 500000,
          });
        const gasPrice = await hre.ethers.provider.getGasPrice();
        const txCost = gasEstimate.mul(gasPrice);
        const sponsorWalletBalance = await hre.ethers.provider.getBalance(sponsorWalletAddress);
        const fundsToSend = sponsorWalletBalance.sub(txCost);
        // Fulfill the withdrawal request
        await expect(
          airnodeRrp
            .connect(sponsorWallet)
            .fulfillWithdrawal(withdrawalRequestId, airnodeAddress, roles.sponsor.address, {
              value: fundsToSend,
              gasLimit: gasEstimate,
              gasPrice: gasPrice,
            })
        )
          .to.emit(airnodeRrp, 'FulfilledWithdrawal')
          .withArgs(airnodeAddress, roles.sponsor.address, withdrawalRequestId, sponsorWalletAddress, fundsToSend);
        expect(await hre.ethers.provider.getBalance(roles.sponsor.address)).to.equal(sponsorBalance.add(fundsToSend));
      });
      it('reverts if withdrawal request ID is incorrect', async function () {
        // Make the withdrawal request
        await airnodeRrp.connect(roles.sponsor).requestWithdrawal(airnodeAddress, sponsorWalletAddress);
        // Attempt to fulfill the withdrawal request
        const sponsorWallet = utils
          .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
          .connect(hre.ethers.provider);
        await expect(
          airnodeRrp
            .connect(sponsorWallet)
            .fulfillWithdrawal(hre.ethers.constants.HashZero, airnodeAddress, roles.sponsor.address, {
              value: 1,
              gasLimit: 500000,
            })
        ).to.be.revertedWith('Invalid withdrawal fulfillment');
      });
      it('reverts if airnode address is incorrect', async function () {
        // Make the withdrawal request
        await airnodeRrp.connect(roles.sponsor).requestWithdrawal(airnodeAddress, sponsorWalletAddress);
        const withdrawalRequestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              roles.sponsor.address,
              await airnodeRrp.sponsorToWithdrawalRequestCount(roles.sponsor.address),
            ]
          )
        );
        // Attempt to fulfill the withdrawal request
        const sponsorWallet = utils
          .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
          .connect(hre.ethers.provider);
        await expect(
          airnodeRrp
            .connect(sponsorWallet)
            .fulfillWithdrawal(withdrawalRequestId, hre.ethers.constants.AddressZero, roles.sponsor.address, {
              value: 1,
              gasLimit: 500000,
            })
        ).to.be.revertedWith('Invalid withdrawal fulfillment');
      });
      it('reverts if sponsor address is incorrect', async function () {
        // Make the withdrawal request
        await airnodeRrp.connect(roles.sponsor).requestWithdrawal(airnodeAddress, sponsorWalletAddress);
        const withdrawalRequestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              roles.sponsor.address,
              await airnodeRrp.sponsorToWithdrawalRequestCount(roles.sponsor.address),
            ]
          )
        );
        // Attempt to fulfill the withdrawal request
        const sponsorWallet = utils
          .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
          .connect(hre.ethers.provider);
        await expect(
          airnodeRrp
            .connect(sponsorWallet)
            .fulfillWithdrawal(withdrawalRequestId, airnodeAddress, hre.ethers.constants.AddressZero, {
              value: 1,
              gasLimit: 500000,
            })
        ).to.be.revertedWith('Invalid withdrawal fulfillment');
      });
      it('reverts if transfer fails', async function () {
        // Make the withdrawal request
        await rrpRequester.requestWithdrawal(airnodeAddress, sponsorWalletAddress);
        const withdrawalRequestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              rrpRequester.address,
              await airnodeRrp.sponsorToWithdrawalRequestCount(rrpRequester.address),
            ]
          )
        );
        // Attempt to fulfill the withdrawal request
        const sponsorWallet = utils
          .deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address)
          .connect(hre.ethers.provider);
        // Transfer will fail because `rrpRequester` has no default `payable` method
        await expect(
          airnodeRrp
            .connect(sponsorWallet)
            .fulfillWithdrawal(withdrawalRequestId, airnodeAddress, rrpRequester.address, {
              value: 1,
              gasLimit: 500000,
            })
        ).to.be.revertedWith('Transfer failed');
      });
    });
    context('Caller is not sponsor wallet', function () {
      it('reverts', async function () {
        // Make the withdrawal request
        await airnodeRrp.connect(roles.sponsor).requestWithdrawal(airnodeAddress, sponsorWalletAddress);
        const withdrawalRequestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeRrp.address,
              roles.sponsor.address,
              await airnodeRrp.sponsorToWithdrawalRequestCount(roles.sponsor.address),
            ]
          )
        );
        // Attempt to fulfill the withdrawal request
        await expect(
          airnodeRrp
            .connect(roles.randomPerson)
            .fulfillWithdrawal(withdrawalRequestId, airnodeAddress, roles.sponsor.address, {
              value: 1,
              gasLimit: 500000,
            })
        ).to.be.revertedWith('Invalid withdrawal fulfillment');
      });
    });
  });
});
