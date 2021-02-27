const { expect } = require('chai');

let airnode, airnodeClient;
let roles;
const requesterIndex = 1;
let providerId, masterWallet, designatedWallet;
const endpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const templateParameters = ethers.utils.hexlify(ethers.utils.randomBytes(320));
let templateId;
const requestTimeParameters = ethers.utils.hexlify(ethers.utils.randomBytes(128));
let fulfillAddress, fulfillFunctionId;
const fulfillStatusCode = 0;
const fulfillData = ethers.utils.hexlify(ethers.utils.randomBytes(32));

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    providerAdmin: accounts[1],
    requesterAdmin: accounts[2],
    clientUser: accounts[3],
    randomPerson: accounts[9],
  };
  const airnodeFactory = await ethers.getContractFactory('Airnode', roles.deployer);
  airnode = await airnodeFactory.deploy();
  const airnodeClientFactory = await ethers.getContractFactory('MockAirnodeClient', roles.deployer);
  airnodeClient = await airnodeClientFactory.deploy(airnode.address);
  // Create the requester
  await airnode.connect(roles.requesterAdmin).createRequester(roles.requesterAdmin.address);
  // Generate the provider private key and derive the related parameters
  const providerWallet = ethers.Wallet.createRandom();
  const providerMnemonic = providerWallet.mnemonic.phrase;
  const hdNode = ethers.utils.HDNode.fromMnemonic(providerMnemonic);
  masterWallet = new ethers.Wallet(hdNode.privateKey, waffle.provider);
  providerId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [masterWallet.address]));
  designatedWallet = ethers.Wallet.fromMnemonic(providerMnemonic, `m/0/${requesterIndex}`).connect(waffle.provider);
  // Fund the provider master wallet for it to be able to create the provider
  await roles.providerAdmin.sendTransaction({
    to: masterWallet.address,
    value: ethers.utils.parseEther('1'),
  });
  // Fund the designated wallet so that it can be withdrawn from
  await roles.requesterAdmin.sendTransaction({
    to: designatedWallet.address,
    value: ethers.utils.parseEther('1'),
  });
  // Create the template
  await airnode.createTemplate(providerId, endpointId, templateParameters);
  templateId = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes32', 'bytes'], [providerId, endpointId, templateParameters])
  );
  fulfillAddress = airnodeClient.address;
  fulfillFunctionId = airnodeClient.interface.getSighash('fulfill');
});

describe('makeRequest', function () {
  context('Client is endorsed by requester', async function () {
    it('makes a regular request', async function () {
      // Have the requester endorse the client
      await airnode
        .connect(roles.requesterAdmin)
        .setClientEndorsementStatus(requesterIndex, airnodeClient.address, true);
      // Calculate the expected request ID
      const clientRequestNonce = await airnode.clientAddressToNoRequests(airnodeClient.address);
      const requestId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['uint256', 'address', 'bytes32', 'bytes'],
          [clientRequestNonce, airnodeClient.address, templateId, requestTimeParameters]
        )
      );
      // Make the request
      await expect(
        airnodeClient
          .connect(roles.clientUser)
          .makeRequest(
            templateId,
            requesterIndex,
            designatedWallet.address,
            fulfillAddress,
            fulfillFunctionId,
            requestTimeParameters
          )
      )
        .to.emit(airnode, 'ClientRequestCreated')
        .withArgs(
          providerId,
          requestId,
          clientRequestNonce,
          airnodeClient.address,
          templateId,
          requesterIndex,
          designatedWallet.address,
          fulfillAddress,
          fulfillFunctionId,
          requestTimeParameters
        );
    });
  });
  context('Client is not endorsed by requester', async function () {
    it('reverts', async function () {
      await expect(
        airnodeClient
          .connect(roles.clientUser)
          .makeRequest(
            templateId,
            requesterIndex,
            designatedWallet.address,
            fulfillAddress,
            fulfillFunctionId,
            requestTimeParameters
          )
      ).to.be.revertedWith('Client not endorsed by requester');
    });
  });
});

