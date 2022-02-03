/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let airnodeProtocol, airnodeRequester;
let airnodeAddress, airnodeWallet, airnodeSponsorWallet;
let relayerAddress, relayerWallet, relayerSponsorWallet;
let endpointId, templateParameters, templateId, requestParameters;

async function deriveExpectedRequestId(fulfillFunctionId) {
  return hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(
      ['uint256', 'address', 'address', 'uint256', 'address', 'bytes32', 'bytes', 'address', 'bytes4'],
      [
        (await hre.ethers.provider.getNetwork()).chainId,
        airnodeProtocol.address,
        airnodeRequester.address,
        (await airnodeProtocol.requesterToRequestCount(airnodeRequester.address)).add(1),
        airnodeAddress,
        templateId,
        requestParameters,
        roles.sponsor.address,
        fulfillFunctionId,
      ]
    )
  );
}

async function deriveExpectedRelayedRequestId(fulfillFunctionId) {
  return hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(
      ['uint256', 'address', 'address', 'uint256', 'address', 'bytes32', 'bytes', 'address', 'address', 'bytes4'],
      [
        (await hre.ethers.provider.getNetwork()).chainId,
        airnodeProtocol.address,
        airnodeRequester.address,
        (await airnodeProtocol.requesterToRequestCount(airnodeRequester.address)).add(1),
        airnodeAddress,
        templateId,
        requestParameters,
        relayerAddress,
        roles.sponsor.address,
        fulfillFunctionId,
      ]
    )
  );
}

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    sponsor: accounts[1],
    randomPerson: accounts[9],
  };
  const airnodeProtocolFactory = await hre.ethers.getContractFactory('AirnodeProtocol', roles.deployer);
  airnodeProtocol = await airnodeProtocolFactory.deploy();
  const airnodeRequesterFactory = await hre.ethers.getContractFactory('MockAirnodeRequester', roles.deployer);
  airnodeRequester = await airnodeRequesterFactory.deploy(airnodeProtocol.address);
  const airnodeData = testUtils.generateRandomAirnodeWallet();
  airnodeAddress = airnodeData.airnodeAddress;
  const airnodeMnemonic = airnodeData.airnodeMnemonic;
  airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic, "m/44'/60'/0'/0/0");
  airnodeSponsorWallet = testUtils.deriveSponsorWallet(airnodeMnemonic, roles.sponsor.address, 1);
  await roles.deployer.sendTransaction({
    to: airnodeSponsorWallet.address,
    value: hre.ethers.utils.parseEther('1'),
  });
  const relayerData = testUtils.generateRandomAirnodeWallet();
  relayerAddress = relayerData.airnodeAddress;
  relayerWallet = hre.ethers.Wallet.fromMnemonic(relayerData.airnodeMnemonic, "m/44'/60'/0'/0/0");
  relayerSponsorWallet = testUtils.deriveSponsorWallet(relayerData.airnodeMnemonic, roles.sponsor.address, 2);
  await roles.deployer.sendTransaction({
    to: relayerSponsorWallet.address,
    value: hre.ethers.utils.parseEther('1'),
  });
  endpointId = testUtils.generateRandomBytes32();
  templateParameters = testUtils.generateRandomBytes();
  templateId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, templateParameters])
  );
  requestParameters = testUtils.generateRandomBytes();
});

describe('makeRequest', function () {
  context('Airnode address is not zero', function () {
    context('Template ID is not zero', function () {
      context('Parameters are not too long', function () {
        context('Sponsor address is not zero', function () {
          context('Function selector is not zero', function () {
            it('makes request', async function () {
              const expectedRequestId = await deriveExpectedRequestId(
                airnodeRequester.interface.getSighash('fulfillRequest')
              );
              await expect(
                airnodeRequester.makeRequest(
                  airnodeAddress,
                  templateId,
                  requestParameters,
                  roles.sponsor.address,
                  airnodeRequester.interface.getSighash('fulfillRequest')
                )
              )
                .to.emit(airnodeProtocol, 'MadeRequest')
                .withArgs(
                  airnodeAddress,
                  expectedRequestId,
                  airnodeRequester.address,
                  1,
                  templateId,
                  requestParameters,
                  roles.sponsor.address,
                  airnodeRequester.interface.getSighash('fulfillRequest')
                );
              expect(await airnodeProtocol.requesterToRequestCount(airnodeRequester.address)).to.equal(1);
              expect(await airnodeProtocol.requestIsAwaitingFulfillment(expectedRequestId)).to.equal(true);
            });
          });
          context('Function selector is zero', function () {
            it('reverts', async function () {
              await expect(
                airnodeRequester.makeRequest(
                  airnodeAddress,
                  templateId,
                  requestParameters,
                  roles.sponsor.address,
                  '0x00000000'
                )
              ).to.be.revertedWith('Fulfill function ID zero');
            });
          });
        });
        context('Sponsor address is zero', function () {
          it('reverts', async function () {
            await expect(
              airnodeRequester.makeRequest(
                airnodeAddress,
                templateId,
                requestParameters,
                hre.ethers.constants.AddressZero,
                airnodeRequester.interface.getSighash('fulfillRequest')
              )
            ).to.be.revertedWith('Sponsor address zero');
          });
        });
      });
      context('Parameters are too long', function () {
        it('reverts', async function () {
          await expect(
            airnodeRequester.makeRequest(
              airnodeAddress,
              templateId,
              `0x${'01'.repeat(4096 + 1)}`,
              roles.sponsor.address,
              airnodeRequester.interface.getSighash('fulfillRequest')
            )
          ).to.be.revertedWith('Parameters too long');
        });
      });
    });
    context('Template ID is zero', function () {
      it('reverts', async function () {
        it('reverts', async function () {
          await expect(
            airnodeRequester.makeRequest(
              airnodeAddress,
              hre.ethers.constants.HashZero,
              requestParameters,
              roles.sponsor.address,
              airnodeRequester.interface.getSighash('fulfillRequest')
            )
          ).to.be.revertedWith('Template ID zero');
        });
      });
    });
  });
  context('Airnode address is zero', function () {
    it('reverts', async function () {
      await expect(
        airnodeRequester.makeRequest(
          hre.ethers.constants.AddressZero,
          templateId,
          requestParameters,
          roles.sponsor.address,
          airnodeRequester.interface.getSighash('fulfillRequest')
        )
      ).to.be.revertedWith('Airnode address zero');
    });
  });
});

