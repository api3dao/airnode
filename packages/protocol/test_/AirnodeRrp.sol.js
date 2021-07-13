/* globals context ethers */

const { expect } = require('chai');

let airnodeRrp, airnodeRrpClient;
let roles;
const requesterIndex = 1;
let airnodeId, masterWallet, designatedWallet;
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
    airnodeAdmin: accounts[1],
    requesterAdmin: accounts[2],
    clientUser: accounts[3],
    randomPerson: accounts[9],
  };
  const airnodeRrpFactory = await ethers.getContractFactory('AirnodeRrp', roles.deployer);
  airnodeRrp = await airnodeRrpFactory.deploy();
  const airnodeRrpClientFactory = await ethers.getContractFactory('MockAirnodeRrpClient', roles.deployer);
  airnodeRrpClient = await airnodeRrpClientFactory.deploy(airnodeRrp.address);
  // Create the requester
  await airnodeRrp.connect(roles.requesterAdmin).createRequester(roles.requesterAdmin.address);
  // Generate the Airnode private key and derive the related parameters
  const airnodeWallet = ethers.Wallet.createRandom();
  const airnodeMnemonic = airnodeWallet.mnemonic.phrase;
  const hdNode = ethers.utils.HDNode.fromMnemonic(airnodeMnemonic);
  masterWallet = new ethers.Wallet(hdNode.privateKey, waffle.provider);
  airnodeId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [masterWallet.address]));
  designatedWallet = ethers.Wallet.fromMnemonic(airnodeMnemonic, `m/0/${requesterIndex}`).connect(waffle.provider);
  // Fund the Airnode master wallet for it to be able to set the Airnode parameters
  await roles.airnodeAdmin.sendTransaction({
    to: masterWallet.address,
    value: ethers.utils.parseEther('1'),
  });
  // Fund the designated wallet so that it can be withdrawn from
  await roles.requesterAdmin.sendTransaction({
    to: designatedWallet.address,
    value: ethers.utils.parseEther('1'),
  });
  // Create the template
  await airnodeRrp.createTemplate(airnodeId, endpointId, templateParameters);
  templateId = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes32', 'bytes'], [airnodeId, endpointId, templateParameters])
  );
  fulfillAddress = airnodeRrpClient.address;
  fulfillFunctionId = airnodeRrpClient.interface.getSighash('fulfill');
});