describe('makeFullRequest', function () {
  context('Client is endorsed by requester', async function () {
    it('makes a full request', async function () {
      // Have the requester endorse the client
      await airnode
        .connect(roles.requesterAdmin)
        .setClientEndorsementStatus(requesterIndex, airnodeClient.address, true);
      // Calculate the expected request ID
      const clientRequestNonce = await airnode.clientAddressToNoRequests(airnodeClient.address);
      const requestId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['uint256', 'address', 'bytes32', 'bytes'],
          [clientRequestNonce, airnodeClient.address, endpointId, requestTimeParameters]
        )
      );
      // Make the request
      await expect(
        airnodeClient
          .connect(roles.clientUser)
          .makeFullRequest(
            providerId,
            endpointId,
            requesterIndex,
            designatedWallet.address,
            fulfillAddress,
            fulfillFunctionId,
            requestTimeParameters
          )
      )
        .to.emit(airnode, 'ClientFullRequestCreated')
        .withArgs(
          providerId,
          requestId,
          clientRequestNonce,
          airnodeClient.address,
          endpointId,
          requesterIndex,
          designatedWallet.address,
          fulfillAddress,
          fulfillFunctionId,
          requestTimeParameters
        );
    });
  });
  context('Client is not endorsed by requester', async function () {
    it('reverts', async function () {
      await expect(
        airnodeClient
          .connect(roles.clientUser)
          .makeFullRequest(
            providerId,
            endpointId,
            requesterIndex,
            designatedWallet.address,
            fulfillAddress,
            fulfillFunctionId,
            requestTimeParameters
          )
      ).to.be.revertedWith('Client not endorsed by requester');
    });
  });
});