describe('fulfillRequest', function () {
  context('Fulfillment parameters are correct', function () {
    context('Signature is valid', function () {
      context('Fulfill function does not revert', function () {
        it('returns `true` and fulfills request', async function () {
          const requestId = await deriveExpectedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
          await airnodeRequester.makeRequest(
            airnodeAddress,
            templateId,
            requestParameters,
            roles.sponsor.address,
            airnodeRequester.interface.getSighash('fulfillRequest')
          );
          const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
          const data = hre.ethers.utils.keccak256(
            hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello'])
          );
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  ['bytes32', 'uint256', 'address'],
                  [requestId, timestamp, airnodeSponsorWallet.address]
                )
              )
            )
          );
          const staticCallResult = await airnodeProtocol
            .connect(airnodeSponsorWallet)
            .callStatic.fulfillRequest(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              airnodeRequester.interface.getSighash('fulfillRequest'),
              timestamp,
              data,
              signature,
              { gasLimit: 500000 }
            );
          expect(staticCallResult.callSuccess).to.equal(true);
          expect(staticCallResult.callData).to.equal('0x');
          await expect(
            airnodeProtocol
              .connect(airnodeSponsorWallet)
              .fulfillRequest(
                requestId,
                airnodeAddress,
                airnodeRequester.address,
                airnodeRequester.interface.getSighash('fulfillRequest'),
                timestamp,
                data,
                signature,
                { gasLimit: 500000 }
              )
          )
            .to.emit(airnodeProtocol, 'FulfilledRequest')
            .withArgs(airnodeAddress, requestId, timestamp, data);
          expect(await airnodeProtocol.requestIsAwaitingFulfillment(requestId)).to.equal(false);
          expect(await airnodeRequester.requestIdToData(requestId)).to.equal(data);
          // Should revert the second fulfillment attempt
          await expect(
            airnodeProtocol
              .connect(airnodeSponsorWallet)
              .fulfillRequest(
                requestId,
                airnodeAddress,
                airnodeRequester.address,
                airnodeRequester.interface.getSighash('fulfillRequest'),
                timestamp,
                data,
                signature,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill function reverts with string', function () {
        it('returns `false` with revert string and fails', async function () {
          const requestId = await deriveExpectedRequestId(
            airnodeRequester.interface.getSighash('fulfillRequestAlwaysReverts')
          );
          await airnodeRequester.makeRequest(
            airnodeAddress,
            templateId,
            requestParameters,
            roles.sponsor.address,
            airnodeRequester.interface.getSighash('fulfillRequestAlwaysReverts')
          );
          const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
          const data = hre.ethers.utils.keccak256(
            hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello'])
          );
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  ['bytes32', 'uint256', 'address'],
                  [requestId, timestamp, airnodeSponsorWallet.address]
                )
              )
            )
          );
          const staticCallResult = await airnodeProtocol
            .connect(airnodeSponsorWallet)
            .callStatic.fulfillRequest(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              airnodeRequester.interface.getSighash('fulfillRequestAlwaysReverts'),
              timestamp,
              data,
              signature,
              { gasLimit: 500000 }
            );
          expect(staticCallResult.callSuccess).to.equal(false);
          expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('Always reverts');
          await expect(
            airnodeProtocol
              .connect(airnodeSponsorWallet)
              .fulfillRequest(
                requestId,
                airnodeAddress,
                airnodeRequester.address,
                airnodeRequester.interface.getSighash('fulfillRequestAlwaysReverts'),
                timestamp,
                data,
                signature,
                { gasLimit: 500000 }
              )
          )
            .to.emit(airnodeProtocol, 'FailedRequest')
            .withArgs(airnodeAddress, requestId, timestamp, 'Fulfillment failed unexpectedly');
          expect(await airnodeProtocol.requestIsAwaitingFulfillment(requestId)).to.equal(false);
          expect(await airnodeRequester.requestIdToData(requestId)).to.equal('0x');
          // Should revert the second fulfillment attempt
          await expect(
            airnodeProtocol
              .connect(airnodeSponsorWallet)
              .fulfillRequest(
                requestId,
                airnodeAddress,
                airnodeRequester.address,
                airnodeRequester.interface.getSighash('fulfillRequestAlwaysReverts'),
                timestamp,
                data,
                signature,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill function reverts without string', function () {
        it('returns `false` without revert string and fails', async function () {
          const requestId = await deriveExpectedRequestId(
            airnodeRequester.interface.getSighash('fulfillRequestAlwaysRevertsWithNoString')
          );
          await airnodeRequester.makeRequest(
            airnodeAddress,
            templateId,
            requestParameters,
            roles.sponsor.address,
            airnodeRequester.interface.getSighash('fulfillRequestAlwaysRevertsWithNoString')
          );
          const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
          const data = hre.ethers.utils.keccak256(
            hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello'])
          );
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  ['bytes32', 'uint256', 'address'],
                  [requestId, timestamp, airnodeSponsorWallet.address]
                )
              )
            )
          );
          const staticCallResult = await airnodeProtocol
            .connect(airnodeSponsorWallet)
            .callStatic.fulfillRequest(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              airnodeRequester.interface.getSighash('fulfillRequestAlwaysRevertsWithNoString'),
              timestamp,
              data,
              signature,
              { gasLimit: 500000 }
            );
          expect(staticCallResult.callSuccess).to.equal(false);
          expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('No revert string');
          await expect(
            airnodeProtocol
              .connect(airnodeSponsorWallet)
              .fulfillRequest(
                requestId,
                airnodeAddress,
                airnodeRequester.address,
                airnodeRequester.interface.getSighash('fulfillRequestAlwaysRevertsWithNoString'),
                timestamp,
                data,
                signature,
                { gasLimit: 500000 }
              )
          )
            .to.emit(airnodeProtocol, 'FailedRequest')
            .withArgs(airnodeAddress, requestId, timestamp, 'Fulfillment failed unexpectedly');
          expect(await airnodeProtocol.requestIsAwaitingFulfillment(requestId)).to.equal(false);
          expect(await airnodeRequester.requestIdToData(requestId)).to.equal('0x');
          // Should revert the second fulfillment attempt
          await expect(
            airnodeProtocol
              .connect(airnodeSponsorWallet)
              .fulfillRequest(
                requestId,
                airnodeAddress,
                airnodeRequester.address,
                airnodeRequester.interface.getSighash('fulfillRequestAlwaysRevertsWithNoString'),
                timestamp,
                data,
                signature,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill function runs out of gas', function () {
        it('returns `false` without revert string and fails', async function () {
          const requestId = await deriveExpectedRequestId(
            airnodeRequester.interface.getSighash('fulfillRequestAlwaysRunsOutOfGas')
          );
          await airnodeRequester.makeRequest(
            airnodeAddress,
            templateId,
            requestParameters,
            roles.sponsor.address,
            airnodeRequester.interface.getSighash('fulfillRequestAlwaysRunsOutOfGas')
          );
          const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
          const data = hre.ethers.utils.keccak256(
            hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello'])
          );
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  ['bytes32', 'uint256', 'address'],
                  [requestId, timestamp, airnodeSponsorWallet.address]
                )
              )
            )
          );
          const staticCallResult = await airnodeProtocol
            .connect(airnodeSponsorWallet)
            .callStatic.fulfillRequest(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              airnodeRequester.interface.getSighash('fulfillRequestAlwaysRunsOutOfGas'),
              timestamp,
              data,
              signature,
              { gasLimit: 500000 }
            );
          expect(staticCallResult.callSuccess).to.equal(false);
          expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('No revert string');
          await expect(
            airnodeProtocol
              .connect(airnodeSponsorWallet)
              .fulfillRequest(
                requestId,
                airnodeAddress,
                airnodeRequester.address,
                airnodeRequester.interface.getSighash('fulfillRequestAlwaysRunsOutOfGas'),
                timestamp,
                data,
                signature,
                { gasLimit: 500000 }
              )
          )
            .to.emit(airnodeProtocol, 'FailedRequest')
            .withArgs(airnodeAddress, requestId, timestamp, 'Fulfillment failed unexpectedly');
          expect(await airnodeProtocol.requestIsAwaitingFulfillment(requestId)).to.equal(false);
          expect(await airnodeRequester.requestIdToData(requestId)).to.equal('0x');
          // Should revert the second fulfillment attempt
          await expect(
            airnodeProtocol
              .connect(airnodeSponsorWallet)
              .fulfillRequest(
                requestId,
                airnodeAddress,
                airnodeRequester.address,
                airnodeRequester.interface.getSighash('fulfillRequestAlwaysRunsOutOfGas'),
                timestamp,
                data,
                signature,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
    });
    context('Signature is not valid', function () {
      it('reverts', async function () {
        const requestId = await deriveExpectedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
        await airnodeRequester.makeRequest(
          airnodeAddress,
          templateId,
          requestParameters,
          roles.sponsor.address,
          airnodeRequester.interface.getSighash('fulfillRequest')
        );
        const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
        const data = hre.ethers.utils.keccak256(
          hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello'])
        );
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
            .fulfillRequest(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              airnodeRequester.interface.getSighash('fulfillRequest'),
              timestamp,
              data,
              differentSignature,
              { gasLimit: 500000 }
            )
        ).to.be.revertedWith('Signature mismatch');
        const invalidSignature = '0x12345678';
        await expect(
          airnodeProtocol
            .connect(airnodeSponsorWallet)
            .fulfillRequest(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              airnodeRequester.interface.getSighash('fulfillRequest'),
              timestamp,
              data,
              invalidSignature,
              { gasLimit: 500000 }
            )
        ).to.be.revertedWith('ECDSA: invalid signature length');
      });
    });
  });
  context('Request ID is not correct', function () {
    it('reverts', async function () {
      const requestId = await deriveExpectedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
      await airnodeRequester.makeRequest(
        airnodeAddress,
        templateId,
        requestParameters,
        roles.sponsor.address,
        airnodeRequester.interface.getSighash('fulfillRequest')
      );
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const data = hre.ethers.utils.keccak256(
        hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello'])
      );
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address'],
              [requestId, timestamp, airnodeSponsorWallet.address]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(airnodeSponsorWallet)
          .fulfillRequest(
            testUtils.generateRandomBytes32(),
            airnodeAddress,
            airnodeRequester.address,
            airnodeRequester.interface.getSighash('fulfillRequest'),
            timestamp,
            data,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Invalid request fulfillment');
    });
  });
  context('Airnode address is not correct', function () {
    it('reverts', async function () {
      const requestId = await deriveExpectedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
      await airnodeRequester.makeRequest(
        airnodeAddress,
        templateId,
        requestParameters,
        roles.sponsor.address,
        airnodeRequester.interface.getSighash('fulfillRequest')
      );
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const data = hre.ethers.utils.keccak256(
        hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello'])
      );
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address'],
              [requestId, timestamp, airnodeSponsorWallet.address]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(airnodeSponsorWallet)
          .fulfillRequest(
            requestId,
            testUtils.generateRandomAddress(),
            airnodeRequester.address,
            airnodeRequester.interface.getSighash('fulfillRequest'),
            timestamp,
            data,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Invalid request fulfillment');
    });
  });
  context('Requester address is not correct', function () {
    it('reverts', async function () {
      const requestId = await deriveExpectedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
      await airnodeRequester.makeRequest(
        airnodeAddress,
        templateId,
        requestParameters,
        roles.sponsor.address,
        airnodeRequester.interface.getSighash('fulfillRequest')
      );
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const data = hre.ethers.utils.keccak256(
        hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello'])
      );
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address'],
              [requestId, timestamp, airnodeSponsorWallet.address]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(airnodeSponsorWallet)
          .fulfillRequest(
            requestId,
            airnodeAddress,
            testUtils.generateRandomAddress(),
            airnodeRequester.interface.getSighash('fulfillRequest'),
            timestamp,
            data,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Invalid request fulfillment');
    });
  });
  context('Fulfill function ID is not correct', function () {
    it('reverts', async function () {
      const requestId = await deriveExpectedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
      await airnodeRequester.makeRequest(
        airnodeAddress,
        templateId,
        requestParameters,
        roles.sponsor.address,
        airnodeRequester.interface.getSighash('fulfillRequest')
      );
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const data = hre.ethers.utils.keccak256(
        hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello'])
      );
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address'],
              [requestId, timestamp, airnodeSponsorWallet.address]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(airnodeSponsorWallet)
          .fulfillRequest(
            requestId,
            airnodeAddress,
            airnodeRequester.address,
            airnodeRequester.interface.getSighash('fulfillRequestAlwaysReverts'),
            timestamp,
            data,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Invalid request fulfillment');
    });
  });
});

describe('failRequest', function () {
  context('Fulfillment parameters are correct', function () {
    context('Signature is valid', function () {
      it('fails request with an error message', async function () {
        const requestId = await deriveExpectedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
        await airnodeRequester.makeRequest(
          airnodeAddress,
          templateId,
          requestParameters,
          roles.sponsor.address,
          airnodeRequester.interface.getSighash('fulfillRequest')
        );
        const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
        const errorMessage = 'Thing went wrong';
        const signature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                ['bytes32', 'uint256', 'address'],
                [requestId, timestamp, airnodeSponsorWallet.address]
              )
            )
          )
        );
        await expect(
          airnodeProtocol
            .connect(airnodeSponsorWallet)
            .failRequest(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              airnodeRequester.interface.getSighash('fulfillRequest'),
              timestamp,
              errorMessage,
              signature,
              { gasLimit: 500000 }
            )
        )
          .to.emit(airnodeProtocol, 'FailedRequest')
          .withArgs(airnodeAddress, requestId, timestamp, errorMessage);
        // Should revert the second failure attempt
        await expect(
          airnodeProtocol
            .connect(airnodeSponsorWallet)
            .failRequest(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              airnodeRequester.interface.getSighash('fulfillRequest'),
              timestamp,
              errorMessage,
              signature,
              { gasLimit: 500000 }
            )
        ).to.be.revertedWith('Invalid request fulfillment');
      });
    });
    context('Signature is not valid', function () {
      it('reverts', async function () {
        const requestId = await deriveExpectedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
        await airnodeRequester.makeRequest(
          airnodeAddress,
          templateId,
          requestParameters,
          roles.sponsor.address,
          airnodeRequester.interface.getSighash('fulfillRequest')
        );
        const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
        const errorMessage = 'Thing went wrong';
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
            .failRequest(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              airnodeRequester.interface.getSighash('fulfillRequest'),
              timestamp,
              errorMessage,
              differentSignature,
              { gasLimit: 500000 }
            )
        ).to.be.revertedWith('Signature mismatch');
        const invalidSignature = '0x12345678';
        await expect(
          airnodeProtocol
            .connect(airnodeSponsorWallet)
            .failRequest(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              airnodeRequester.interface.getSighash('fulfillRequest'),
              timestamp,
              errorMessage,
              invalidSignature,
              { gasLimit: 500000 }
            )
        ).to.be.revertedWith('ECDSA: invalid signature length');
      });
    });
  });
  context('Request ID is not correct', function () {
    it('reverts', async function () {
      const requestId = await deriveExpectedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
      await airnodeRequester.makeRequest(
        airnodeAddress,
        templateId,
        requestParameters,
        roles.sponsor.address,
        airnodeRequester.interface.getSighash('fulfillRequest')
      );
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const errorMessage = 'Thing went wrong';
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address'],
              [requestId, timestamp, airnodeSponsorWallet.address]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(airnodeSponsorWallet)
          .failRequest(
            testUtils.generateRandomBytes32(),
            airnodeAddress,
            airnodeRequester.address,
            airnodeRequester.interface.getSighash('fulfillRequest'),
            timestamp,
            errorMessage,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Invalid request fulfillment');
    });
  });
  context('Airnode address is not correct', function () {
    it('reverts', async function () {
      const requestId = await deriveExpectedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
      await airnodeRequester.makeRequest(
        airnodeAddress,
        templateId,
        requestParameters,
        roles.sponsor.address,
        airnodeRequester.interface.getSighash('fulfillRequest')
      );
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const errorMessage = 'Thing went wrong';
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address'],
              [requestId, timestamp, airnodeSponsorWallet.address]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(airnodeSponsorWallet)
          .failRequest(
            requestId,
            testUtils.generateRandomAddress(),
            airnodeRequester.address,
            airnodeRequester.interface.getSighash('fulfillRequest'),
            timestamp,
            errorMessage,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Invalid request fulfillment');
    });
  });
  context('Requester address is not correct', function () {
    it('reverts', async function () {
      const requestId = await deriveExpectedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
      await airnodeRequester.makeRequest(
        airnodeAddress,
        templateId,
        requestParameters,
        roles.sponsor.address,
        airnodeRequester.interface.getSighash('fulfillRequest')
      );
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const errorMessage = 'Thing went wrong';
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address'],
              [requestId, timestamp, airnodeSponsorWallet.address]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(airnodeSponsorWallet)
          .failRequest(
            requestId,
            airnodeAddress,
            testUtils.generateRandomAddress(),
            airnodeRequester.interface.getSighash('fulfillRequest'),
            timestamp,
            errorMessage,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Invalid request fulfillment');
    });
  });
  context('Fulfill function ID is not correct', function () {
    it('reverts', async function () {
      const requestId = await deriveExpectedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
      await airnodeRequester.makeRequest(
        airnodeAddress,
        templateId,
        requestParameters,
        roles.sponsor.address,
        airnodeRequester.interface.getSighash('fulfillRequest')
      );
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const errorMessage = 'Thing went wrong';
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address'],
              [requestId, timestamp, airnodeSponsorWallet.address]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(airnodeSponsorWallet)
          .failRequest(
            requestId,
            airnodeAddress,
            airnodeRequester.address,
            airnodeRequester.interface.getSighash('fulfillRequestAlwaysReverts'),
            timestamp,
            errorMessage,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Invalid request fulfillment');
    });
  });
});

describe('makeRequestRelayed', function () {
  context('Airnode address is not zero', function () {
    context('Template ID is not zero', function () {
      context('Parameters are not too long', function () {
        context('Relayer address is not zero', function () {
          context('Sponsor address is not zero', function () {
            context('Function selector is not zero', function () {
              it('makes relayed request', async function () {
                const expectedRequestId = await deriveExpectedRelayedRequestId(
                  airnodeRequester.interface.getSighash('fulfillRequest')
                );
                await expect(
                  airnodeRequester.makeRequestRelayed(
                    airnodeAddress,
                    templateId,
                    requestParameters,
                    relayerAddress,
                    roles.sponsor.address,
                    airnodeRequester.interface.getSighash('fulfillRequest')
                  )
                )
                  .to.emit(airnodeProtocol, 'MadeRequestRelayed')
                  .withArgs(
                    relayerAddress,
                    expectedRequestId,
                    airnodeAddress,
                    airnodeRequester.address,
                    1,
                    templateId,
                    requestParameters,
                    roles.sponsor.address,
                    airnodeRequester.interface.getSighash('fulfillRequest')
                  );
                expect(await airnodeProtocol.requesterToRequestCount(airnodeRequester.address)).to.equal(1);
                expect(await airnodeProtocol.requestIsAwaitingFulfillment(expectedRequestId)).to.equal(true);
              });
            });
            context('Function selector is zero', function () {
              it('reverts', async function () {
                await expect(
                  airnodeRequester.makeRequestRelayed(
                    airnodeAddress,
                    templateId,
                    requestParameters,
                    relayerAddress,
                    roles.sponsor.address,
                    '0x00000000'
                  )
                ).to.be.revertedWith('Fulfill function ID zero');
              });
            });
          });
          context('Sponsor address is zero', function () {
            it('reverts', async function () {
              await expect(
                airnodeRequester.makeRequestRelayed(
                  airnodeAddress,
                  templateId,
                  requestParameters,
                  relayerAddress,
                  hre.ethers.constants.AddressZero,
                  airnodeRequester.interface.getSighash('fulfillRequest')
                )
              ).to.be.revertedWith('Sponsor address zero');
            });
          });
        });
        context('Relayer address is zero', function () {
          it('reverts', async function () {
            await expect(
              airnodeRequester.makeRequestRelayed(
                airnodeAddress,
                templateId,
                requestParameters,
                hre.ethers.constants.AddressZero,
                roles.sponsor.address,
                airnodeRequester.interface.getSighash('fulfillRequest')
              )
            ).to.be.revertedWith('Relayer address zero');
          });
        });
      });
      context('Parameters are too long', function () {
        it('reverts', async function () {
          await expect(
            airnodeRequester.makeRequestRelayed(
              airnodeAddress,
              templateId,
              `0x${'01'.repeat(4096 + 1)}`,
              relayerAddress,
              roles.sponsor.address,
              airnodeRequester.interface.getSighash('fulfillRequest')
            )
          ).to.be.revertedWith('Parameters too long');
        });
      });
    });
    context('Template ID is zero', function () {
      it('reverts', async function () {
        await expect(
          airnodeRequester.makeRequestRelayed(
            airnodeAddress,
            hre.ethers.constants.HashZero,
            requestParameters,
            relayerAddress,
            roles.sponsor.address,
            airnodeRequester.interface.getSighash('fulfillRequest')
          )
        ).to.be.revertedWith('Template ID zero');
      });
    });
  });
  context('Airnode address is zero', function () {
    it('reverts', async function () {
      await expect(
        airnodeRequester.makeRequestRelayed(
          hre.ethers.constants.AddressZero,
          templateId,
          requestParameters,
          relayerAddress,
          roles.sponsor.address,
          airnodeRequester.interface.getSighash('fulfillRequest')
        )
      ).to.be.revertedWith('Airnode address zero');
    });
  });
});

describe('fulfillRequestRelayed', function () {
  context('Fulfillment parameters are correct', function () {
    context('Signature is valid', function () {
      context('Fulfill function does not revert', function () {
        it('returns `true` and fulfills request', async function () {
          const requestId = await deriveExpectedRelayedRequestId(
            airnodeRequester.interface.getSighash('fulfillRequest')
          );
          await airnodeRequester.makeRequestRelayed(
            airnodeAddress,
            templateId,
            requestParameters,
            relayerAddress,
            roles.sponsor.address,
            airnodeRequester.interface.getSighash('fulfillRequest')
          );
          const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
          const data = hre.ethers.utils.keccak256(
            hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello'])
          );
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  ['bytes32', 'uint256', 'address', 'bytes'],
                  [requestId, timestamp, relayerSponsorWallet.address, data]
                )
              )
            )
          );
          const staticCallResult = await airnodeProtocol
            .connect(relayerSponsorWallet)
            .callStatic.fulfillRequestRelayed(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              relayerAddress,
              airnodeRequester.interface.getSighash('fulfillRequest'),
              timestamp,
              data,
              signature,
              { gasLimit: 500000 }
            );
          expect(staticCallResult.callSuccess).to.equal(true);
          expect(staticCallResult.callData).to.equal('0x');
          await expect(
            airnodeProtocol
              .connect(relayerSponsorWallet)
              .fulfillRequestRelayed(
                requestId,
                airnodeAddress,
                airnodeRequester.address,
                relayerAddress,
                airnodeRequester.interface.getSighash('fulfillRequest'),
                timestamp,
                data,
                signature,
                { gasLimit: 500000 }
              )
          )
            .to.emit(airnodeProtocol, 'FulfilledRequestRelayed')
            .withArgs(relayerAddress, requestId, airnodeAddress, timestamp, data);
          expect(await airnodeProtocol.requestIsAwaitingFulfillment(requestId)).to.equal(false);
          expect(await airnodeRequester.requestIdToData(requestId)).to.equal(data);
          // Should revert the second fulfillment attempt
          await expect(
            airnodeProtocol
              .connect(relayerSponsorWallet)
              .fulfillRequestRelayed(
                requestId,
                airnodeAddress,
                airnodeRequester.address,
                relayerAddress,
                airnodeRequester.interface.getSighash('fulfillRequest'),
                timestamp,
                data,
                signature,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill function reverts with string', function () {
        it('returns `false` with revert string and fails', async function () {
          const requestId = await deriveExpectedRelayedRequestId(
            airnodeRequester.interface.getSighash('fulfillRequestAlwaysReverts')
          );
          await airnodeRequester.makeRequestRelayed(
            airnodeAddress,
            templateId,
            requestParameters,
            relayerAddress,
            roles.sponsor.address,
            airnodeRequester.interface.getSighash('fulfillRequestAlwaysReverts')
          );
          const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
          const data = hre.ethers.utils.keccak256(
            hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello'])
          );
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  ['bytes32', 'uint256', 'address', 'bytes'],
                  [requestId, timestamp, relayerSponsorWallet.address, data]
                )
              )
            )
          );
          const staticCallResult = await airnodeProtocol
            .connect(relayerSponsorWallet)
            .callStatic.fulfillRequestRelayed(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              relayerAddress,
              airnodeRequester.interface.getSighash('fulfillRequestAlwaysReverts'),
              timestamp,
              data,
              signature,
              { gasLimit: 500000 }
            );
          expect(staticCallResult.callSuccess).to.equal(false);
          expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('Always reverts');
          await expect(
            airnodeProtocol
              .connect(relayerSponsorWallet)
              .fulfillRequestRelayed(
                requestId,
                airnodeAddress,
                airnodeRequester.address,
                relayerAddress,
                airnodeRequester.interface.getSighash('fulfillRequestAlwaysReverts'),
                timestamp,
                data,
                signature,
                { gasLimit: 500000 }
              )
          )
            .to.emit(airnodeProtocol, 'FailedRequestRelayed')
            .withArgs(relayerAddress, requestId, airnodeAddress, timestamp, 'Fulfillment failed unexpectedly');
          expect(await airnodeProtocol.requestIsAwaitingFulfillment(requestId)).to.equal(false);
          expect(await airnodeRequester.requestIdToData(requestId)).to.equal('0x');
          // Should revert the second fulfillment attempt
          await expect(
            airnodeProtocol
              .connect(relayerSponsorWallet)
              .fulfillRequestRelayed(
                requestId,
                airnodeAddress,
                airnodeRequester.address,
                relayerAddress,
                airnodeRequester.interface.getSighash('fulfillRequestAlwaysReverts'),
                timestamp,
                data,
                signature,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill function reverts without string', function () {
        it('returns `false` without revert string and fails', async function () {
          const requestId = await deriveExpectedRelayedRequestId(
            airnodeRequester.interface.getSighash('fulfillRequestAlwaysRevertsWithNoString')
          );
          await airnodeRequester.makeRequestRelayed(
            airnodeAddress,
            templateId,
            requestParameters,
            relayerAddress,
            roles.sponsor.address,
            airnodeRequester.interface.getSighash('fulfillRequestAlwaysRevertsWithNoString')
          );
          const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
          const data = hre.ethers.utils.keccak256(
            hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello'])
          );
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  ['bytes32', 'uint256', 'address', 'bytes'],
                  [requestId, timestamp, relayerSponsorWallet.address, data]
                )
              )
            )
          );
          const staticCallResult = await airnodeProtocol
            .connect(relayerSponsorWallet)
            .callStatic.fulfillRequestRelayed(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              relayerAddress,
              airnodeRequester.interface.getSighash('fulfillRequestAlwaysRevertsWithNoString'),
              timestamp,
              data,
              signature,
              { gasLimit: 500000 }
            );
          expect(staticCallResult.callSuccess).to.equal(false);
          expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('No revert string');
          await expect(
            airnodeProtocol
              .connect(relayerSponsorWallet)
              .fulfillRequestRelayed(
                requestId,
                airnodeAddress,
                airnodeRequester.address,
                relayerAddress,
                airnodeRequester.interface.getSighash('fulfillRequestAlwaysRevertsWithNoString'),
                timestamp,
                data,
                signature,
                { gasLimit: 500000 }
              )
          )
            .to.emit(airnodeProtocol, 'FailedRequestRelayed')
            .withArgs(relayerAddress, requestId, airnodeAddress, timestamp, 'Fulfillment failed unexpectedly');
          expect(await airnodeProtocol.requestIsAwaitingFulfillment(requestId)).to.equal(false);
          expect(await airnodeRequester.requestIdToData(requestId)).to.equal('0x');
          // Should revert the second fulfillment attempt
          await expect(
            airnodeProtocol
              .connect(relayerSponsorWallet)
              .fulfillRequestRelayed(
                requestId,
                airnodeAddress,
                airnodeRequester.address,
                relayerAddress,
                airnodeRequester.interface.getSighash('fulfillRequestAlwaysRevertsWithNoString'),
                timestamp,
                data,
                signature,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
      context('Fulfill function runs out of gas', function () {
        it('returns `false` without revert string and fails', async function () {
          const requestId = await deriveExpectedRelayedRequestId(
            airnodeRequester.interface.getSighash('fulfillRequestAlwaysRunsOutOfGas')
          );
          await airnodeRequester.makeRequestRelayed(
            airnodeAddress,
            templateId,
            requestParameters,
            relayerAddress,
            roles.sponsor.address,
            airnodeRequester.interface.getSighash('fulfillRequestAlwaysRunsOutOfGas')
          );
          const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
          const data = hre.ethers.utils.keccak256(
            hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello'])
          );
          const signature = await airnodeWallet.signMessage(
            hre.ethers.utils.arrayify(
              hre.ethers.utils.keccak256(
                hre.ethers.utils.solidityPack(
                  ['bytes32', 'uint256', 'address', 'bytes'],
                  [requestId, timestamp, relayerSponsorWallet.address, data]
                )
              )
            )
          );
          const staticCallResult = await airnodeProtocol
            .connect(relayerSponsorWallet)
            .callStatic.fulfillRequestRelayed(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              relayerAddress,
              airnodeRequester.interface.getSighash('fulfillRequestAlwaysRunsOutOfGas'),
              timestamp,
              data,
              signature,
              { gasLimit: 500000 }
            );
          expect(staticCallResult.callSuccess).to.equal(false);
          expect(testUtils.decodeRevertString(staticCallResult.callData)).to.equal('No revert string');
          await expect(
            airnodeProtocol
              .connect(relayerSponsorWallet)
              .fulfillRequestRelayed(
                requestId,
                airnodeAddress,
                airnodeRequester.address,
                relayerAddress,
                airnodeRequester.interface.getSighash('fulfillRequestAlwaysRunsOutOfGas'),
                timestamp,
                data,
                signature,
                { gasLimit: 500000 }
              )
          )
            .to.emit(airnodeProtocol, 'FailedRequestRelayed')
            .withArgs(relayerAddress, requestId, airnodeAddress, timestamp, 'Fulfillment failed unexpectedly');
          expect(await airnodeProtocol.requestIsAwaitingFulfillment(requestId)).to.equal(false);
          expect(await airnodeRequester.requestIdToData(requestId)).to.equal('0x');
          // Should revert the second fulfillment attempt
          await expect(
            airnodeProtocol
              .connect(relayerSponsorWallet)
              .fulfillRequestRelayed(
                requestId,
                airnodeAddress,
                airnodeRequester.address,
                relayerAddress,
                airnodeRequester.interface.getSighash('fulfillRequestAlwaysRunsOutOfGas'),
                timestamp,
                data,
                signature,
                { gasLimit: 500000 }
              )
          ).to.be.revertedWith('Invalid request fulfillment');
        });
      });
    });
    context('Signature is not valid', function () {
      it('reverts', async function () {
        const requestId = await deriveExpectedRelayedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
        await airnodeRequester.makeRequestRelayed(
          airnodeAddress,
          templateId,
          requestParameters,
          relayerAddress,
          roles.sponsor.address,
          airnodeRequester.interface.getSighash('fulfillRequest')
        );
        const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
        const data = hre.ethers.utils.keccak256(
          hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello'])
        );
        const differentSignature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                ['bytes32', 'uint256', 'address', 'bytes'],
                [testUtils.generateRandomBytes32(), timestamp, relayerSponsorWallet.address, data]
              )
            )
          )
        );
        await expect(
          airnodeProtocol
            .connect(relayerSponsorWallet)
            .fulfillRequestRelayed(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              relayerAddress,
              airnodeRequester.interface.getSighash('fulfillRequest'),
              timestamp,
              data,
              differentSignature,
              { gasLimit: 500000 }
            )
        ).to.be.revertedWith('Signature mismatch');
        const invalidSignature = '0x12345678';
        await expect(
          airnodeProtocol
            .connect(relayerSponsorWallet)
            .fulfillRequestRelayed(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              relayerAddress,
              airnodeRequester.interface.getSighash('fulfillRequest'),
              timestamp,
              data,
              invalidSignature,
              { gasLimit: 500000 }
            )
        ).to.be.revertedWith('ECDSA: invalid signature length');
      });
    });
  });
  context('Request ID is not correct', function () {
    it('reverts', async function () {
      const requestId = await deriveExpectedRelayedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
      await airnodeRequester.makeRequestRelayed(
        airnodeAddress,
        templateId,
        requestParameters,
        relayerAddress,
        roles.sponsor.address,
        airnodeRequester.interface.getSighash('fulfillRequest')
      );
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const data = hre.ethers.utils.keccak256(
        hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello'])
      );
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address', 'bytes'],
              [requestId, timestamp, relayerSponsorWallet.address, data]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(relayerSponsorWallet)
          .fulfillRequestRelayed(
            testUtils.generateRandomBytes32(),
            airnodeAddress,
            airnodeRequester.address,
            relayerAddress,
            airnodeRequester.interface.getSighash('fulfillRequest'),
            timestamp,
            data,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Invalid request fulfillment');
    });
  });
  context('Airnode address is not correct', function () {
    it('reverts', async function () {
      const requestId = await deriveExpectedRelayedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
      await airnodeRequester.makeRequestRelayed(
        airnodeAddress,
        templateId,
        requestParameters,
        relayerAddress,
        roles.sponsor.address,
        airnodeRequester.interface.getSighash('fulfillRequest')
      );
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const data = hre.ethers.utils.keccak256(
        hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello'])
      );
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address', 'bytes'],
              [requestId, timestamp, relayerSponsorWallet.address, data]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(relayerSponsorWallet)
          .fulfillRequestRelayed(
            requestId,
            testUtils.generateRandomAddress(),
            airnodeRequester.address,
            relayerAddress,
            airnodeRequester.interface.getSighash('fulfillRequest'),
            timestamp,
            data,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Invalid request fulfillment');
    });
  });
  context('Requester address is not correct', function () {
    it('reverts', async function () {
      const requestId = await deriveExpectedRelayedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
      await airnodeRequester.makeRequestRelayed(
        airnodeAddress,
        templateId,
        requestParameters,
        relayerAddress,
        roles.sponsor.address,
        airnodeRequester.interface.getSighash('fulfillRequest')
      );
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const data = hre.ethers.utils.keccak256(
        hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello'])
      );
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address', 'bytes'],
              [requestId, timestamp, relayerSponsorWallet.address, data]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(relayerSponsorWallet)
          .fulfillRequestRelayed(
            requestId,
            airnodeAddress,
            testUtils.generateRandomAddress(),
            relayerAddress,
            airnodeRequester.interface.getSighash('fulfillRequest'),
            timestamp,
            data,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Invalid request fulfillment');
    });
  });
  context('Relayer address is not correct', function () {
    it('reverts', async function () {
      const requestId = await deriveExpectedRelayedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
      await airnodeRequester.makeRequestRelayed(
        airnodeAddress,
        templateId,
        requestParameters,
        relayerAddress,
        roles.sponsor.address,
        airnodeRequester.interface.getSighash('fulfillRequest')
      );
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const data = hre.ethers.utils.keccak256(
        hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello'])
      );
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address', 'bytes'],
              [requestId, timestamp, relayerSponsorWallet.address, data]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(relayerSponsorWallet)
          .fulfillRequestRelayed(
            requestId,
            airnodeAddress,
            airnodeRequester.address,
            testUtils.generateRandomAddress(),
            airnodeRequester.interface.getSighash('fulfillRequest'),
            timestamp,
            data,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Invalid request fulfillment');
    });
  });
  context('Fulfill function ID is not correct', function () {
    it('reverts', async function () {
      const requestId = await deriveExpectedRelayedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
      await airnodeRequester.makeRequestRelayed(
        airnodeAddress,
        templateId,
        requestParameters,
        relayerAddress,
        roles.sponsor.address,
        airnodeRequester.interface.getSighash('fulfillRequest')
      );
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const data = hre.ethers.utils.keccak256(
        hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'string'], ['123456', 'hello'])
      );
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address', 'bytes'],
              [requestId, timestamp, relayerSponsorWallet.address, data]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(relayerSponsorWallet)
          .fulfillRequestRelayed(
            requestId,
            airnodeAddress,
            airnodeRequester.address,
            relayerAddress,
            airnodeRequester.interface.getSighash('fulfillRequestAlwaysReverts'),
            timestamp,
            data,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Invalid request fulfillment');
    });
  });
});

describe('failRequestRelayed', function () {
  context('Fulfillment parameters are correct', function () {
    context('Signature is valid', function () {
      it('fails request with an error message', async function () {
        const requestId = await deriveExpectedRelayedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
        await airnodeRequester.makeRequestRelayed(
          airnodeAddress,
          templateId,
          requestParameters,
          relayerAddress,
          roles.sponsor.address,
          airnodeRequester.interface.getSighash('fulfillRequest')
        );
        const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
        const errorMessage = 'Thing went wrong';
        const signature = await relayerWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                ['bytes32', 'uint256', 'address'],
                [requestId, timestamp, relayerSponsorWallet.address]
              )
            )
          )
        );
        await expect(
          airnodeProtocol
            .connect(relayerSponsorWallet)
            .failRequestRelayed(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              relayerAddress,
              airnodeRequester.interface.getSighash('fulfillRequest'),
              timestamp,
              errorMessage,
              signature,
              { gasLimit: 500000 }
            )
        )
          .to.emit(airnodeProtocol, 'FailedRequestRelayed')
          .withArgs(relayerAddress, requestId, airnodeAddress, timestamp, errorMessage);
        // Should revert the second failure attempt
        await expect(
          airnodeProtocol
            .connect(relayerSponsorWallet)
            .failRequestRelayed(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              relayerAddress,
              airnodeRequester.interface.getSighash('fulfillRequest'),
              timestamp,
              errorMessage,
              signature,
              { gasLimit: 500000 }
            )
        ).to.be.revertedWith('Invalid request fulfillment');
      });
    });
    context('Signature is not valid', function () {
      it('reverts', async function () {
        const requestId = await deriveExpectedRelayedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
        await airnodeRequester.makeRequestRelayed(
          airnodeAddress,
          templateId,
          requestParameters,
          relayerAddress,
          roles.sponsor.address,
          airnodeRequester.interface.getSighash('fulfillRequest')
        );
        const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
        const errorMessage = 'Thing went wrong';
        const differentSignature = await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(
                ['bytes32', 'uint256', 'address'],
                [testUtils.generateRandomBytes32(), timestamp, relayerSponsorWallet.address]
              )
            )
          )
        );
        await expect(
          airnodeProtocol
            .connect(relayerSponsorWallet)
            .failRequestRelayed(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              relayerAddress,
              airnodeRequester.interface.getSighash('fulfillRequest'),
              timestamp,
              errorMessage,
              differentSignature,
              { gasLimit: 500000 }
            )
        ).to.be.revertedWith('Signature mismatch');
        const invalidSignature = '0x12345678';
        await expect(
          airnodeProtocol
            .connect(relayerSponsorWallet)
            .failRequestRelayed(
              requestId,
              airnodeAddress,
              airnodeRequester.address,
              relayerAddress,
              airnodeRequester.interface.getSighash('fulfillRequest'),
              timestamp,
              errorMessage,
              invalidSignature,
              { gasLimit: 500000 }
            )
        ).to.be.revertedWith('ECDSA: invalid signature length');
      });
    });
  });
  context('Request ID is not correct', function () {
    it('reverts', async function () {
      const requestId = await deriveExpectedRelayedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
      await airnodeRequester.makeRequestRelayed(
        airnodeAddress,
        templateId,
        requestParameters,
        relayerAddress,
        roles.sponsor.address,
        airnodeRequester.interface.getSighash('fulfillRequest')
      );
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const errorMessage = 'Thing went wrong';
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address'],
              [requestId, timestamp, relayerSponsorWallet.address]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(relayerSponsorWallet)
          .failRequestRelayed(
            testUtils.generateRandomBytes32(),
            airnodeAddress,
            airnodeRequester.address,
            relayerAddress,
            airnodeRequester.interface.getSighash('fulfillRequest'),
            timestamp,
            errorMessage,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Invalid request fulfillment');
    });
  });
  context('Airnode address is not correct', function () {
    it('reverts', async function () {
      const requestId = await deriveExpectedRelayedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
      await airnodeRequester.makeRequestRelayed(
        airnodeAddress,
        templateId,
        requestParameters,
        relayerAddress,
        roles.sponsor.address,
        airnodeRequester.interface.getSighash('fulfillRequest')
      );
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const errorMessage = 'Thing went wrong';
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address'],
              [requestId, timestamp, relayerSponsorWallet.address]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(relayerSponsorWallet)
          .failRequestRelayed(
            requestId,
            testUtils.generateRandomAddress(),
            airnodeRequester.address,
            relayerAddress,
            airnodeRequester.interface.getSighash('fulfillRequest'),
            timestamp,
            errorMessage,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Invalid request fulfillment');
    });
  });
  context('Requester address is not correct', function () {
    it('reverts', async function () {
      const requestId = await deriveExpectedRelayedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
      await airnodeRequester.makeRequestRelayed(
        airnodeAddress,
        templateId,
        requestParameters,
        relayerAddress,
        roles.sponsor.address,
        airnodeRequester.interface.getSighash('fulfillRequest')
      );
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const errorMessage = 'Thing went wrong';
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address'],
              [requestId, timestamp, relayerSponsorWallet.address]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(relayerSponsorWallet)
          .failRequestRelayed(
            requestId,
            airnodeAddress,
            testUtils.generateRandomAddress(),
            relayerAddress,
            airnodeRequester.interface.getSighash('fulfillRequest'),
            timestamp,
            errorMessage,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Invalid request fulfillment');
    });
  });
  context('Relayer address is not correct', function () {
    it('reverts', async function () {
      const requestId = await deriveExpectedRelayedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
      await airnodeRequester.makeRequestRelayed(
        airnodeAddress,
        templateId,
        requestParameters,
        relayerAddress,
        roles.sponsor.address,
        airnodeRequester.interface.getSighash('fulfillRequest')
      );
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const errorMessage = 'Thing went wrong';
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address'],
              [requestId, timestamp, relayerSponsorWallet.address]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(relayerSponsorWallet)
          .failRequestRelayed(
            requestId,
            airnodeAddress,
            airnodeRequester.address,
            testUtils.generateRandomAddress(),
            airnodeRequester.interface.getSighash('fulfillRequest'),
            timestamp,
            errorMessage,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Invalid request fulfillment');
    });
  });
  context('Fulfill function ID is not correct', function () {
    it('reverts', async function () {
      const requestId = await deriveExpectedRelayedRequestId(airnodeRequester.interface.getSighash('fulfillRequest'));
      await airnodeRequester.makeRequestRelayed(
        airnodeAddress,
        templateId,
        requestParameters,
        relayerAddress,
        roles.sponsor.address,
        airnodeRequester.interface.getSighash('fulfillRequest')
      );
      const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
      const errorMessage = 'Thing went wrong';
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(
              ['bytes32', 'uint256', 'address'],
              [requestId, timestamp, relayerSponsorWallet.address]
            )
          )
        )
      );
      await expect(
        airnodeProtocol
          .connect(relayerSponsorWallet)
          .failRequestRelayed(
            requestId,
            airnodeAddress,
            airnodeRequester.address,
            relayerAddress,
            airnodeRequester.interface.getSighash('fulfillRequestAlwaysReverts'),
            timestamp,
            errorMessage,
            signature,
            { gasLimit: 500000 }
          )
      ).to.be.revertedWith('Invalid request fulfillment');
    });
  });
});
