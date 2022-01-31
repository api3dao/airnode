/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let airnodeProtocol;
let airnodeAddress, airnodeSponsorWallet, airnodeWallet;
let protocolId = 1;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    sponsor: accounts[1],
    randomPerson: accounts[9],
  };
  const airnodeProtocolFactory = await hre.ethers.getContractFactory('AirnodeProtocol', roles.deployer);
  airnodeProtocol = await airnodeProtocolFactory.deploy();
  const airnodeData = testUtils.generateRandomAirnodeWallet();
  airnodeAddress = airnodeData.airnodeAddress;
  const airnodeMnemonic = airnodeData.airnodeMnemonic;
  airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic, "m/44'/60'/0'/0/0");
  airnodeSponsorWallet = testUtils.deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address, 1);
  await roles.deployer.sendTransaction({
    to: airnodeSponsorWallet.address,
    value: hre.ethers.utils.parseEther('1'),
  });
});

describe('requestWithdrawal', function () {
  context('Airnode/relayer address is not zero', function () {
    context('Protocol ID is not zero', function () {
      it('requests withdrawal', async function () {
        const expectedWithdrawalRequestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeProtocol.address,
              roles.sponsor.address,
              protocolId,
            ]
          )
        );
        expect(await airnodeProtocol.withdrawalRequestIsAwaitingFulfillment(expectedWithdrawalRequestId)).to.equal(
          false
        );
        await expect(airnodeProtocol.connect(roles.sponsor).requestWithdrawal(airnodeAddress, protocolId))
          .to.emit(airnodeProtocol, 'RequestedWithdrawal')
          .withArgs(airnodeAddress, roles.sponsor.address, expectedWithdrawalRequestId, protocolId);
        expect(await airnodeProtocol.withdrawalRequestIsAwaitingFulfillment(expectedWithdrawalRequestId)).to.equal(
          true
        );
      });
    });
    context('Protocol ID is zero', function () {
      it('reverts', async function () {
        await expect(airnodeProtocol.connect(roles.sponsor).requestWithdrawal(airnodeAddress, 0)).to.be.revertedWith(
          'Protocol ID zero'
        );
      });
    });
  });
  context('Airnode/relayer address is zero', function () {
    it('reverts', async function () {
      await expect(
        airnodeProtocol.connect(roles.sponsor).requestWithdrawal(hre.ethers.constants.AddressZero, protocolId)
      ).to.be.revertedWith('Airnode/relayer address zero');
    });
  });
});

