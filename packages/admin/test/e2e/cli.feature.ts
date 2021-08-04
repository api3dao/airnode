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
  let airnodeWallet: ethers.Wallet;
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

  const deriveSponsorWallet = async (wallet: ethers.Wallet, sponsor: string) => {
    const airnodeMnemonic = wallet.mnemonic.phrase;
    const derivationPath = admin.deriveWalletPathFromAddress(sponsor);
    return ethers.Wallet.fromMnemonic(airnodeMnemonic, derivationPath).connect(provider);
  };

  beforeAll(() => {
    jest.setTimeout(45_000);

    expect(existsSync(`${CLI_EXECUTABLE}`)).toBe(true);

    provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
    deployer = provider.getSigner();
    alice = ethers.Wallet.fromMnemonic(mnemonic, aliceDerivationPath).connect(provider);
    bob = ethers.Wallet.fromMnemonic(mnemonic, bobDerivationPath).connect(provider);
  });

  beforeEach(async () => {
    airnodeRrp = await new AirnodeRrpFactory(deployer).deploy();
    expect(airnodeRrp.address).toBeDefined();

    airnodeWallet = ethers.Wallet.createRandom().connect(provider);
    await deployer.sendTransaction({
      to: airnodeWallet.address,
      value: ethers.utils.parseEther('1'),
    });
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
      'airnode-to-xpub',
      'sponsor-to-requester-to-sponsorship-status',
      'set-sponsorship-status',
      'get-templates',
      'check-authorization-status',
      'check-authorization-statuses',
      'fail',
      'fulfill',
      'fulfill-withdrawal',
      'make-full-request',
      'make-template-request',
      'request-with-id-has-failed',
      'requester-to-request-count-plus-one',
      'sponsor-to-withdrawal-request-count',
      'templates',
    ].sort();
    expect(sdkCliDiff).toEqual(uncoveredFunctions);
  });

  describe('derive-sponsor-wallet', () => {
    it('derives using provided xpub arg', async () => {
      const sponsor = alice.address;

      const airnodeHdNode = ethers.utils.HDNode.fromMnemonic(airnodeWallet.mnemonic.phrase);
      const airnodeXpub = airnodeHdNode.neuter().extendedKey;

      // Derive the wallet using CLI and admin SDK
      const out = execCommand(
        'derive-sponsor-wallet',
        ['--providerUrl', PROVIDER_URL],
        ['--airnodeRrp', airnodeRrp.address],
        ['--airnode', airnodeWallet.address],
        ['--sponsor', sponsor],
        ['--xpub', airnodeXpub]
      );

      // Derive the wallet programatically
      const sponsorWallet = await deriveSponsorWallet(airnodeWallet, sponsor);

      // Check that they generate the same wallet address
      expect(out).toBe(`Sponsor wallet address: ${sponsorWallet.address}`);
    });
    it('derives using on chain xpub', async () => {
      const sponsor = alice.address;

      airnodeRrp = airnodeRrp.connect(airnodeWallet);
      await admin.setAirnodeXpub(airnodeRrp);

      // Derive the wallet using CLI and admin SDK
      const out = execCommand(
        'derive-sponsor-wallet',
        ['--providerUrl', PROVIDER_URL],
        ['--airnodeRrp', airnodeRrp.address],
        ['--airnode', airnodeWallet.address],
        ['--sponsor', sponsor]
      );

      // Derive the wallet programatically
      const sponsorWallet = await deriveSponsorWallet(airnodeWallet, sponsor);

      // Check that they generate the same wallet address
      expect(out).toBe(`Sponsor wallet address: ${sponsorWallet.address}`);
    });
    it('errors out with missing xpub message', async () => {
      const sponsor = alice.address;
      expect(() =>
        execCommand(
          'derive-sponsor-wallet',
          ['--providerUrl', PROVIDER_URL],
          ['--airnodeRrp', airnodeRrp.address],
          ['--airnode', airnodeWallet.address],
          ['--sponsor', sponsor]
        )
      ).toThrow('Airnode xpub is missing in AirnodeRrp contract');
    });
  });

  describe('endorsements', () => {
    it('endorses requester', async () => {
      const sponsor = alice.address;
      const requester = bob.address;

      const out = execCommand(
        'endorse-requester',
        ['--providerUrl', PROVIDER_URL],
        ['--airnodeRrp', airnodeRrp.address],
        ['--mnemonic', mnemonic],
        ['--derivationPath', aliceDerivationPath],
        ['--requester', requester]
      );
      expect(out).toBe(`Requester address: ${requester}`);

      const endorsed = await admin.sponsorToRequesterToSponsorshipStatus(airnodeRrp, sponsor, requester);
      expect(endorsed).toBe(true);
    });

    it('unendorses requester', async () => {
      const sponsor = alice.address;
      const requester = bob.address;
      airnodeRrp = airnodeRrp.connect(alice);
      await admin.endorseRequester(airnodeRrp, requester);

      const isEndorsed = () => admin.sponsorToRequesterToSponsorshipStatus(airnodeRrp, sponsor, requester);

      expect(await isEndorsed()).toBe(true);
      const out = execCommand(
        'unendorse-requester',
        ['--mnemonic', mnemonic],
        ['--derivationPath', aliceDerivationPath],
        ['--providerUrl', PROVIDER_URL],
        ['--airnodeRrp', airnodeRrp.address],
        ['--requester', requester]
      );
      expect(out).toBe(`Requester address: ${requester}`);
      expect(await isEndorsed()).toBe(false);
    });

    it('check endoresement status', async () => {
      const sponsor = alice.address;
      const requester = bob.address;

      const checkEndorsement = () =>
        execCommand(
          'get-endorsement-status',
          ['--providerUrl', PROVIDER_URL],
          ['--airnodeRrp', airnodeRrp.address],
          ['--sponsor', sponsor],
          ['--requester', requester]
        );

      expect(checkEndorsement()).toBe('Endorsment status: false');
      airnodeRrp = airnodeRrp.connect(alice);
      await admin.endorseRequester(airnodeRrp, requester);
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
        airnode: '0x4a1dF2859279Fa92A41Fd7d487A3c2b76ac8570b',
        endpointId: '0x2605589dfc93c8f9c35eecdfe1e666c2193df30a8b13e1e0dd72941f59f9064c',
        parameters:
          '0x31537500000000000000000000000000000000000000000000000000000000006e616d653100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a06e616d653200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e8000000000000000000000000000000000000000000000000000000000000000676616c7565310000000000000000000000000000000000000000000000000000',
      });
    });
  });

  describe('withdrawal', () => {
    let sponsor: string;
    let sponsorWallet: ethers.Wallet;
    let destinationWallet: ethers.Wallet;
    const destinationBalance = async () => (await destinationWallet.getBalance()).toString();

    beforeEach(async () => {
      // Prepare for derivation of designated wallet - see test for designated wallet derivation for details
      sponsor = alice.address;

      // Derive and fund the designated sponsor wallet
      sponsorWallet = await deriveSponsorWallet(airnodeWallet, sponsor);
      await deployer.sendTransaction({
        to: sponsorWallet.address,
        value: ethers.utils.parseEther('1'),
      });

      // Create destination address
      destinationWallet = ethers.Wallet.createRandom().connect(provider);
      expect(await destinationBalance()).toBe('0');
    });

    it('can create and fulfill withdrawal request', async () => {
      const requestWithdrawalOutput = execCommand(
        'request-withdrawal',
        ['--mnemonic', mnemonic],
        ['--derivationPath', aliceDerivationPath],
        ['--providerUrl', PROVIDER_URL],
        ['--airnodeRrp', airnodeRrp.address],
        ['--airnode', airnodeWallet.address],
        ['--sponsorWallet', sponsorWallet.address],
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

      airnodeRrp = airnodeRrp.connect(sponsorWallet);
      await admin.fulfillWithdrawal(
        airnodeRrp,
        withdrawalRequestId,
        airnodeWallet.address,
        sponsor,
        destinationWallet.address,
        '0.8'
      );
      expect(checkWithdrawalStatus()).toBe('Withdrawn amount: 800000000000000000');
      expect(await destinationBalance()).toBe('800000000000000000');
    });
  });

  it('can set/get airnode xpub', async () => {
    const airnodeHdNode = ethers.utils.HDNode.fromMnemonic(airnodeWallet.mnemonic.phrase);
    const airnodeXpub = airnodeHdNode.neuter().extendedKey;

    const setAirnodeXpubOut = execCommand(
      'set-airnode-xpub',
      ['--mnemonic', airnodeWallet.mnemonic.phrase],
      ['--derivationPath', airnodeWallet.mnemonic.path],
      ['--providerUrl', PROVIDER_URL],
      ['--airnodeRrp', airnodeRrp.address]
    );
    expect(setAirnodeXpubOut).toEqual(`Airnode xpub: ${airnodeXpub}`);

    const getAirnodeXpubOut = execCommand(
      'get-airnode-xpub',
      ['--providerUrl', PROVIDER_URL],
      ['--airnodeRrp', airnodeRrp.address],
      ['--airnode', airnodeWallet.address]
    );

    expect(getAirnodeXpubOut).toEqual(`Airnode xpub: ${airnodeXpub}`);
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

  describe('incorrect usage', () => {
    it('is missing command parameter', () => {
      expect(() =>
        execCommand(
          'endorse-requester',
          ['--mnemonic', mnemonic],
          ['--derivationPath', 'm/0/973563544/2109481170/2137349576/871269377/610184194/17'],
          ['--providerUrl', PROVIDER_URL],
          ['--airnodeRrp', airnodeRrp.address]
          // missing ['--requester', requester]
        )
      ).toThrow('Missing required argument: requester');
    });

    it('unknown command', () => {
      expect(() =>
        execCommand('not-existent-command', ['--mnemonic', mnemonic], ['--providerUrl', PROVIDER_URL])
      ).toThrow('Unknown arguments: mnemonic, providerUrl, not-existent-command');
    });
  });
});