describe('makeRequest', function () {
  context('Client is endorsed by requester', async function () {
    it('makes a regular request', async function () {
      // Have the requester endorse the client
      await airnodeRrp
        .connect(roles.requesterAdmin)
        .setClientEndorsementStatus(requesterIndex, airnodeRrpClient.address, true);
      // Calculate the expected request ID
      const clientRequestNonce = await airnodeRrp.clientAddressToNoRequests(airnodeRrpClient.address);
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const requestId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
          [clientRequestNonce, chainId, airnodeRrpClient.address, templateId, requestTimeParameters]
        )
      );
      // Make the request
      await expect(
        airnodeRrpClient
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
        .to.emit(airnodeRrp, 'ClientRequestCreated')
        .withArgs(
          airnodeId,
          requestId,
          clientRequestNonce,
          chainId,
          airnodeRrpClient.address,
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
    it('reverts when client is not endorsed by the requester', async function () {
      await expect(
        airnodeRrpClient
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
      await airnodeRrp
        .connect(roles.requesterAdmin)
        .setClientEndorsementStatus(requesterIndex, airnodeRrpClient.address, true);
      // Calculate the expected request ID
      const clientRequestNonce = await airnodeRrp.clientAddressToNoRequests(airnodeRrpClient.address);
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const requestId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
          [clientRequestNonce, chainId, airnodeRrpClient.address, endpointId, requestTimeParameters]
        )
      );
      // Make the request
      await expect(
        airnodeRrpClient
          .connect(roles.clientUser)
          .makeFullRequest(
            airnodeId,
            endpointId,
            requesterIndex,
            designatedWallet.address,
            fulfillAddress,
            fulfillFunctionId,
            requestTimeParameters
          )
      )
        .to.emit(airnodeRrp, 'ClientFullRequestCreated')
        .withArgs(
          airnodeId,
          requestId,
          clientRequestNonce,
          chainId,
          airnodeRrpClient.address,
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
    it('reverts when client is not endorsed by the requester', async function () {
      await expect(
        airnodeRrpClient
          .connect(roles.clientUser)
          .makeFullRequest(
            airnodeId,
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
        await airnodeRrp
          .connect(roles.requesterAdmin)
          .setClientEndorsementStatus(requesterIndex, airnodeRrpClient.address, true);
        // Calculate the expected request ID
        const clientRequestNonce = await airnodeRrp.clientAddressToNoRequests(airnodeRrpClient.address);
        const chainId = (await ethers.provider.getNetwork()).chainId;
        const requestId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
            [clientRequestNonce, chainId, airnodeRrpClient.address, templateId, requestTimeParameters]
          )
        );
        // Make the request
        await airnodeRrpClient
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
          airnodeRrp
            .connect(designatedWallet)
            .fulfill(requestId, airnodeId, fulfillStatusCode, fulfillData, fulfillAddress, fulfillFunctionId, {
              gasLimit: 500000,
            })
        )
          .to.emit(airnodeRrp, 'ClientRequestFulfilled')
          .withArgs(airnodeId, requestId, fulfillStatusCode, fulfillData);
      });
    });
    context('Fulfillment parameters are incorrect', async function () {
      it('reverts when fulfillment parameters are incorrect', async function () {
        // Have the requester endorse the client
        await airnodeRrp
          .connect(roles.requesterAdmin)
          .setClientEndorsementStatus(requesterIndex, airnodeRrpClient.address, true);
        // Calculate the expected request ID
        const clientRequestNonce = await airnodeRrp.clientAddressToNoRequests(airnodeRrpClient.address);
        const chainId = (await ethers.provider.getNetwork()).chainId;
        const requestId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
            [clientRequestNonce, chainId, airnodeRrpClient.address, templateId, requestTimeParameters]
          )
        );
        // Make the request
        await airnodeRrpClient
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
          airnodeRrp
            .connect(designatedWallet)
            .fulfill(falseRequestId, airnodeId, fulfillStatusCode, fulfillData, fulfillAddress, fulfillFunctionId, {
              gasLimit: 500000,
            })
        ).to.be.revertedWith('No such request');
        // Attempt to fulfill the request
        const falseAirnodeId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
        await expect(
          airnodeRrp
            .connect(designatedWallet)
            .fulfill(requestId, falseAirnodeId, fulfillStatusCode, fulfillData, fulfillAddress, fulfillFunctionId, {
              gasLimit: 500000,
            })
        ).to.be.revertedWith('No such request');
        // Attempt to fulfill the request
        const falseFulfillAddress = ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));
        await expect(
          airnodeRrp
            .connect(designatedWallet)
            .fulfill(requestId, airnodeId, fulfillStatusCode, fulfillData, falseFulfillAddress, fulfillFunctionId, {
              gasLimit: 500000,
            })
        ).to.be.revertedWith('No such request');
        // Attempt to fulfill the request
        const falseFulfillFunctionId = ethers.utils.hexlify(ethers.utils.randomBytes(4));
        await expect(
          airnodeRrp
            .connect(designatedWallet)
            .fulfill(requestId, airnodeId, fulfillStatusCode, fulfillData, fulfillAddress, falseFulfillFunctionId, {
              gasLimit: 500000,
            })
        ).to.be.revertedWith('No such request');
      });
    });
    context('Fulfilling wallet is incorrect', async function () {
      it('reverts when fulfilling wallet is incorrect', async function () {
        // Have the requester endorse the client
        await airnodeRrp
          .connect(roles.requesterAdmin)
          .setClientEndorsementStatus(requesterIndex, airnodeRrpClient.address, true);
        // Calculate the expected request ID
        const clientRequestNonce = await airnodeRrp.clientAddressToNoRequests(airnodeRrpClient.address);
        const chainId = (await ethers.provider.getNetwork()).chainId;
        const requestId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
            [clientRequestNonce, chainId, airnodeRrpClient.address, templateId, requestTimeParameters]
          )
        );
        // Make the request
        await airnodeRrpClient
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
          airnodeRrp
            .connect(roles.randomPerson)
            .fulfill(requestId, airnodeId, fulfillStatusCode, fulfillData, fulfillAddress, fulfillFunctionId, {
              gasLimit: 500000,
            })
        ).to.be.revertedWith('No such request');
      });
    });
  });
  context('Full request has been made', async function () {
    context('Fulfillment parameters are correct', async function () {
      it('fulfills when parameters are correct', async function () {
        // Have the requester endorse the client
        await airnodeRrp
          .connect(roles.requesterAdmin)
          .setClientEndorsementStatus(requesterIndex, airnodeRrpClient.address, true);
        // Calculate the expected request ID
        const clientRequestNonce = await airnodeRrp.clientAddressToNoRequests(airnodeRrpClient.address);
        const chainId = (await ethers.provider.getNetwork()).chainId;
        const requestId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
            [clientRequestNonce, chainId, airnodeRrpClient.address, endpointId, requestTimeParameters]
          )
        );
        // Make the request
        await airnodeRrpClient
          .connect(roles.clientUser)
          .makeFullRequest(
            airnodeId,
            endpointId,
            requesterIndex,
            designatedWallet.address,
            fulfillAddress,
            fulfillFunctionId,
            requestTimeParameters
          );
        // Fulfill the request
        await expect(
          airnodeRrp
            .connect(designatedWallet)
            .fulfill(requestId, airnodeId, fulfillStatusCode, fulfillData, fulfillAddress, fulfillFunctionId, {
              gasLimit: 500000,
            })
        )
          .to.emit(airnodeRrp, 'ClientRequestFulfilled')
          .withArgs(airnodeId, requestId, fulfillStatusCode, fulfillData);
      });
    });
    context('Fulfillment parameters are incorrect', async function () {
      it('reverts full requests when fulfillment parameters are incorrect', async function () {
        // Have the requester endorse the client
        await airnodeRrp
          .connect(roles.requesterAdmin)
          .setClientEndorsementStatus(requesterIndex, airnodeRrpClient.address, true);
        // Calculate the expected request ID
        const clientRequestNonce = await airnodeRrp.clientAddressToNoRequests(airnodeRrpClient.address);
        const chainId = (await ethers.provider.getNetwork()).chainId;
        const requestId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
            [clientRequestNonce, chainId, airnodeRrpClient.address, endpointId, requestTimeParameters]
          )
        );
        // Make the request
        await airnodeRrpClient
          .connect(roles.clientUser)
          .makeFullRequest(
            airnodeId,
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
          airnodeRrp
            .connect(designatedWallet)
            .fulfill(falseRequestId, airnodeId, fulfillStatusCode, fulfillData, fulfillAddress, fulfillFunctionId, {
              gasLimit: 500000,
            })
        ).to.be.revertedWith('No such request');
        // Attempt to fulfill the request
        const falseAirnodeId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
        await expect(
          airnodeRrp
            .connect(designatedWallet)
            .fulfill(requestId, falseAirnodeId, fulfillStatusCode, fulfillData, fulfillAddress, fulfillFunctionId, {
              gasLimit: 500000,
            })
        ).to.be.revertedWith('No such request');
        // Attempt to fulfill the request
        const falseFulfillAddress = ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));
        await expect(
          airnodeRrp
            .connect(designatedWallet)
            .fulfill(requestId, airnodeId, fulfillStatusCode, fulfillData, falseFulfillAddress, fulfillFunctionId, {
              gasLimit: 500000,
            })
        ).to.be.revertedWith('No such request');
        // Attempt to fulfill the request
        const falseFulfillFunctionId = ethers.utils.hexlify(ethers.utils.randomBytes(4));
        await expect(
          airnodeRrp
            .connect(designatedWallet)
            .fulfill(requestId, airnodeId, fulfillStatusCode, fulfillData, fulfillAddress, falseFulfillFunctionId, {
              gasLimit: 500000,
            })
        ).to.be.revertedWith('No such request');
      });
    });
    context('Fulfilling wallet is incorrect', async function () {
      it('reverts full requests when fulfilling wallet is incorrect', async function () {
        // Have the requester endorse the client
        await airnodeRrp
          .connect(roles.requesterAdmin)
          .setClientEndorsementStatus(requesterIndex, airnodeRrpClient.address, true);
        // Calculate the expected request ID
        const clientRequestNonce = await airnodeRrp.clientAddressToNoRequests(airnodeRrpClient.address);
        const chainId = (await ethers.provider.getNetwork()).chainId;
        const requestId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
            [clientRequestNonce, chainId, airnodeRrpClient.address, endpointId, requestTimeParameters]
          )
        );
        // Make the request
        await airnodeRrpClient
          .connect(roles.clientUser)
          .makeFullRequest(
            airnodeId,
            endpointId,
            requesterIndex,
            designatedWallet.address,
            fulfillAddress,
            fulfillFunctionId,
            requestTimeParameters
          );
        // Attempt to fulfill the request
        await expect(
          airnodeRrp
            .connect(roles.randomPerson)
            .fulfill(requestId, airnodeId, fulfillStatusCode, fulfillData, fulfillAddress, fulfillFunctionId, {
              gasLimit: 500000,
            })
        ).to.be.revertedWith('No such request');
      });
    });
  });
});