describe('fulfillWithdrawal', function () {
  context('Fulfillment parameters are correct', function () {
    context('Timestamp is valid', function () {
      context('Signature is valid', function () {
        it('fulfills withdrawal', async function () {
          const withdrawalRequestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'address', 'address', 'uint256'],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeProtocol.address,
                roles.sponsor.address,
                protocolId,
              ]
            )
          );
          await airnodeProtocol.connect(roles.sponsor).requestWithdrawal(airnodeAddress, protocolId);
          const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  ['bytes32', 'uint256', 'address'],
                  [withdrawalRequestId, timestamp, airnodeSponsorWallet.address]
                )
              )
            )
          );
          // Calculate the amount to be withdrawn
          const gasEstimate = await airnodeProtocol
            .connect(airnodeSponsorWallet)
            .estimateGas.fulfillWithdrawal(
              withdrawalRequestId,
              airnodeAddress,
              protocolId,
              roles.sponsor.address,
              timestamp,
              signature,
              {
                value: 1,
                gasLimit: 500000,
              }
            );
          const gasPrice = await hre.ethers.provider.getGasPrice();
          const txCost = gasEstimate.mul(gasPrice);
          const sponsorWalletBalance = await hre.ethers.provider.getBalance(airnodeSponsorWallet.address);
          const fundsToSend = sponsorWalletBalance.sub(txCost);
          // Fulfill the withdrawal request
          await expect(
            airnodeProtocol
              .connect(airnodeSponsorWallet)
              .fulfillWithdrawal(
                withdrawalRequestId,
                airnodeAddress,
                protocolId,
                roles.sponsor.address,
                timestamp,
                signature,
                {
                  value: fundsToSend,
                  gasLimit: gasEstimate,
                  gasPrice: gasPrice,
                }
              )
          )
            .to.emit(airnodeProtocol, 'FulfilledWithdrawal')
            .withArgs(
              airnodeAddress,
              roles.sponsor.address,
              withdrawalRequestId,
              protocolId,
              airnodeSponsorWallet.address,
              fundsToSend
            );
          expect(await airnodeProtocol.sponsorToBalance(roles.sponsor.address)).to.equal(fundsToSend);
          expect(await airnodeProtocol.withdrawalRequestIsAwaitingFulfillment(withdrawalRequestId)).to.equal(false);
        });
      });
      context('Signature is not valid', function () {
        it('reverts', async function () {
          const withdrawalRequestId = hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['uint256', 'address', 'address', 'uint256'],
              [
                (await hre.ethers.provider.getNetwork()).chainId,
                airnodeProtocol.address,
                roles.sponsor.address,
                protocolId,
              ]
            )
          );
          await airnodeProtocol.connect(roles.sponsor).requestWithdrawal(airnodeAddress, protocolId);
          const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
          const differentSignature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  ['bytes32', 'uint256', 'address'],
                  [testUtils.generateRandomBytes32(), timestamp, airnodeSponsorWallet.address]
                )
              )
            )
          );
          await expect(
            airnodeProtocol
              .connect(airnodeSponsorWallet)
              .fulfillWithdrawal(
                withdrawalRequestId,
                airnodeAddress,
                protocolId,
                roles.sponsor.address,
                timestamp,
                differentSignature,
                {
                  value: 1,
                  gasLimit: 500000,
                }
              )
          ).to.be.revertedWith('Signature mismatch');
          const invalidSignature = '0x12345678';
          await expect(
            airnodeProtocol
              .connect(airnodeSponsorWallet)
              .fulfillWithdrawal(
                withdrawalRequestId,
                airnodeAddress,
                protocolId,
                roles.sponsor.address,
                timestamp,
                invalidSignature,
                {
                  value: 1,
                  gasLimit: 500000,
                }
              )
          ).to.be.revertedWith('ECDSA: invalid signature length');
        });
      });
    });
    context('Timestamp is not valid', function () {
      it('reverts', async function () {
        const withdrawalRequestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeProtocol.address,
              roles.sponsor.address,
              protocolId,
            ]
          )
        );
        await airnodeProtocol.connect(roles.sponsor).requestWithdrawal(airnodeAddress, protocolId);
        const now = await testUtils.getCurrentTimestamp(hre.ethers.provider);
        await hre.ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
        const timestampStale = now - 60 * 60 + 1;
        const signatureStale = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                ['bytes32', 'uint256', 'address'],
                [withdrawalRequestId, timestampStale, airnodeSponsorWallet.address]
              )
            )
          )
        );
        await expect(
          airnodeProtocol
            .connect(airnodeSponsorWallet)
            .fulfillWithdrawal(
              withdrawalRequestId,
              airnodeAddress,
              protocolId,
              roles.sponsor.address,
              timestampStale,
              signatureStale,
              {
                value: 1,
                gasLimit: 500000,
              }
            )
        ).to.be.revertedWith('Timestamp not valid');
        await hre.ethers.provider.send('evm_setNextBlockTimestamp', [now + 2]);
        const timestampFromFuture = now + 15 * 60 + 2;
        const signatureFromFuture = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                ['bytes32', 'uint256', 'address'],
                [withdrawalRequestId, timestampFromFuture, airnodeSponsorWallet.address]
              )
            )
          )
        );
        await expect(
          airnodeProtocol
            .connect(airnodeSponsorWallet)
            .fulfillWithdrawal(
              withdrawalRequestId,
              airnodeAddress,
              protocolId,
              roles.sponsor.address,
              timestampFromFuture,
              signatureFromFuture,
              {
                value: 1,
                gasLimit: 500000,
              }
            )
        ).to.be.revertedWith('Timestamp not valid');
      });
    });
  });
  context('Withdrawal request ID is not correct', function () {
    it('reverts', async function () {
      const withdrawalRequestId = hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(
          ['uint256', 'address', 'address', 'uint256'],
          [(await hre.ethers.provider.getNetwork()).chainId, airnodeProtocol.address, roles.sponsor.address, protocolId]
        )
      );
      await airnodeProtocol.connect(roles.sponsor).requestWithdrawal(airnodeAddress, protocolId);
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address'],
              [withdrawalRequestId, timestamp, airnodeSponsorWallet.address]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(airnodeSponsorWallet)
          .fulfillWithdrawal(
            testUtils.generateRandomBytes32(),
            airnodeAddress,
            protocolId,
            roles.sponsor.address,
            timestamp,
            signature,
            {
              value: 1,
              gasLimit: 500000,
            }
          )
      ).to.be.revertedWith('Invalid withdrawal fulfillment');
    });
  });
  context('Airnode/relayer address is not correct', function () {
    it('reverts', async function () {
      const withdrawalRequestId = hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(
          ['uint256', 'address', 'address', 'uint256'],
          [(await hre.ethers.provider.getNetwork()).chainId, airnodeProtocol.address, roles.sponsor.address, protocolId]
        )
      );
      await airnodeProtocol.connect(roles.sponsor).requestWithdrawal(airnodeAddress, protocolId);
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address'],
              [withdrawalRequestId, timestamp, airnodeSponsorWallet.address]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(airnodeSponsorWallet)
          .fulfillWithdrawal(
            withdrawalRequestId,
            testUtils.generateRandomAddress(),
            protocolId,
            roles.sponsor.address,
            timestamp,
            signature,
            {
              value: 1,
              gasLimit: 500000,
            }
          )
      ).to.be.revertedWith('Invalid withdrawal fulfillment');
    });
  });
  context('Protocol ID is not correct', function () {
    it('reverts', async function () {
      const withdrawalRequestId = hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(
          ['uint256', 'address', 'address', 'uint256'],
          [(await hre.ethers.provider.getNetwork()).chainId, airnodeProtocol.address, roles.sponsor.address, protocolId]
        )
      );
      await airnodeProtocol.connect(roles.sponsor).requestWithdrawal(airnodeAddress, protocolId);
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address'],
              [withdrawalRequestId, timestamp, airnodeSponsorWallet.address]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(airnodeSponsorWallet)
          .fulfillWithdrawal(withdrawalRequestId, airnodeAddress, 12345, roles.sponsor.address, timestamp, signature, {
            value: 1,
            gasLimit: 500000,
          })
      ).to.be.revertedWith('Invalid withdrawal fulfillment');
    });
  });
  context('Sponsor address is not correct', function () {
    it('reverts', async function () {
      const withdrawalRequestId = hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(
          ['uint256', 'address', 'address', 'uint256'],
          [(await hre.ethers.provider.getNetwork()).chainId, airnodeProtocol.address, roles.sponsor.address, protocolId]
        )
      );
      await airnodeProtocol.connect(roles.sponsor).requestWithdrawal(airnodeAddress, protocolId);
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address'],
              [withdrawalRequestId, timestamp, airnodeSponsorWallet.address]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(airnodeSponsorWallet)
          .fulfillWithdrawal(
            withdrawalRequestId,
            airnodeAddress,
            protocolId,
            testUtils.generateRandomAddress(),
            timestamp,
            signature,
            {
              value: 1,
              gasLimit: 500000,
            }
          )
      ).to.be.revertedWith('Invalid withdrawal fulfillment');
    });
  });
});

