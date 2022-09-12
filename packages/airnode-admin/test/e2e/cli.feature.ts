import { execSync } from 'child_process';
import difference from 'lodash/difference';
import {
  AirnodeRrpV0,
  AirnodeRrpV0Factory,
  authorizers,
  RequesterAuthorizerWithAirnode,
  AccessControlRegistry,
  AccessControlRegistryFactory,
} from '@api3/airnode-protocol';
import { ethers } from 'ethers';
import { logger } from '@api3/airnode-utilities';
import { goSync } from '@api3/promise-utils';
import * as admin from '../../src';
import { cliExamples } from '../../src/cli-examples';

const PROVIDER_URL = 'http://127.0.0.1:8545/';
const CLI_EXECUTABLE = `${__dirname}/../../dist/src/cli.js`;
// Turning this flag to 'true' will print each command before executing it
// It might be useful to turn on, while debugging particular test.
const DEBUG_COMMANDS = false;

it('has disabled DEBUG_COMMANDS flag', () => {
  expect(DEBUG_COMMANDS).toBe(false);
});

describe('CLI', () => {
  jest.setTimeout(45_000);

  let provider: ethers.providers.JsonRpcProvider;
  let deployer: ethers.providers.JsonRpcSigner;
  const aliceDerivationPath = "m/44'/60'/0'/0/1";
  let alice: ethers.Wallet;
  const bobDerivationPath = "m/44'/60'/0'/0/2";
  let bob: ethers.Wallet;
  let airnodeWallet: ethers.Wallet;
  let airnodeRrp: AirnodeRrpV0;
  // https://hardhat.org/hardhat-network/#hardhat-network-initial-state
  const mnemonic = 'test test test test test test test test test test test junk';

  type CommandArg = [string, string | string[] | number | boolean];
  const execCommand = (command: string, ...args: CommandArg[]) => {
    const quote = (val: string) => `"${val}"`;
    const formattedArgs = args
      .map(([c, a]) => {
        // if args is array then quote each elem and separate them with space
        if (Array.isArray(a)) return `${c} ${a.map(quote).join(' ')}`;
        // otherwise just quote each elem and separate them with space
        else return `${c} ${quote(String(a))}`;
      })
      .join(' ');
    const formattedCommand = `${command} ${formattedArgs}`;
    if (DEBUG_COMMANDS) logger.log(`Executing command: ${formattedCommand}`);

    const goExecSync = goSync(() => execSync(`node ${CLI_EXECUTABLE} ${formattedCommand}`).toString().trim());
    if (!goExecSync.success) {
      // rethrow the output of the CLI
      throw new Error((goExecSync.error as any).reason.stdout.toString().trim());
    }
    return goExecSync.data;
  };

  const deriveSponsorWallet = (airnodeMnemonic: string, sponsorAddress: string): ethers.Wallet => {
    return ethers.Wallet.fromMnemonic(
      airnodeMnemonic,
      `m/44'/60'/0'/${admin.deriveWalletPathFromSponsorAddress(sponsorAddress)}`
    ).connect(provider);
  };

  beforeAll(() => {
    provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
    deployer = provider.getSigner();
    alice = ethers.Wallet.fromMnemonic(mnemonic, aliceDerivationPath).connect(provider);
    bob = ethers.Wallet.fromMnemonic(mnemonic, bobDerivationPath).connect(provider);
  });

  beforeEach(async () => {
    airnodeRrp = await new AirnodeRrpV0Factory(deployer).deploy();

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
      'request-is-awaiting-fulfillment',
      'requester-to-request-count-plus-one',
      'sponsor-to-withdrawal-request-count',
      'templates',
    ].sort();
    expect(sdkCliDiff).toEqual(uncoveredFunctions);
  });

  describe('derive-airnode-xpub', () => {
    it('derives airnode xpub', () => {
      const airnodeMnemonic = airnodeWallet.mnemonic.phrase;

      // Derive the xpub programatically
      const airnodeXpub = admin.deriveAirnodeXpub(airnodeMnemonic);

      // Derive the xpub using CLI
      const out = execCommand('derive-airnode-xpub', ['--airnode-mnemonic', airnodeMnemonic]);
      expect(out).toBe(`Airnode xpub: ${airnodeXpub}`);
    });
  });

  describe('verify-airnode-xpub', () => {
    it('verifies airnode xpub', () => {
      const airnodeXpub = admin.deriveAirnodeXpub(airnodeWallet.mnemonic.phrase);

      // Verify the xpub using CLI
      let out = execCommand(
        'verify-airnode-xpub',
        ['--airnode-xpub', airnodeXpub],
        ['--airnode-address', airnodeWallet.address]
      );
      expect(out).toBe(`Airnode xpub is: VALID`);

      out = execCommand('verify-airnode-xpub', ['--airnode-xpub', airnodeXpub], ['--airnode-address', alice.address]);
      expect(out).toBe(`Airnode xpub is: INVALID`);

      const aliceXpub = admin.deriveAirnodeXpub(alice.mnemonic.phrase);
      out = execCommand(
        'verify-airnode-xpub',
        ['--airnode-xpub', aliceXpub],
        ['--airnode-address', airnodeWallet.address]
      );
      expect(out).toBe(`Airnode xpub is: INVALID`);
    });
  });

  describe('derive-sponsor-wallet-address', () => {
    it('derives using airnode xpub', async () => {
      const sponsorAddress = alice.address;
      const airnodeXpub = admin.deriveAirnodeXpub(airnodeWallet.mnemonic.phrase);

      // Derive the wallet using CLI
      const out = execCommand(
        'derive-sponsor-wallet-address',
        ['--airnode-xpub', airnodeXpub],
        ['--airnode-address', airnodeWallet.address],
        ['--sponsor-address', sponsorAddress]
      );

      // Derive the wallet programatically
      const sponsorWallet = await deriveSponsorWallet(airnodeWallet.mnemonic.phrase, sponsorAddress);

      // Check that they generate the same wallet address
      expect(out).toBe(`Sponsor wallet address: ${sponsorWallet.address}`);
    });
    it('errors out with wrong xpub message', () => {
      const sponsorAddress = alice.address;

      const randomWallet = ethers.Wallet.createRandom();
      const randomHdNode = ethers.utils.HDNode.fromMnemonic(randomWallet.mnemonic.phrase);
      const randomXpub = randomHdNode.derivePath("m/44'/60'/0'").neuter().extendedKey;

      expect(() =>
        execCommand(
          'derive-sponsor-wallet-address',
          ['--airnode-xpub', randomXpub],
          ['--airnode-address', airnodeWallet.address],
          ['--sponsor-address', sponsorAddress]
        )
      ).toThrow(`xpub does not belong to Airnode: ${airnodeWallet.address}`);
    });
  });

  describe('sponsorship', () => {
    it('starts sponsoring requester', async () => {
      const sponsorAddress = alice.address;
      const requesterAddress = bob.address;

      const out = execCommand(
        'sponsor-requester',
        ['--provider-url', PROVIDER_URL],
        ['--airnode-rrp-address', airnodeRrp.address],
        ['--sponsor-mnemonic', mnemonic],
        ['--derivation-path', aliceDerivationPath],
        ['--requester-address', requesterAddress]
      );
      expect(out).toBe(`Requester address ${requesterAddress} is now sponsored by ${sponsorAddress}`);

      const sponsored = await admin.sponsorToRequesterToSponsorshipStatus(airnodeRrp, sponsorAddress, requesterAddress);
      expect(sponsored).toBe(true);
    });

    it('uses transaction overrides', () => {
      const requesterAddress = bob.address;
      expect(() =>
        execCommand(
          'sponsor-requester',
          ['--provider-url', PROVIDER_URL],
          ['--airnode-rrp-address', airnodeRrp.address],
          ['--sponsor-mnemonic', mnemonic],
          ['--derivation-path', aliceDerivationPath],
          ['--requester-address', requesterAddress],
          ['--gas-limit', 1],
          ['--max-fee', 20],
          ['--max-priority-fee', 10]
        )
      ).toThrow('Transaction requires at least 21560 gas but got 1');
    });

    it('stops sponsoring requester', async () => {
      const sponsorAddress = alice.address;
      const requesterAddress = bob.address;
      airnodeRrp = airnodeRrp.connect(alice);
      await admin.sponsorRequester(airnodeRrp, requesterAddress);

      const isSponsored = () =>
        admin.sponsorToRequesterToSponsorshipStatus(airnodeRrp, sponsorAddress, requesterAddress);

      expect(await isSponsored()).toBe(true);
      const out = execCommand(
        'unsponsor-requester',
        ['--sponsor-mnemonic', mnemonic],
        ['--derivation-path', aliceDerivationPath],
        ['--provider-url', PROVIDER_URL],
        ['--airnode-rrp-address', airnodeRrp.address],
        ['--requester-address', requesterAddress]
      );
      expect(out).toBe(`Requester address ${requesterAddress} is no longer sponsored by ${sponsorAddress}`);
      expect(await isSponsored()).toBe(false);
    });

    it('gets the sponsor status', async () => {
      const sponsorAddress = alice.address;
      const requesterAddress = bob.address;

      const getSponsorStatus = () =>
        execCommand(
          'get-sponsor-status',
          ['--provider-url', PROVIDER_URL],
          ['--airnode-rrp-address', airnodeRrp.address],
          ['--sponsor-address', sponsorAddress],
          ['--requester-address', requesterAddress]
        );

      expect(getSponsorStatus()).toBe('Requester address sponsored: false');
      airnodeRrp = airnodeRrp.connect(alice);
      await admin.sponsorRequester(airnodeRrp, requesterAddress);
      expect(getSponsorStatus()).toBe('Requester address sponsored: true');
    });
  });

  describe('templates', () => {
    const createTemplate = (fileName: string) =>
      execCommand(
        'create-template',
        ['--mnemonic', mnemonic],
        ['--derivation-path', aliceDerivationPath],
        ['--provider-url', PROVIDER_URL],
        ['--airnode-rrp-address', airnodeRrp.address],
        ['--template-file-path', `${__dirname}/../fixtures/${fileName}`]
      );

    it('can create template', () => {
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
        ['--provider-url', PROVIDER_URL],
        ['--airnode-rrp-address', airnodeRrp.address],
        ['--template-id', templateId]
      );

      expect(JSON.parse(out)).toEqual({
        airnode: '0x4a1dF2859279Fa92A41Fd7d487A3c2b76ac8570b',
        endpointId: '0x2605589dfc93c8f9c35eecdfe1e666c2193df30a8b13e1e0dd72941f59f9064c',
        parameters:
          '0x31537500000000000000000000000000000000000000000000000000000000006e616d653100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a06e616d653200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e8000000000000000000000000000000000000000000000000000000000000000676616c7565310000000000000000000000000000000000000000000000000000',
      });
    });

    it('can create data for inline template', () => {
      const out = execCommand('create-inline-template', [
        '--template-file-path',
        `${__dirname}/../fixtures/template.json`,
      ]);

      expect(out).toBe(
        `
Template data:
{
  "templateId": "0x401c861e7a6ccd4261aa115569290d88368a0849f3446c3422c567bf3bde8b94",
  "endpointId": "0x2605589dfc93c8f9c35eecdfe1e666c2193df30a8b13e1e0dd72941f59f9064c",
  "encodedParameters": "0x31537500000000000000000000000000000000000000000000000000000000006e616d653100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a06e616d653200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e8000000000000000000000000000000000000000000000000000000000000000676616c7565310000000000000000000000000000000000000000000000000000"
}
      `.trim()
      );
    });
  });

  describe('withdrawal', () => {
    let sponsor: ethers.Wallet;
    let sponsorWallet: ethers.Wallet;
    const sponsorBalance = () => sponsor.getBalance();

    beforeEach(async () => {
      // Prepare for derivation of designated wallet - see test for designated wallet derivation for details
      sponsor = alice;

      // Derive and fund the designated sponsor wallet
      sponsorWallet = await deriveSponsorWallet(airnodeWallet.mnemonic.phrase, sponsor.address);
      await deployer.sendTransaction({
        to: sponsorWallet.address,
        value: ethers.utils.parseEther('1'),
      });
    });

    it('can create and fulfill withdrawal request', async () => {
      const requestWithdrawalOutput = execCommand(
        'request-withdrawal',
        ['--sponsor-mnemonic', mnemonic],
        ['--derivation-path', aliceDerivationPath],
        ['--provider-url', PROVIDER_URL],
        ['--airnode-rrp-address', airnodeRrp.address],
        ['--airnode-address', airnodeWallet.address],
        ['--sponsor-wallet-address', sponsorWallet.address]
      );

      expect(requestWithdrawalOutput).toMatch(new RegExp(`Withdrawal request ID: 0x\\w+`));
      const withdrawalRequestId = requestWithdrawalOutput.split('Withdrawal request ID: ')[1];

      const checkWithdrawalStatus = () =>
        execCommand(
          'check-withdrawal-request',
          ['--provider-url', PROVIDER_URL],
          ['--airnode-rrp-address', airnodeRrp.address],
          ['--withdrawal-request-id', withdrawalRequestId]
        );

      expect(checkWithdrawalStatus()).toBe('Withdrawal request is not fulfilled yet');

      const balanceBefore = await sponsorBalance();
      airnodeRrp = airnodeRrp.connect(sponsorWallet);
      await admin.fulfillWithdrawal(airnodeRrp, withdrawalRequestId, airnodeWallet.address, sponsor.address, '0.8');
      expect(checkWithdrawalStatus()).toBe('Withdrawn amount: 800000000000000000');
      expect((await sponsorBalance()).toString()).toBe(
        balanceBefore.add(ethers.BigNumber.from('800000000000000000')).toString()
      );
    });
  });

  it('derives endpoint ID', () => {
    const oisTitle = 'title';
    const endpointName = 'endpoint';

    const out = execCommand('derive-endpoint-id', ['--ois-title', oisTitle], ['--endpoint-name', endpointName]);

    const expected = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(['string', 'string'], [`${oisTitle}`, `${endpointName}`])
    );
    expect(out).toBe(`Endpoint ID: ${expected}`);
  });

  describe('incorrect usage', () => {
    it('is missing command parameter', () => {
      expect(() =>
        execCommand(
          'sponsor-requester',
          ['--sponsor-mnemonic', mnemonic],
          ['--derivation-path', 'm/0/973563544/2109481170/2137349576/871269377/610184194/17'],
          ['--provider-url', PROVIDER_URL],
          ['--airnode-rrp-address', airnodeRrp.address]
          // missing ['--requester-address', requester]
        )
      ).toThrow('Missing required argument: requester-address');
    });

    it('unknown command', () => {
      expect(() =>
        execCommand('not-existent-command', ['--mnemonic', mnemonic], ['--provider-url', PROVIDER_URL])
      ).toThrow('Unknown arguments: mnemonic, provider-url, providerUrl, not-existent-command');
    });

    it('mixes legacy and EIP-1559 arguments', () => {
      const requesterAddress = bob.address;

      expect(() =>
        execCommand(
          'sponsor-requester',
          ['--provider-url', PROVIDER_URL],
          ['--airnode-rrp-address', airnodeRrp.address],
          ['--sponsor-mnemonic', mnemonic],
          ['--derivation-path', aliceDerivationPath],
          ['--requester-address', requesterAddress],
          ['--gas-limit', 234000],
          ['--gas-price', 20],
          ['--max-fee', 20],
          ['--max-priority-fee', 10]
        )
      ).toThrow(`Both legacy and EIP1559 override pricing options specified - ambiguous`);
    });
  });

  it('generates airnode mnemonic', async () => {
    const out = execCommand('generate-airnode-mnemonic').split('\n');

    const explanationInfo = [
      'This mnemonic is created locally on your machine using "ethers.Wallet.createRandom" under the hood.',
      'Make sure to back it up securely, e.g., by writing it down on a piece of paper:',
      '',
    ];
    expect(out.slice(0, 3)).toEqual(explanationInfo);

    const titleRows = [out[3], out[7]];
    titleRows.forEach((row) => expect(row).toMatch(/^#+ MNEMONIC #+$/));

    const spaceRows = [out[4], out[6]];
    spaceRows.forEach((row) => expect(row).toMatch(/^\s+$/));

    const mnemonic = out[5];
    const words = mnemonic.split(' ');
    expect(words).toHaveLength(12);
    words.forEach((word) => expect(word).toMatch(/\w+/));

    const airnodeAddress = await admin.deriveAirnodeAddress(mnemonic);
    expect(out[9]).toEqual(`The Airnode address for this mnemonic is: ${airnodeAddress}`);

    const airnodeXpub = admin.deriveAirnodeXpub(mnemonic);
    expect(out[10]).toEqual(`The Airnode xpub for this mnemonic is: ${airnodeXpub}`);

    const verifyXpubResult = admin.verifyAirnodeXpub(airnodeXpub, airnodeAddress);
    const hdNode = ethers.utils.HDNode.fromExtendedKey(airnodeXpub);
    expect(verifyXpubResult).toEqual(hdNode);
  });

  it('generates mnemonic', async () => {
    const out = execCommand('generate-mnemonic').split('\n');

    const explanationInfo = [
      'This mnemonic is created locally on your machine using "ethers.Wallet.createRandom" under the hood.',
      'Make sure to back it up securely, e.g., by writing it down on a piece of paper:',
      '',
    ];
    expect(out.slice(0, 3)).toEqual(explanationInfo);

    const titleRows = [out[3], out[7]];
    titleRows.forEach((row) => expect(row).toMatch(/^#+ MNEMONIC #+$/));

    const spaceRows = [out[4], out[6]];
    spaceRows.forEach((row) => expect(row).toMatch(/^\s+$/));

    const mnemonic = out[5];
    const words = mnemonic.split(' ');
    expect(words).toHaveLength(12);
    words.forEach((word) => expect(word).toMatch(/\w+/));

    const address = await admin.deriveAirnodeAddress(mnemonic);
    expect(out[9]).toEqual(`The default wallet address (path:m/44'/60'/0'/0/0) for this mnemonic is: ${address}`);
  });

  describe('RequesterAuthorizerWithAirnode', () => {
    const oisTitle = 'title';
    const endpointName = 'endpoint';
    const endpointId = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(['string', 'string'], [`${oisTitle}`, `${endpointName}`])
    );
    const expirationTimestamp = new Date('2031-09-23T13:04:13Z');
    let accessControlRegistry: AccessControlRegistry;
    let requesterAuthorizerWithAirnode: RequesterAuthorizerWithAirnode;

    beforeEach(async () => {
      accessControlRegistry = await new AccessControlRegistryFactory(deployer).deploy();
      requesterAuthorizerWithAirnode = await new authorizers.RequesterAuthorizerWithAirnodeFactory(deployer).deploy(
        accessControlRegistry.address,
        'RequesterAuthorizerWithAirnode admin'
      );

      const airnodeRootRole = await accessControlRegistry.deriveRootRole(airnodeWallet.address);
      // Initialize the roles and grant them to respective accounts
      const adminRole = await requesterAuthorizerWithAirnode.deriveAdminRole(airnodeWallet.address);
      await accessControlRegistry
        .connect(airnodeWallet)
        .initializeRoleAndGrantToSender(airnodeRootRole, await requesterAuthorizerWithAirnode.adminRoleDescription(), {
          gasLimit: 1000000,
        });
      const whitelistExpirationExtenderRole =
        await requesterAuthorizerWithAirnode.deriveWhitelistExpirationExtenderRole(airnodeWallet.address);
      await accessControlRegistry
        .connect(airnodeWallet)
        .initializeRoleAndGrantToSender(
          adminRole,
          await requesterAuthorizerWithAirnode.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION(),
          { gasLimit: 1000000 }
        );
      await accessControlRegistry
        .connect(airnodeWallet)
        .grantRole(whitelistExpirationExtenderRole, bob.address, { gasLimit: 1000000 });
      const whitelistExpirationSetterRole = await requesterAuthorizerWithAirnode.deriveWhitelistExpirationSetterRole(
        airnodeWallet.address
      );
      await accessControlRegistry
        .connect(airnodeWallet)
        .initializeRoleAndGrantToSender(
          adminRole,
          await requesterAuthorizerWithAirnode.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION(),
          { gasLimit: 1000000 }
        );
      await accessControlRegistry
        .connect(airnodeWallet)
        .grantRole(whitelistExpirationSetterRole, alice.address, { gasLimit: 1000000 });
      const indefiniteWhitelisterRole = await requesterAuthorizerWithAirnode.deriveIndefiniteWhitelisterRole(
        airnodeWallet.address
      );
      await accessControlRegistry
        .connect(airnodeWallet)
        .initializeRoleAndGrantToSender(
          adminRole,
          await requesterAuthorizerWithAirnode.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION(),
          { gasLimit: 1000000 }
        );
      await accessControlRegistry
        .connect(airnodeWallet)
        .grantRole(indefiniteWhitelisterRole, alice.address, { gasLimit: 1000000 });
    });

    it('sets whitelist expiration timestamp', async () => {
      let whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeWallet.address,
        endpointId,
        alice.address
      );
      expect(whitelistStatus.expirationTimestamp.toNumber()).toEqual(0);
      expect(whitelistStatus.indefiniteWhitelistCount.toNumber()).toEqual(0);

      const setWhitelistExpirationOut = execCommand(
        'set-whitelist-expiration',
        ['--mnemonic', airnodeWallet.mnemonic.phrase],
        ['--derivation-path', airnodeWallet.mnemonic.path],
        ['--provider-url', PROVIDER_URL],
        ['--requester-authorizer-with-airnode-address', requesterAuthorizerWithAirnode.address],
        ['--endpoint-id', endpointId],
        ['--requester-address', alice.address],
        ['--expiration-timestamp', expirationTimestamp.getTime()],
        ['--airnode-address', airnodeWallet.address]
      );
      expect(setWhitelistExpirationOut).toEqual(
        `Whitelist expiration: ${expirationTimestamp.toUTCString()} (${expirationTimestamp.getTime()})`
      );

      whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeWallet.address,
        endpointId,
        alice.address
      );
      expect(whitelistStatus.expirationTimestamp.toNumber()).toEqual(expirationTimestamp.getTime());
      expect(whitelistStatus.indefiniteWhitelistCount.toNumber()).toEqual(0);
    });

    it('extends whitelist expiration timestamp', async () => {
      // New expiration timestamp is a month from expirationTimestamp
      const extendedExpirationTimestamp = new Date(expirationTimestamp);
      extendedExpirationTimestamp.setMonth(expirationTimestamp.getMonth() + 1);

      await requesterAuthorizerWithAirnode
        .connect(airnodeWallet)
        .setWhitelistExpiration(airnodeWallet.address, endpointId, alice.address, expirationTimestamp.getTime());
      let whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeWallet.address,
        endpointId,
        alice.address
      );
      expect(whitelistStatus.expirationTimestamp.toNumber()).toEqual(expirationTimestamp.getTime());
      expect(whitelistStatus.indefiniteWhitelistCount.toNumber()).toEqual(0);

      const extendWhitelistExpirationOut = execCommand(
        'extend-whitelist-expiration',
        ['--mnemonic', bob.mnemonic.phrase], // An admin should be able to extend whitelist expiration
        ['--derivation-path', bobDerivationPath],
        ['--provider-url', PROVIDER_URL],
        ['--requester-authorizer-with-airnode-address', requesterAuthorizerWithAirnode.address],
        ['--endpoint-id', endpointId],
        ['--requester-address', alice.address],
        ['--expiration-timestamp', extendedExpirationTimestamp.getTime()],
        ['--airnode-address', airnodeWallet.address]
      );
      expect(extendWhitelistExpirationOut).toEqual(
        `Whitelist expiration: ${extendedExpirationTimestamp.toUTCString()} (${extendedExpirationTimestamp.getTime()})`
      );

      whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeWallet.address,
        endpointId,
        alice.address
      );
      expect(whitelistStatus.expirationTimestamp.toNumber()).toEqual(extendedExpirationTimestamp.getTime());
      expect(whitelistStatus.indefiniteWhitelistCount.toNumber()).toEqual(0);
    });

    it('sets the indefinite whitelist status of a requester', async () => {
      await requesterAuthorizerWithAirnode
        .connect(airnodeWallet)
        .setWhitelistExpiration(airnodeWallet.address, endpointId, alice.address, expirationTimestamp.getTime());
      let whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeWallet.address,
        endpointId,
        alice.address
      );
      expect(whitelistStatus.expirationTimestamp.toNumber()).toEqual(expirationTimestamp.getTime());
      expect(whitelistStatus.indefiniteWhitelistCount.toNumber()).toEqual(0);

      const setIndefiniteWhitelistStatusOut = execCommand(
        'set-indefinite-whitelist-status',
        ['--mnemonic', airnodeWallet.mnemonic.phrase],
        ['--derivation-path', airnodeWallet.mnemonic.path],
        ['--provider-url', PROVIDER_URL],
        ['--requester-authorizer-with-airnode-address', requesterAuthorizerWithAirnode.address],
        ['--endpoint-id', endpointId],
        ['--requester-address', alice.address],
        ['--indefinite-whitelist-status', true],
        ['--airnode-address', airnodeWallet.address]
      );
      expect(setIndefiniteWhitelistStatusOut).toEqual(`Whitelist status: ${true}`);

      whitelistStatus = await requesterAuthorizerWithAirnode.airnodeToEndpointIdToRequesterToWhitelistStatus(
        airnodeWallet.address,
        endpointId,
        alice.address
      );
      expect(whitelistStatus.expirationTimestamp.toNumber()).toEqual(expirationTimestamp.getTime());
      expect(whitelistStatus.indefiniteWhitelistCount.toNumber()).toEqual(1);
    });

    it('can get whitelist status', async () => {
      let out = execCommand(
        'get-whitelist-status',
        ['--provider-url', PROVIDER_URL],
        ['--requester-authorizer-with-airnode-address', requesterAuthorizerWithAirnode.address],
        ['--endpoint-id', endpointId],
        ['--requester-address', alice.address],
        ['--airnode-address', airnodeWallet.address]
      );
      expect(JSON.parse(out)).toEqual({
        expirationTimestamp: 0,
        indefiniteWhitelistCount: 0,
      });

      await requesterAuthorizerWithAirnode
        .connect(airnodeWallet)
        .setWhitelistExpiration(airnodeWallet.address, endpointId, alice.address, expirationTimestamp.getTime());
      out = execCommand(
        'get-whitelist-status',
        ['--provider-url', PROVIDER_URL],
        ['--requester-authorizer-with-airnode-address', requesterAuthorizerWithAirnode.address],
        ['--endpoint-id', endpointId],
        ['--requester-address', alice.address],
        ['--airnode-address', airnodeWallet.address]
      );
      expect(JSON.parse(out)).toEqual(
        expect.objectContaining({
          expirationTimestamp: expirationTimestamp.getTime(),
        })
      );

      await requesterAuthorizerWithAirnode
        .connect(airnodeWallet)
        .setIndefiniteWhitelistStatus(airnodeWallet.address, endpointId, alice.address, true);
      out = execCommand(
        'get-whitelist-status',
        ['--provider-url', PROVIDER_URL],
        ['--requester-authorizer-with-airnode-address', requesterAuthorizerWithAirnode.address],
        ['--endpoint-id', endpointId],
        ['--requester-address', alice.address],
        ['--airnode-address', airnodeWallet.address]
      );
      expect(JSON.parse(out)).toEqual(
        expect.objectContaining({
          indefiniteWhitelistCount: 1,
        })
      );
    });

    it('can get if requester is whitelist', async () => {
      let out = execCommand(
        'is-requester-whitelisted',
        ['--provider-url', PROVIDER_URL],
        ['--requester-authorizer-with-airnode-address', requesterAuthorizerWithAirnode.address],
        ['--endpoint-id', endpointId],
        ['--requester-address', alice.address],
        ['--airnode-address', airnodeWallet.address]
      );
      expect(out).toEqual('Is requester whitelisted: false');

      await requesterAuthorizerWithAirnode
        .connect(airnodeWallet)
        .setWhitelistExpiration(airnodeWallet.address, endpointId, alice.address, expirationTimestamp.getTime());
      out = execCommand(
        'is-requester-whitelisted',
        ['--provider-url', PROVIDER_URL],
        ['--requester-authorizer-with-airnode-address', requesterAuthorizerWithAirnode.address],
        ['--endpoint-id', endpointId],
        ['--requester-address', alice.address],
        ['--airnode-address', airnodeWallet.address]
      );
      expect(out).toEqual('Is requester whitelisted: true');
    });

    it('can derive airnode address', () => {
      const out = execCommand('derive-airnode-address', ['--airnode-mnemonic', airnodeWallet.mnemonic.phrase]);
      expect(out).toEqual(`Airnode address: ${airnodeWallet.address}`);
    });
  });

  describe('has valid examples', () => {
    const exampleOutcomes = [
      'Airnode address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      'Sponsor wallet address: 0x61cF9Eb3691A715e7B2697a36e9e60FdA40A8617',
      'Endpoint ID: 0x901843fb332b24a9a71a2234f2a7c82214b7b70e99ab412e7d1827b743f63f61',
    ];

    cliExamples.forEach((command: string, index: number) => {
      it(`tests example command ${index}`, () => {
        const out = execSync(`node ${CLI_EXECUTABLE} ${command}`).toString().trim();
        expect(out).toEqual(exampleOutcomes[index]);
      });
    });
  });

  describe('parse transaction overrides', () => {
    it('returns EIP1559 overrides on EIP1559 network with empty input', async () => {
      const overrides = await admin.parseOverrides(provider);
      expect(overrides.maxFeePerGas).toBeDefined();
      expect(overrides.maxPriorityFeePerGas).toBeDefined();
      expect(overrides.gasPrice).toBeUndefined();
    });

    it('returns legacy overrides on legacy network with empty input', async () => {
      jest.spyOn(provider, 'getFeeData').mockResolvedValueOnce({
        gasPrice: ethers.BigNumber.from(50),
        maxFeePerGas: null,
        maxPriorityFeePerGas: null,
        lastBaseFeePerGas: null,
      });
      const overrides = await admin.parseOverrides(provider);

      expect(overrides.gasPrice).toBeDefined();
      expect(overrides.maxFeePerGas).toBeUndefined();
      expect(overrides.maxPriorityFeePerGas).toBeUndefined();
    });

    it('returns unmodified eip1559 override inputs', async () => {
      const inputOverrides = {
        maxFeePerGas: ethers.utils.parseUnits('20', 'gwei'),
        maxPriorityFeePerGas: ethers.utils.parseUnits('10', 'gwei'),
        gasLimit: ethers.BigNumber.from('200000'),
      };
      const overrides = await admin.parseOverrides(provider, inputOverrides);
      expect(overrides).toEqual(inputOverrides);
    });

    it('returns unmodified legacy override inputs', async () => {
      const inputOverrides = {
        gasPrice: ethers.utils.parseUnits('10', 'gwei'),
        gasLimit: ethers.BigNumber.from('200000'),
      };
      const overrides = await admin.parseOverrides(provider, inputOverrides);
      expect(overrides).toEqual(inputOverrides);
    });

    it('throws on mixed overrides', async () => {
      await expect(
        admin.parseOverrides(provider, {
          gasPrice: ethers.utils.parseUnits('10', 'gwei'),
          gasLimit: ethers.BigNumber.from('200000'),
          maxFeePerGas: ethers.utils.parseUnits('20', 'gwei'),
          maxPriorityFeePerGas: ethers.utils.parseUnits('10', 'gwei'),
        })
      ).rejects.toThrow('Both legacy and EIP1559 override pricing options specified - ambiguous');
    });

    it('throws when providing EIP1559 overrides on legacy network', async () => {
      jest.spyOn(provider, 'getFeeData').mockResolvedValueOnce({
        gasPrice: ethers.BigNumber.from(50),
        maxFeePerGas: null,
        maxPriorityFeePerGas: null,
        lastBaseFeePerGas: null,
      });
      await expect(
        admin.parseOverrides(provider, {
          gasLimit: ethers.BigNumber.from('200000'),
          maxFeePerGas: ethers.utils.parseUnits('20', 'gwei'),
          maxPriorityFeePerGas: ethers.utils.parseUnits('10', 'gwei'),
        })
      ).rejects.toThrow('EIP1559 override pricing specified on legacy network');
    });
  });
});