describe('fail', function () {
  context('Regular request has been made', async function () {
    context('Fulfillment parameters are correct', async function () {
      it('fails successfully', async function () {
        // Have the requester endorse the client
        await airnodeRrp
          .connect(roles.requesterAdmin)
          .setClientEndorsementStatus(requesterIndex, airnodeRrpClient.address, true);
        // Calculate the expected request ID
        const clientRequestNonce = await airnodeRrp.clientAddressToNoRequests(airnodeRrpClient.address);
        const chainId = (await ethers.provider.getNetwork()).chainId;
        const requestId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
            [clientRequestNonce, chainId, airnodeRrpClient.address, templateId, requestTimeParameters]
          )
        );
        // Make the request
        await airnodeRrpClient
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
          airnodeRrp
            .connect(designatedWallet)
            .fail(requestId, airnodeId, fulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
        )
          .to.emit(airnodeRrp, 'ClientRequestFailed')
          .withArgs(airnodeId, requestId);
      });
    });
    context('Fulfillment parameters are incorrect', async function () {
      it('reverts when fulfillment parameters are incorrect', async function () {
        // Have the requester endorse the client
        await airnodeRrp
          .connect(roles.requesterAdmin)
          .setClientEndorsementStatus(requesterIndex, airnodeRrpClient.address, true);
        // Calculate the expected request ID
        const clientRequestNonce = await airnodeRrp.clientAddressToNoRequests(airnodeRrpClient.address);
        const chainId = (await ethers.provider.getNetwork()).chainId;
        const requestId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
            [clientRequestNonce, chainId, airnodeRrpClient.address, templateId, requestTimeParameters]
          )
        );
        // Make the request
        await airnodeRrpClient
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
          airnodeRrp
            .connect(designatedWallet)
            .fail(falseRequestId, airnodeId, fulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
        ).to.be.revertedWith('No such request');
        // Attempt to fail the fulfillment
        const falseAirnodeId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
        await expect(
          airnodeRrp
            .connect(designatedWallet)
            .fail(requestId, falseAirnodeId, fulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
        ).to.be.revertedWith('No such request');
        // Attempt to fail the fulfillment
        const falseFulfillAddress = ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));
        await expect(
          airnodeRrp
            .connect(designatedWallet)
            .fail(requestId, airnodeId, falseFulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
        ).to.be.revertedWith('No such request');
        // Attempt to fail the fulfillment
        const falseFulfillFunctionId = ethers.utils.hexlify(ethers.utils.randomBytes(4));
        await expect(
          airnodeRrp
            .connect(designatedWallet)
            .fail(requestId, airnodeId, fulfillAddress, falseFulfillFunctionId, { gasLimit: 500000 })
        ).to.be.revertedWith('No such request');
      });
    });
    context('Fulfilling wallet is incorrect', async function () {
      it('reverts when fulfilling wallet is incorrect', async function () {
        // Have the requester endorse the client
        await airnodeRrp
          .connect(roles.requesterAdmin)
          .setClientEndorsementStatus(requesterIndex, airnodeRrpClient.address, true);
        // Calculate the expected request ID
        const clientRequestNonce = await airnodeRrp.clientAddressToNoRequests(airnodeRrpClient.address);
        const chainId = (await ethers.provider.getNetwork()).chainId;
        const requestId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
            [clientRequestNonce, chainId, airnodeRrpClient.address, templateId, requestTimeParameters]
          )
        );
        // Make the request
        await airnodeRrpClient
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
          airnodeRrp
            .connect(roles.randomPerson)
            .fail(requestId, airnodeId, fulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
        ).to.be.revertedWith('No such request');
      });
    });
  });
  context('Full request has been made', async function () {
    context('Fulfillment parameters are correct', async function () {
      it('fails full requests successfully', async function () {
        // Have the requester endorse the client
        await airnodeRrp
          .connect(roles.requesterAdmin)
          .setClientEndorsementStatus(requesterIndex, airnodeRrpClient.address, true);
        // Calculate the expected request ID
        const clientRequestNonce = await airnodeRrp.clientAddressToNoRequests(airnodeRrpClient.address);
        const chainId = (await ethers.provider.getNetwork()).chainId;
        const requestId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
            [clientRequestNonce, chainId, airnodeRrpClient.address, endpointId, requestTimeParameters]
          )
        );
        // Make the request
        await airnodeRrpClient
          .connect(roles.clientUser)
          .makeFullRequest(
            airnodeId,
            endpointId,
            requesterIndex,
            designatedWallet.address,
            fulfillAddress,
            fulfillFunctionId,
            requestTimeParameters
          );
        // Fail the fulfillment
        await expect(
          airnodeRrp
            .connect(designatedWallet)
            .fail(requestId, airnodeId, fulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
        )
          .to.emit(airnodeRrp, 'ClientRequestFailed')
          .withArgs(airnodeId, requestId);
      });
      context('Fulfillment parameters are incorrect', async function () {
        it('reverts full requests when fulfillment parameters are incorrect', async function () {
          // Have the requester endorse the client
          await airnodeRrp
            .connect(roles.requesterAdmin)
            .setClientEndorsementStatus(requesterIndex, airnodeRrpClient.address, true);
          // Calculate the expected request ID
          const clientRequestNonce = await airnodeRrp.clientAddressToNoRequests(airnodeRrpClient.address);
          const chainId = (await ethers.provider.getNetwork()).chainId;
          const requestId = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
              [clientRequestNonce, chainId, airnodeRrpClient.address, endpointId, requestTimeParameters]
            )
          );
          // Make the request
          await airnodeRrpClient
            .connect(roles.clientUser)
            .makeFullRequest(
              airnodeId,
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
            airnodeRrp
              .connect(designatedWallet)
              .fail(falseRequestId, airnodeId, fulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
          ).to.be.revertedWith('No such request');
          // Attempt to fail the fulfillment
          const falseAirnodeId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
          await expect(
            airnodeRrp
              .connect(designatedWallet)
              .fail(requestId, falseAirnodeId, fulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
          ).to.be.revertedWith('No such request');
          // Attempt to fail the fulfillment
          const falseFulfillAddress = ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));
          await expect(
            airnodeRrp
              .connect(designatedWallet)
              .fail(requestId, airnodeId, falseFulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
          ).to.be.revertedWith('No such request');
          // Attempt to fail the fulfillment
          const falseFulfillFunctionId = ethers.utils.hexlify(ethers.utils.randomBytes(4));
          await expect(
            airnodeRrp
              .connect(designatedWallet)
              .fail(requestId, airnodeId, fulfillAddress, falseFulfillFunctionId, { gasLimit: 500000 })
          ).to.be.revertedWith('No such request');
        });
        context('Fulfilling wallet is incorrect', async function () {
          it('reverts full requests when fulfilling wallet is incorrect', async function () {
            // Have the requester endorse the client
            await airnodeRrp
              .connect(roles.requesterAdmin)
              .setClientEndorsementStatus(requesterIndex, airnodeRrpClient.address, true);
            // Calculate the expected request ID
            const clientRequestNonce = await airnodeRrp.clientAddressToNoRequests(airnodeRrpClient.address);
            const chainId = (await ethers.provider.getNetwork()).chainId;
            const requestId = ethers.utils.keccak256(
              ethers.utils.defaultAbiCoder.encode(
                ['uint256', 'uint256', 'address', 'bytes32', 'bytes'],
                [clientRequestNonce, chainId, airnodeRrpClient.address, endpointId, requestTimeParameters]
              )
            );
            // Make the request
            await airnodeRrpClient
              .connect(roles.clientUser)
              .makeFullRequest(
                airnodeId,
                endpointId,
                requesterIndex,
                designatedWallet.address,
                fulfillAddress,
                fulfillFunctionId,
                requestTimeParameters
              );
            // Attempt to fail the fulfillment
            await expect(
              airnodeRrp
                .connect(roles.randomPerson)
                .fail(requestId, airnodeId, fulfillAddress, fulfillFunctionId, { gasLimit: 500000 })
            ).to.be.revertedWith('No such request');
          });
        });
      });
    });
  });
});