describe('claimBalance', function () {
  context('Sender balance is not zero', function () {
    context('Transfer is successful', function () {
      it('claims balance', async function () {
        const withdrawalRequestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256'],
            [
              (await hre.ethers.provider.getNetwork()).chainId,
              airnodeProtocol.address,
              roles.sponsor.address,
              protocolId,
            ]
          )
        );
        await airnodeProtocol.connect(roles.sponsor).requestWithdrawal(airnodeAddress, protocolId);
        const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                ['bytes32', 'uint256', 'address'],
                [withdrawalRequestId, timestamp, airnodeSponsorWallet.address]
              )
            )
          )
        );
        // Calculate the amount to be withdrawn
        const gasEstimate = await airnodeProtocol
          .connect(airnodeSponsorWallet)
          .estimateGas.fulfillWithdrawal(
            withdrawalRequestId,
            airnodeAddress,
            protocolId,
            roles.sponsor.address,
            timestamp,
            signature,
            {
              value: 1,
              gasLimit: 500000,
            }
          );
        const gasPrice = await hre.ethers.provider.getGasPrice();
        const txCost = gasEstimate.mul(gasPrice);
        const sponsorWalletBalance = await hre.ethers.provider.getBalance(airnodeSponsorWallet.address);
        const fundsToSend = sponsorWalletBalance.sub(txCost);
        // Fulfill the withdrawal request
        await airnodeProtocol
          .connect(airnodeSponsorWallet)
          .fulfillWithdrawal(
            withdrawalRequestId,
            airnodeAddress,
            protocolId,
            roles.sponsor.address,
            timestamp,
            signature,
            {
              value: fundsToSend,
              gasLimit: gasEstimate,
              gasPrice: gasPrice,
            }
          );
        // Claim balance
        const sponsorBalance = await hre.ethers.provider.getBalance(roles.sponsor.address);
        await expect(airnodeProtocol.connect(roles.sponsor).claimBalance())
          .to.emit(airnodeProtocol, 'ClaimedBalance')
          .withArgs(roles.sponsor.address, fundsToSend);
        // Less than 0.001 ETH will be spent on the transaction
        expect(
          sponsorBalance.add(fundsToSend).sub(await hre.ethers.provider.getBalance(roles.sponsor.address))
        ).to.be.lt(hre.ethers.utils.parseEther('0.001'));
        expect(await hre.ethers.provider.getBalance(airnodeProtocol.address)).to.equal(0);
      });
    });
    context('Transfer is not successful', function () {
      it('reverts', async function () {
        const mockSponsorFactory = await hre.ethers.getContractFactory('MockSponsor', roles.deployer);
        const sponsor = await mockSponsorFactory.deploy(airnodeProtocol.address);
        const withdrawalRequestId = hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['uint256', 'address', 'address', 'uint256'],
            [(await hre.ethers.provider.getNetwork()).chainId, airnodeProtocol.address, sponsor.address, protocolId]
          )
        );
        await sponsor.requestWithdrawal(airnodeAddress, protocolId);
        const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                ['bytes32', 'uint256', 'address'],
                [withdrawalRequestId, timestamp, airnodeSponsorWallet.address]
              )
            )
          )
        );
        // Calculate the amount to be withdrawn
        const gasEstimate = await airnodeProtocol
          .connect(airnodeSponsorWallet)
          .estimateGas.fulfillWithdrawal(
            withdrawalRequestId,
            airnodeAddress,
            protocolId,
            sponsor.address,
            timestamp,
            signature,
            {
              value: 1,
              gasLimit: 500000,
            }
          );
        const gasPrice = await hre.ethers.provider.getGasPrice();
        const txCost = gasEstimate.mul(gasPrice);
        const sponsorWalletBalance = await hre.ethers.provider.getBalance(airnodeSponsorWallet.address);
        const fundsToSend = sponsorWalletBalance.sub(txCost);
        // Fulfill the withdrawal request
        await airnodeProtocol
          .connect(airnodeSponsorWallet)
          .fulfillWithdrawal(withdrawalRequestId, airnodeAddress, protocolId, sponsor.address, timestamp, signature, {
            value: fundsToSend,
            gasLimit: gasEstimate,
            gasPrice: gasPrice,
          });
        // Attempt to claim balance
        await expect(sponsor.claimBalance()).to.be.revertedWith('Transfer failed');
      });
    });
  });
  context('Sender balance is zero', function () {
    it('reverts', async function () {
      await expect(airnodeProtocol.connect(roles.sponsor).claimBalance()).to.be.revertedWith('Sender balance zero');
    });
  });
});
