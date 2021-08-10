import { execSync } from 'child_process';
import { existsSync } from 'fs';
import difference from 'lodash/difference';
import { AirnodeRrp, AirnodeRrpFactory } from '@api3/protocol';
import { ethers } from 'ethers';
import * as admin from '../../src';

const PROVIDER_URL = 'http://127.0.0.1:8545/';
const CLI_EXECUTABLE = `${__dirname}/../../dist/cli.js`;
// Turning this flag to 'true' will print each command before executing it
// It might be useful to turn on, while debugging particular test.
const DEBUG_COMMANDS = false;

it('has disabled DEBUG_COMMANDS flag', () => {
  expect(DEBUG_COMMANDS).toBe(false);
});

describe('CLI', () => {
  let provider: ethers.providers.JsonRpcProvider;
  let deployer: ethers.providers.JsonRpcSigner;
  const aliceDerivationPath = "m/44'/60'/0'/0/1";
  let alice: ethers.Wallet;
  const bobDerivationPath = "m/44'/60'/0'/0/2";
  let bob: ethers.Wallet;
  let airnodeRrp: AirnodeRrp;
  // https://hardhat.org/hardhat-network/#hardhat-network-initial-state
  const mnemonic = 'test test test test test test test test test test test junk';

  type CommandArg = [string, string | string[]];
  const execCommand = (command: string, ...args: CommandArg[]) => {
    const quote = (val: string) => `"${val}"`;
    const formattedArgs = args
      .map(([c, a]) => {
        // if args is array then quote each elem and separate them with space
        if (Array.isArray(a)) return `${c} ${a.map(quote).join(' ')}`;
        // otherwise just quote each elem and separate them with space
        else return `${c} ${quote(a)}`;
      })
      .join(' ');
    const formattedCommand = `${command} ${formattedArgs}`;
    if (DEBUG_COMMANDS) console.log(`Executing command: ${formattedCommand}`);
    try {
      return execSync(`node ${CLI_EXECUTABLE} ${formattedCommand}`).toString().trim();
    } catch (e) {
      // rethrow the output of the CLI
      throw new Error(e.stdout.toString().trim());
    }
  };

  const deriveDesignatedWallet = async (wallet: ethers.Wallet, requesterIndex: string) => {
    const airnodeMnemonic = wallet.mnemonic.phrase;
    return ethers.Wallet.fromMnemonic(airnodeMnemonic, `m/0/${requesterIndex}`).connect(provider);
  };

  beforeAll(() => {
    jest.setTimeout(45_000);

    provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
    deployer = provider.getSigner(0);
    alice = ethers.Wallet.fromMnemonic(mnemonic, aliceDerivationPath).connect(provider);
    bob = ethers.Wallet.fromMnemonic(mnemonic, bobDerivationPath).connect(provider);
  });

  beforeEach(async () => {
    airnodeRrp = await new AirnodeRrpFactory(deployer).deploy();
  });

  it('exposes the CLI executable', () => {
    expect(existsSync(`${CLI_EXECUTABLE}`)).toBe(true);
  });

  it('shows help', () => {
    const output = execCommand('--help');
    expect(output).toMatchSnapshot();
  });

  it('has command for every public function/mapping', () => {
    const camelToKebabCase = (str: string) => str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

    const allFunctions = Object.keys(airnodeRrp.functions)
      .filter((key) => !key.includes('('))
      .map(camelToKebabCase);
    const allCommands = execCommand('--help')
      .split(/Commands|Options/)[1]
      .split(new RegExp('cli\\.js'))
      .slice(1)
      .map((line) => line.trim().split(' ')[0]);

    const sdkCliDiff = difference(allFunctions, allCommands);
    const uncoveredFunctions = [
      // renamed to get-airnode-parameters (which calls this more generic version)
      'get-airnode-parameters-and-block-number',
      // renamed to get-endorsement-status
      'requester-index-to-client-address-to-endorsement-status',
      // covered by endorse-client and unendrose-client commands
      'set-client-endorsement-status',
      // explicitely not implemented (not useful as of now)
      'get-templates',
      'check-authorization-status',
      'check-authorization-statuses',
      'fail',
      'fulfill',
      'fulfill-withdrawal',
      'make-full-request',
      'make-request',
      'request-with-id-has-failed',
      'set-airnode-parameters-and-forward-funds',
      'client-address-to-no-requests',
      'requester-index-to-next-withdrawal-request-index',
    ].sort();
    expect(sdkCliDiff).toEqual(uncoveredFunctions);
  });

  it('creates requester', () => {
    const out1 = execCommand(
      'create-requester',
      ['--mnemonic', mnemonic],
      ['--providerUrl', PROVIDER_URL],
      ['--airnodeRrp', airnodeRrp.address],
      ['--requesterAdmin', alice.address]
    );
    const out2 = execCommand(
      'create-requester',
      ['--mnemonic', mnemonic],
      ['--providerUrl', PROVIDER_URL],
      ['--airnodeRrp', airnodeRrp.address],
      ['--requesterAdmin', alice.address]
    );
    expect(out1).toEqual('Requester index: 1');
    expect(out2).toEqual('Requester index: 2');
  });

  it('get requester admin from requester index', async () => {
    const index1 = await admin.createRequester(airnodeRrp, alice.address);
    const index2 = await admin.createRequester(airnodeRrp, bob.address);

    const admin1 = execCommand(
      'requester-index-to-admin',
      ['--providerUrl', PROVIDER_URL],
      ['--airnodeRrp', airnodeRrp.address],
      ['--requesterIndex', index1]
    );
    const admin2 = execCommand(
      'requester-index-to-admin',
      ['--providerUrl', PROVIDER_URL],
      ['--airnodeRrp', airnodeRrp.address],
      ['--requesterIndex', index2]
    );

    expect(admin1).toBe(`Requester admin: ${alice.address}`);
    expect(admin2).toBe(`Requester admin: ${bob.address}`);
  });

  it('sets requester admin', async () => {
    const requesterIndex = await admin.createRequester(airnodeRrp, alice.address);

    const execSetRequesterAdmin = (derivationPath: string, to: ethers.Wallet) => {
      return execCommand(
        'set-requester-admin',
        ['--mnemonic', mnemonic],
        ['--derivationPath', derivationPath],
        ['--providerUrl', PROVIDER_URL],
        ['--requesterIndex', requesterIndex],
        ['--requesterAdmin', to.address],
        ['--airnodeRrp', airnodeRrp.address]
      );
    };

    expect(() => execSetRequesterAdmin(bobDerivationPath, alice)).toThrow(
      'VM Exception while processing transaction: revert Caller not requester admin'
    );
    expect(execSetRequesterAdmin(aliceDerivationPath, bob)).toBe(`Requester admin: ${requesterIndex}`);
    expect(execSetRequesterAdmin(bobDerivationPath, alice)).toBe(`Requester admin: ${requesterIndex}`);
  });

  it('derives the designated wallet', async () => {
    const requesterIndex = await admin.createRequester(airnodeRrp, alice.address);
    const airnodeWallet = ethers.Wallet.createRandom().connect(provider);
    const airnodeMnemonic = airnodeWallet.mnemonic.phrase;
    const masterWallet = ethers.Wallet.fromMnemonic(airnodeMnemonic, 'm').connect(provider);
    // Fund the master wallet - which will be used to set the airnode parameters
    await deployer.sendTransaction({
      to: masterWallet.address,
      value: ethers.utils.parseEther('1'),
    });
    airnodeRrp = airnodeRrp.connect(airnodeWallet);
    const airnodeId = await admin.setAirnodeParameters(airnodeRrp, bob.address, []);

    // Derive the wallet using CLI and admin SDK
    const out = execCommand(
      'derive-designated-wallet',
      ['--providerUrl', PROVIDER_URL],
      ['--airnodeRrp', airnodeRrp.address],
      ['--requesterIndex', requesterIndex],
      ['--airnodeId', airnodeId]
    );

    // Derive the wallet programatically
    const designatedWallet = await deriveDesignatedWallet(airnodeWallet, requesterIndex);

    // Check that they generate the same wallet address
    expect(out).toBe(`Designated wallet address: ${designatedWallet.address}`);
  });

  describe('endorsements', () => {
    it('endorses client', async () => {
      const requesterIndex = await admin.createRequester(airnodeRrp, alice.address);
      const clientAddress = bob.address;

      const out = execCommand(
        'endorse-client',
        ['--mnemonic', mnemonic],
        ['--derivationPath', aliceDerivationPath],
        ['--providerUrl', PROVIDER_URL],
        ['--airnodeRrp', airnodeRrp.address],
        ['--requesterIndex', requesterIndex],
        ['--clientAddress', clientAddress]
      );
      expect(out).toBe(`Client address: ${clientAddress}`);

      const endorsed = await admin.requesterIndexToClientAddressToEndorsementStatus(
        airnodeRrp,
        requesterIndex,
        clientAddress
      );
      expect(endorsed).toBe(true);
    });

    it('unendorses client', async () => {
      const requesterIndex = await admin.createRequester(airnodeRrp, alice.address);
      const clientAddress = bob.address;
      airnodeRrp = airnodeRrp.connect(alice);
      await admin.endorseClient(airnodeRrp, requesterIndex, clientAddress);

      const isEndorsed = () =>
        admin.requesterIndexToClientAddressToEndorsementStatus(airnodeRrp, requesterIndex, clientAddress);

      expect(await isEndorsed()).toBe(true);
      const out = execCommand(
        'unendorse-client',
        ['--mnemonic', mnemonic],
        ['--derivationPath', aliceDerivationPath],
        ['--providerUrl', PROVIDER_URL],
        ['--airnodeRrp', airnodeRrp.address],
        ['--requesterIndex', requesterIndex],
        ['--clientAddress', clientAddress]
      );
      expect(out).toBe(`Client address: ${clientAddress}`);
      expect(await isEndorsed()).toBe(false);
    });

    it('check endoresement status', async () => {
      const requesterIndex = await admin.createRequester(airnodeRrp, alice.address);
      const clientAddress = bob.address;

      const checkEndorsement = () =>
        execCommand(
          'get-endorsement-status',
          ['--providerUrl', PROVIDER_URL],
          ['--airnodeRrp', airnodeRrp.address],
          ['--requesterIndex', requesterIndex],
          ['--clientAddress', clientAddress]
        );

      expect(checkEndorsement()).toBe('Endorsment status: false');
      airnodeRrp = airnodeRrp.connect(alice);
      await admin.endorseClient(airnodeRrp, requesterIndex, clientAddress);
      expect(checkEndorsement()).toBe('Endorsment status: true');
    });
  });

  describe('templates', () => {
    const createTemplate = (fileName: string) =>
      execCommand(
        'create-template',
        ['--mnemonic', mnemonic],
        ['--derivationPath', aliceDerivationPath],
        ['--providerUrl', PROVIDER_URL],
        ['--airnodeRrp', airnodeRrp.address],
        ['--templateFilePath', `${__dirname}/../fixtures/${fileName}`]
      );

    it('can create template', async () => {
      const out = createTemplate('template.json');
      expect(out).toMatch(new RegExp('Template ID: 0x\\w+'));
    });

    it('errors out on invalid template file', () => {
      expect(() => createTemplate(`non-existent-file.json`)).toThrow('ENOENT: no such file or directory');
    });

    it('can get template', () => {
      const templateId = createTemplate('template.json').split('Template ID: ')[1];

      const out = execCommand(
        'get-template',
        ['--providerUrl', PROVIDER_URL],
        ['--airnodeRrp', airnodeRrp.address],
        ['--templateId', templateId]
      );

      expect(JSON.parse(out)).toEqual({
        airnodeId: '0x15e7097beac1fd23c0d1e3f5a882a6f99ecbcf2e0c1011d1bd43707c6c0ec717',
        endpointId: '0x2605589dfc93c8f9c35eecdfe1e666c2193df30a8b13e1e0dd72941f59f9064c',
        parameters:
          '0x31537500000000000000000000000000000000000000000000000000000000006e616d653100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a06e616d653200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e8000000000000000000000000000000000000000000000000000000000000000676616c7565310000000000000000000000000000000000000000000000000000',
      });
    });
  });

  describe('withdrawal', () => {
    let requesterIndex: string;
    let airnodeMnemonic: string;
    let airnodeId: string;
    let designatedWallet: ethers.Wallet;
    let destinationWallet: ethers.Wallet;
    const destinationBalance = async () => (await destinationWallet.getBalance()).toString();

    beforeEach(async () => {
      // Prepare for derivation of designated wallet - see test for designated wallet derivation for details
      requesterIndex = await admin.createRequester(airnodeRrp, alice.address);
      const airnodeWallet = ethers.Wallet.createRandom().connect(provider);
      airnodeMnemonic = airnodeWallet.mnemonic.phrase;
      const masterWallet = ethers.Wallet.fromMnemonic(airnodeMnemonic, 'm').connect(provider);
      // Fund the master wallet - which will be used to set the airnode parameters
      await deployer.sendTransaction({
        to: masterWallet.address,
        value: ethers.utils.parseEther('1'),
      });
      airnodeRrp = airnodeRrp.connect(airnodeWallet);
      airnodeId = await admin.setAirnodeParameters(airnodeRrp, bob.address, []);

      // Derive and fund the designated wallet
      designatedWallet = await deriveDesignatedWallet(airnodeWallet, requesterIndex);
      await deployer.sendTransaction({
        to: designatedWallet.address,
        value: ethers.utils.parseEther('1'),
      });

      // Create destination address
      destinationWallet = ethers.Wallet.createRandom().connect(provider);
    });

    it('returns the desintation balance', async () => {
      expect(await destinationBalance()).toBe('0');
    });

    it('can create and fulfill withdrawal request', async () => {
      const requestWithdrawalOutput = execCommand(
        'request-withdrawal',
        ['--mnemonic', mnemonic],
        ['--derivationPath', aliceDerivationPath],
        ['--providerUrl', PROVIDER_URL],
        ['--airnodeRrp', airnodeRrp.address],
        ['--airnodeId', airnodeId],
        ['--requesterIndex', requesterIndex],
        ['--destination', destinationWallet.address]
      );

      expect(requestWithdrawalOutput).toMatch(new RegExp(`Withdrawal request ID: 0x\\w+`));
      const withdrawalRequestId = requestWithdrawalOutput.split('Withdrawal request ID: ')[1];

      const checkWithdrawalStatus = () =>
        execCommand(
          'check-withdrawal-request',
          ['--providerUrl', PROVIDER_URL],
          ['--airnodeRrp', airnodeRrp.address],
          ['--withdrawalRequestId', withdrawalRequestId]
        );

      expect(checkWithdrawalStatus()).toBe('Withdrawal request is not fulfilled yet');

      airnodeRrp = airnodeRrp.connect(designatedWallet);
      await admin.fulfillWithdrawal(
        airnodeRrp,
        withdrawalRequestId,
        airnodeId,
        requesterIndex,
        destinationWallet.address,
        '0.8'
      );
      expect(checkWithdrawalStatus()).toBe('Withdrawn amount: 800000000000000000');
      expect(await destinationBalance()).toBe('800000000000000000');
    });

    it('only requester admin can withdraw', () => {
      expect(() =>
        execCommand(
          'request-withdrawal',
          ['--mnemonic', mnemonic],
          ['--derivationPath', bobDerivationPath],
          ['--providerUrl', PROVIDER_URL],
          ['--airnodeRrp', airnodeRrp.address],
          ['--airnodeId', airnodeId],
          ['--requesterIndex', requesterIndex],
          ['--destination', destinationWallet.address]
        )
      ).toThrowError('VM Exception while processing transaction: revert Caller not requester admin');
    });
  });

  it('can set/get airnode parameters', async () => {
    const airnodeWallet = ethers.Wallet.createRandom().connect(provider);
    const airnodeMnemonic = airnodeWallet.mnemonic.phrase;
    const hdNode = ethers.utils.HDNode.fromMnemonic(airnodeMnemonic);
    const xpub = hdNode.neuter().extendedKey;
    const masterWallet = new ethers.Wallet(hdNode.privateKey, provider);
    // Fund the master wallet - which will be used to set the airnode parameters
    await deployer.sendTransaction({
      to: masterWallet.address,
      value: ethers.utils.parseEther('1'),
    });

    const setAirnodeParametersOut = execCommand(
      'set-airnode-parameters',
      ['--mnemonic', airnodeMnemonic],
      ['--derivationPath', 'm'],
      ['--providerUrl', PROVIDER_URL],
      ['--airnodeRrp', airnodeRrp.address],
      ['--airnodeAdmin', bob.address],
      ['--authorizersFilePath', `${__dirname}/../fixtures/authorizers.json`]
    );
    expect(setAirnodeParametersOut).toMatch(new RegExp('Airnode ID: \\w+'));

    const airnodeId = setAirnodeParametersOut.split('Airnode ID: ')[1];
    const getAirnodeParametersOut = execCommand(
      'get-airnode-parameters',
      ['--providerUrl', PROVIDER_URL],
      ['--airnodeRrp', airnodeRrp.address],
      ['--airnodeId', airnodeId]
    );

    const json = JSON.parse(getAirnodeParametersOut);
    expect(json).toEqual({
      admin: bob.address,
      authorizers: ['0x0000000000000000000000000000000000000000'],
      xpub,
      blockNumber: expect.anything(),
    });
  });

  it('derives endpoint ID', () => {
    const oisTitle = 'title';
    const endpointName = 'endpoint';

    const out = execCommand('derive-endpoint-id', ['--oisTitle', oisTitle], ['--endpointName', endpointName]);

    const expected = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(['string'], [`${oisTitle}_${endpointName}`])
    );
    expect(out).toBe(`Endpoint ID: ${expected}`);
  });

  it('gets requester admin', async () => {
    const requesterIndex = await admin.createRequester(airnodeRrp, alice.address);

    const out = execCommand(
      'requester-index-to-admin',
      ['--providerUrl', PROVIDER_URL],
      ['--requesterIndex', requesterIndex],
      ['--airnodeRrp', airnodeRrp.address]
    );

    expect(out).toBe(`Requester admin: ${alice.address}`);
  });

  describe('incorrect usage', () => {
    it('is missing command parameter', () => {
      expect(() =>
        execCommand(
          'create-requester',
          ['--mnemonic', mnemonic],
          ['--providerUrl', PROVIDER_URL],
          ['--airnodeRrp', airnodeRrp.address]
          // missing --requesterAdmin parameter
        )
      ).toThrow('Missing required argument: requesterAdmin');
    });

    it('unknown command', () => {
      expect(() =>
        execCommand('not-existent-command', ['--mnemonic', mnemonic], ['--providerUrl', PROVIDER_URL])
      ).toThrow('Unknown arguments: mnemonic, providerUrl, not-existent-command');
    });
  });
});