describe('fulfill', function () {
  context('Regular request has been made', async function () {
    context('Fulfillment parameters are correct', async function () {
      it('fulfills', async function () {
        // Have the requester endorse the client
        await airnode
          .connect(roles.requesterAdmin)
          .setClientEndorsementStatus(requesterIndex, airnodeClient.address, true);
        // Calculate the expected request ID
        const clientRequestNonce = await airnode.clientAddressToNoRequests(airnodeClient.address);
        const requestId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'address', 'bytes32', 'bytes'],
            [clientRequestNonce, airnodeClient.address, templateId, requestTimeParameters]
          )
        );
        // Make the request
        await airnodeClient
          .connect(roles.clientUser)
          .makeRequest(
            templateId,
            requesterIndex,
            designatedWallet.address,
            fulfillAddress,
            fulfillFunctionId,
            requestTimeParameters
          );
        // Fulfill the request
        await expect(
          airnode
            .connect(designatedWallet)
            .fulfill(requestId, providerId, fulfillStatusCode, fulfillData, fulfillAddress, fulfillFunctionId, {
              gasLimit: 500000,
            })
        )
          .to.emit(airnode, 'ClientRequestFulfilled')
          .withArgs(providerId, requestId, fulfillStatusCode, fulfillData);
      });
    });
    context('Fulfillment parameters are incorrect', async function () {
      it('reverts', async function () {
        // Have the requester endorse the client
        await airnode
          .connect(roles.requesterAdmin)
          .setClientEndorsementStatus(requesterIndex, airnodeClient.address, true);
        // Calculate the expected request ID
        const clientRequestNonce = await airnode.clientAddressToNoRequests(airnodeClient.address);
        const requestId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'address', 'bytes32', 'bytes'],
            [clientRequestNonce, airnodeClient.address, templateId, requestTimeParameters]
          )
        );
        // Make the request
        await airnodeClient
          .connect(roles.clientUser)
          .makeRequest(
            templateId,
            requesterIndex,
            designatedWallet.address,
            fulfillAddress,
            fulfillFunctionId,
            requestTimeParameters
          );
        // Attempt to fulfill the request
        const falseRequestId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
        await expect(
          airnode
            .connect(designatedWallet)
            .fulfill(falseRequestId, providerId, fulfillStatusCode, fulfillData, fulfillAddress, fulfillFunctionId, {
              gasLimit: 500000,
            })
        ).to.be.revertedWith('Incorrect fulfillment parameters');
        // Attempt to fulfill the request
        const falseProviderId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
        await expect(
          airnode
            .connect(designatedWallet)
            .fulfill(requestId, falseProviderId, fulfillStatusCode, fulfillData, fulfillAddress, fulfillFunctionId, {
              gasLimit: 500000,
            })
        ).to.be.revertedWith('Incorrect fulfillment parameters');
        // Attempt to fulfill the request
        const falseFulfillAddress = ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));
        await expect(
          airnode
            .connect(designatedWallet)
            .fulfill(requestId, providerId, fulfillStatusCode, fulfillData, falseFulfillAddress, fulfillFunctionId, {
              gasLimit: 500000,
            })
        ).to.be.revertedWith('Incorrect fulfillment parameters');
        // Attempt to fulfill the request
        const falseFulfillFunctionId = ethers.utils.hexlify(ethers.utils.randomBytes(4));
        await expect(
          airnode
            .connect(designatedWallet)
            .fulfill(requestId, providerId, fulfillStatusCode, fulfillData, fulfillAddress, falseFulfillFunctionId, {
              gasLimit: 500000,
            })
        ).to.be.revertedWith('Incorrect fulfillment parameters');
      });
    });
    context('Fulfilling wallet is incorrect', async function () {
      it('reverts', async function () {
        // Have the requester endorse the client
        await airnode
          .connect(roles.requesterAdmin)
          .setClientEndorsementStatus(requesterIndex, airnodeClient.address, true);
        // Calculate the expected request ID
        const clientRequestNonce = await airnode.clientAddressToNoRequests(airnodeClient.address);
        const requestId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'address', 'bytes32', 'bytes'],
            [clientRequestNonce, airnodeClient.address, templateId, requestTimeParameters]
          )
        );
        // Make the request
        await airnodeClient
          .connect(roles.clientUser)
          .makeRequest(
            templateId,
            requesterIndex,
            designatedWallet.address,
            fulfillAddress,
            fulfillFunctionId,
            requestTimeParameters
          );
        // Attempt to fulfill the request
        await expect(
          airnode
            .connect(roles.randomPerson)
            .fulfill(requestId, providerId, fulfillStatusCode, fulfillData, fulfillAddress, fulfillFunctionId, {
              gasLimit: 500000,
            })
        ).to.be.revertedWith('Incorrect fulfillment parameters');
      });
    });
    context('Full request has been made', async function () {
      context('Fulfillment parameters are correct', async function () {
        it('fulfills', async function () {
          // Have the requester endorse the client
          await airnode
            .connect(roles.requesterAdmin)
            .setClientEndorsementStatus(requesterIndex, airnodeClient.address, true);
          // Calculate the expected request ID
          const clientRequestNonce = await airnode.clientAddressToNoRequests(airnodeClient.address);
          const requestId = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              ['uint256', 'address', 'bytes32', 'bytes'],
              [clientRequestNonce, airnodeClient.address, endpointId, requestTimeParameters]
            )
          );
          // Make the request
          await airnodeClient
            .connect(roles.clientUser)
            .makeFullRequest(
              providerId,
              endpointId,
              requesterIndex,
              designatedWallet.address,
              fulfillAddress,
              fulfillFunctionId,
              requestTimeParameters
            );
          // Fulfill the request
          await expect(
            airnode
              .connect(designatedWallet)
              .fulfill(requestId, providerId, fulfillStatusCode, fulfillData, fulfillAddress, fulfillFunctionId, {
                gasLimit: 500000,
              })
          )
            .to.emit(airnode, 'ClientRequestFulfilled')
            .withArgs(providerId, requestId, fulfillStatusCode, fulfillData);
        });
      });
      context('Fulfillment parameters are incorrect', async function () {
        it('reverts', async function () {
          // Have the requester endorse the client
          await airnode
            .connect(roles.requesterAdmin)
            .setClientEndorsementStatus(requesterIndex, airnodeClient.address, true);
          // Calculate the expected request ID
          const clientRequestNonce = await airnode.clientAddressToNoRequests(airnodeClient.address);
          const requestId = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              ['uint256', 'address', 'bytes32', 'bytes'],
              [clientRequestNonce, airnodeClient.address, endpointId, requestTimeParameters]
            )
          );
          // Make the request
          await airnodeClient
            .connect(roles.clientUser)
            .makeFullRequest(
              providerId,
              endpointId,
              requesterIndex,
              designatedWallet.address,
              fulfillAddress,
              fulfillFunctionId,
              requestTimeParameters
            );
          // Attempt to fulfill the request
          const falseRequestId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
          await expect(
            airnode
              .connect(designatedWallet)
              .fulfill(falseRequestId, providerId, fulfillStatusCode, fulfillData, fulfillAddress, fulfillFunctionId, {
                gasLimit: 500000,
              })
          ).to.be.revertedWith('Incorrect fulfillment parameters');
          // Attempt to fulfill the request
          const falseProviderId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
          await expect(
            airnode
              .connect(designatedWallet)
              .fulfill(requestId, falseProviderId, fulfillStatusCode, fulfillData, fulfillAddress, fulfillFunctionId, {
                gasLimit: 500000,
              })
          ).to.be.revertedWith('Incorrect fulfillment parameters');
          // Attempt to fulfill the request
          const falseFulfillAddress = ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));
          await expect(
            airnode
              .connect(designatedWallet)
              .fulfill(requestId, providerId, fulfillStatusCode, fulfillData, falseFulfillAddress, fulfillFunctionId, {
                gasLimit: 500000,
              })
          ).to.be.revertedWith('Incorrect fulfillment parameters');
          // Attempt to fulfill the request
          const falseFulfillFunctionId = ethers.utils.hexlify(ethers.utils.randomBytes(4));
          await expect(
            airnode
              .connect(designatedWallet)
              .fulfill(requestId, providerId, fulfillStatusCode, fulfillData, fulfillAddress, falseFulfillFunctionId, {
                gasLimit: 500000,
              })
          ).to.be.revertedWith('Incorrect fulfillment parameters');
        });
      });
      context('Fulfilling wallet is incorrect', async function () {
        it('reverts', async function () {
          // Have the requester endorse the client
          await airnode
            .connect(roles.requesterAdmin)
            .setClientEndorsementStatus(requesterIndex, airnodeClient.address, true);
          // Calculate the expected request ID
          const clientRequestNonce = await airnode.clientAddressToNoRequests(airnodeClient.address);
          const requestId = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              ['uint256', 'address', 'bytes32', 'bytes'],
              [clientRequestNonce, airnodeClient.address, endpointId, requestTimeParameters]
            )
          );
          // Make the request
          await airnodeClient
            .connect(roles.clientUser)
            .makeFullRequest(
              providerId,
              endpointId,
              requesterIndex,
              designatedWallet.address,
              fulfillAddress,
              fulfillFunctionId,
              requestTimeParameters
            );
          // Attempt to fulfill the request
          await expect(
            airnode
              .connect(roles.randomPerson)
              .fulfill(requestId, providerId, fulfillStatusCode, fulfillData, fulfillAddress, fulfillFunctionId, {
                gasLimit: 500000,
              })
          ).to.be.revertedWith('Incorrect fulfillment parameters');
        });
      });
    });
  });
});

