const hre = require('hardhat');
const testUtils = require('../../test/test-utils');

let roles;
let airnodeProtocol, dapiServer;
let airnodeAddress, airnodeMnemonic, airnodeWallet;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    manager: accounts[1],
    accessControlRegistry: accounts[2],
  };
  const airnodeProtocolFactory = await hre.ethers.getContractFactory('AirnodeProtocol', roles.deployer);
  airnodeProtocol = await airnodeProtocolFactory.deploy();
  const dapiServerFactory = await hre.ethers.getContractFactory('DapiServer', roles.deployer);
  dapiServer = await dapiServerFactory.deploy(
    roles.accessControlRegistry.address,
    'Placeholder',
    roles.manager.address,
    airnodeProtocol.address
  );
  ({ airnodeAddress, airnodeMnemonic } = testUtils.generateRandomAirnodeWallet());
  airnodeWallet = hre.ethers.Wallet.fromMnemonic(airnodeMnemonic, "m/44'/60'/0'/0/0");
});

describe('updateDapi', function () {
  it('works', async function () {
    const airnodes = [];
    const templateIds = [];
    const timestamps1 = [];
    const fulfillData1 = [];
    const signatures1 = [];
    const timestamps2 = [];
    const fulfillData2 = [];
    const signatures2 = [];

    const count = 9;
    const timestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
    for (let ind = 0; ind < count; ind++) {
      airnodes.push(airnodeAddress);
      const endpointId = testUtils.generateRandomBytes32();
      const parameters = testUtils.generateRandomBytes();
      const templateId = hre.ethers.utils.keccak256(
        hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [endpointId, parameters])
      );
      templateIds.push(templateId);
      timestamps1.push(timestamp);
      const fulfillDatum = hre.ethers.utils.solidityPack(['int256'], [Math.floor(Math.random() * 1000 - 500)]);
      fulfillData1.push(fulfillDatum);
      const signature = await airnodeWallet.signMessage(
        hre.ethers.utils.arrayify(
          hre.ethers.utils.keccak256(
            hre.ethers.utils.solidityPack(['bytes32', 'uint256', 'bytes'], [templateId, timestamp, fulfillDatum])
          )
        )
      );
      signatures1.push(signature);

      timestamps2.push(timestamp + 1);
      const fulfillDatum2 = hre.ethers.utils.solidityPack(['int256'], [Math.floor(Math.random() * 1000 - 500)]);
      fulfillData2.push(fulfillDatum2);
      signatures2.push(
        await airnodeWallet.signMessage(
          hre.ethers.utils.arrayify(
            hre.ethers.utils.keccak256(
              hre.ethers.utils.solidityPack(['bytes32', 'uint256', 'bytes'], [templateId, timestamp + 1, fulfillDatum2])
            )
          )
        )
      );
    }
    await dapiServer.updateDapiWithSignedData(airnodes, templateIds, timestamps1, fulfillData1, signatures1);
    const sponsor = testUtils.generateRandomAddress();
    const response = await dapiServer.callStatic.registerBeaconUpdateSubscription(
      airnodes[0],
      templateIds[0],
      '0x',
      airnodes[0],
      sponsor
    );
    await dapiServer.registerBeaconUpdateSubscription(airnodes[0], templateIds[0], '0x', airnodes[0], sponsor);
    const signaturePsp = await airnodeWallet.signMessage(
      hre.ethers.utils.arrayify(
        hre.ethers.utils.keccak256(
          hre.ethers.utils.solidityPack(
            ['bytes32', 'uint256', 'address'],
            [response.subscriptionId, timestamp + 1, roles.deployer.address]
          )
        )
      )
    );

    console.log(
      (
        await dapiServer.estimateGas.updateBeaconWithSignedData(
          airnodes[0],
          templateIds[0],
          timestamps2[0],
          fulfillData2[0],
          signatures2[0]
        )
      ).toString()
    );
    console.log(
      (
        await dapiServer.estimateGas.fulfillPspBeaconUpdate(
          response.subscriptionId,
          airnodes[0],
          airnodes[0],
          sponsor,
          timestamps2[0],
          fulfillData2[0],
          signaturePsp
        )
      ).toString()
    );
    console.log(
      (
        await dapiServer.estimateGas.updateDapiWithSignedData(
          airnodes,
          templateIds,
          timestamps2,
          fulfillData2,
          signatures2
        )
      ).toString()
    );
  });
});