describe('fail', function () {
  context('Regular request has been made', async function () {
    context('Fulfillment parameters are correct', async function () {
      it('fails successfully', async function () {
        // Have the requester endorse the client
        await airnode
          .connect(roles.requesterAdmin)
          .setClientEndorsementStatus(requesterIndex, airnodeClient.address, true);
        // Calculate the expected request ID
        const clientRequestNonce = await airnode.clientAddressToNoRequests(airnodeClient.address);
        const requestId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'address', 'bytes32', 'bytes'],
            [clientRequestNonce, airnodeClient.address, templateId, requestTimeParameters]
          )
        );
        // Make the request
        await airnodeClient
          .connect(roles.clientUser)
          .makeRequest(
            templateId,
            requesterIndex,
            designatedWallet.address,
            fulfillAddress,
            fulfillFunctionId,
            requestTimeParameters
          );
        // Fail the fulfillment
        await expect(
          airnode
            .connect(designatedWallet)
            .fail(requestId, providerId, fulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
        )
          .to.emit(airnode, 'ClientRequestFailed')
          .withArgs(providerId, requestId);
      });
    });
    context('Fulfillment parameters are incorrect', async function () {
      it('reverts', async function () {
        // Have the requester endorse the client
        await airnode
          .connect(roles.requesterAdmin)
          .setClientEndorsementStatus(requesterIndex, airnodeClient.address, true);
        // Calculate the expected request ID
        const clientRequestNonce = await airnode.clientAddressToNoRequests(airnodeClient.address);
        const requestId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'address', 'bytes32', 'bytes'],
            [clientRequestNonce, airnodeClient.address, templateId, requestTimeParameters]
          )
        );
        // Make the request
        await airnodeClient
          .connect(roles.clientUser)
          .makeRequest(
            templateId,
            requesterIndex,
            designatedWallet.address,
            fulfillAddress,
            fulfillFunctionId,
            requestTimeParameters
          );
        // Attempt to fail the fulfillment
        const falseRequestId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
        await expect(
          airnode
            .connect(designatedWallet)
            .fail(falseRequestId, providerId, fulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
        ).to.be.revertedWith('Incorrect fulfillment parameters');
        // Attempt to fail the fulfillment
        const falseProviderId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
        await expect(
          airnode
            .connect(designatedWallet)
            .fail(requestId, falseProviderId, fulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
        ).to.be.revertedWith('Incorrect fulfillment parameters');
        // Attempt to fail the fulfillment
        const falseFulfillAddress = ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));
        await expect(
          airnode
            .connect(designatedWallet)
            .fail(requestId, providerId, falseFulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
        ).to.be.revertedWith('Incorrect fulfillment parameters');
        // Attempt to fail the fulfillment
        const falseFulfillFunctionId = ethers.utils.hexlify(ethers.utils.randomBytes(4));
        await expect(
          airnode
            .connect(designatedWallet)
            .fail(requestId, providerId, fulfillAddress, falseFulfillFunctionId, { gasLimit: 500000 })
        ).to.be.revertedWith('Incorrect fulfillment parameters');
      });
    });
    context('Fulfilling wallet is incorrect', async function () {
      it('reverts', async function () {
        // Have the requester endorse the client
        await airnode
          .connect(roles.requesterAdmin)
          .setClientEndorsementStatus(requesterIndex, airnodeClient.address, true);
        // Calculate the expected request ID
        const clientRequestNonce = await airnode.clientAddressToNoRequests(airnodeClient.address);
        const requestId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'address', 'bytes32', 'bytes'],
            [clientRequestNonce, airnodeClient.address, templateId, requestTimeParameters]
          )
        );
        // Make the request
        await airnodeClient
          .connect(roles.clientUser)
          .makeRequest(
            templateId,
            requesterIndex,
            designatedWallet.address,
            fulfillAddress,
            fulfillFunctionId,
            requestTimeParameters
          );
        // Attempt to fail the fulfillment
        await expect(
          airnode
            .connect(roles.randomPerson)
            .fail(requestId, providerId, fulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
        ).to.be.revertedWith('Incorrect fulfillment parameters');
      });
    });
  });
  context('Full request has been made', async function () {
    context('Fulfillment parameters are correct', async function () {
      it('fails successfully', async function () {
        // Have the requester endorse the client
        await airnode
          .connect(roles.requesterAdmin)
          .setClientEndorsementStatus(requesterIndex, airnodeClient.address, true);
        // Calculate the expected request ID
        const clientRequestNonce = await airnode.clientAddressToNoRequests(airnodeClient.address);
        const requestId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'address', 'bytes32', 'bytes'],
            [clientRequestNonce, airnodeClient.address, endpointId, requestTimeParameters]
          )
        );
        // Make the request
        await airnodeClient
          .connect(roles.clientUser)
          .makeFullRequest(
            providerId,
            endpointId,
            requesterIndex,
            designatedWallet.address,
            fulfillAddress,
            fulfillFunctionId,
            requestTimeParameters
          );
        // Fail the fulfillment
        await expect(
          airnode
            .connect(designatedWallet)
            .fail(requestId, providerId, fulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
        )
          .to.emit(airnode, 'ClientRequestFailed')
          .withArgs(providerId, requestId);
      });
      context('Fulfillment parameters are incorrect', async function () {
        it('reverts', async function () {
          // Have the requester endorse the client
          await airnode
            .connect(roles.requesterAdmin)
            .setClientEndorsementStatus(requesterIndex, airnodeClient.address, true);
          // Calculate the expected request ID
          const clientRequestNonce = await airnode.clientAddressToNoRequests(airnodeClient.address);
          const requestId = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              ['uint256', 'address', 'bytes32', 'bytes'],
              [clientRequestNonce, airnodeClient.address, endpointId, requestTimeParameters]
            )
          );
          // Make the request
          await airnodeClient
            .connect(roles.clientUser)
            .makeFullRequest(
              providerId,
              endpointId,
              requesterIndex,
              designatedWallet.address,
              fulfillAddress,
              fulfillFunctionId,
              requestTimeParameters
            );
          // Attempt to fail the fulfillment
          const falseRequestId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
          await expect(
            airnode
              .connect(designatedWallet)
              .fail(falseRequestId, providerId, fulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
          ).to.be.revertedWith('Incorrect fulfillment parameters');
          // Attempt to fail the fulfillment
          const falseProviderId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
          await expect(
            airnode
              .connect(designatedWallet)
              .fail(requestId, falseProviderId, fulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
          ).to.be.revertedWith('Incorrect fulfillment parameters');
          // Attempt to fail the fulfillment
          const falseFulfillAddress = ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));
          await expect(
            airnode
              .connect(designatedWallet)
              .fail(requestId, providerId, falseFulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
          ).to.be.revertedWith('Incorrect fulfillment parameters');
          // Attempt to fail the fulfillment
          const falseFulfillFunctionId = ethers.utils.hexlify(ethers.utils.randomBytes(4));
          await expect(
            airnode
              .connect(designatedWallet)
              .fail(requestId, providerId, fulfillAddress, falseFulfillFunctionId, { gasLimit: 500000 })
          ).to.be.revertedWith('Incorrect fulfillment parameters');
        });
        context('Fulfilling wallet is incorrect', async function () {
          it('reverts', async function () {
            // Have the requester endorse the client
            await airnode
              .connect(roles.requesterAdmin)
              .setClientEndorsementStatus(requesterIndex, airnodeClient.address, true);
            // Calculate the expected request ID
            const clientRequestNonce = await airnode.clientAddressToNoRequests(airnodeClient.address);
            const requestId = ethers.utils.keccak256(
              ethers.utils.defaultAbiCoder.encode(
                ['uint256', 'address', 'bytes32', 'bytes'],
                [clientRequestNonce, airnodeClient.address, endpointId, requestTimeParameters]
              )
            );
            // Make the request
            await airnodeClient
              .connect(roles.clientUser)
              .makeFullRequest(
                providerId,
                endpointId,
                requesterIndex,
                designatedWallet.address,
                fulfillAddress,
                fulfillFunctionId,
                requestTimeParameters
              );
            // Attempt to fail the fulfillment
            await expect(
              airnode
                .connect(roles.randomPerson)
                .fail(requestId, providerId, fulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
            ).to.be.revertedWith('Incorrect fulfillment parameters');
          });
        });
      });
    });
  });
});
