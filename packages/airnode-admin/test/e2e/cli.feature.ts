import { execSync } from 'child_process';
import difference from 'lodash/difference';
import {
  AirnodeRrp,
  AirnodeRrpFactory,
  authorizers,
  RequesterAuthorizerWithAirnode,
  AccessControlRegistry,
  AccessControlRegistryFactory,
} from '@api3/airnode-protocol';
import { ethers } from 'ethers';
import * as admin from '../../src';

const PROVIDER_URL = 'http://127.0.0.1:8545/';
const CLI_EXECUTABLE = `${__dirname}/../../dist/src/cli.js`;
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
    if (DEBUG_COMMANDS) console.log(`Executing command: ${formattedCommand}`);
    try {
      return execSync(`node ${CLI_EXECUTABLE} ${formattedCommand}`).toString().trim();
    } catch (e: any) {
      // rethrow the output of the CLI
      throw new Error(e.stdout.toString().trim());
    }
  };

  const deriveSponsorWallet = async (airnodeMnemonic: string, sponsorAddress: string): Promise<ethers.Wallet> => {
    return ethers.Wallet.fromMnemonic(
      airnodeMnemonic,
      `m/44'/60'/0'/${admin.deriveWalletPathFromSponsorAddress(sponsorAddress)}`
    ).connect(provider);
  };

  beforeAll(() => {
    jest.setTimeout(45_000);

    provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
    deployer = provider.getSigner();
    alice = ethers.Wallet.fromMnemonic(mnemonic, aliceDerivationPath).connect(provider);
    bob = ethers.Wallet.fromMnemonic(mnemonic, bobDerivationPath).connect(provider);
  });

  beforeEach(async () => {
    airnodeRrp = await new AirnodeRrpFactory(deployer).deploy();

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
    it('errors out with wrong xpub message', async () => {
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
  });

  describe('withdrawal', () => {
    let sponsor: ethers.Wallet;
    let sponsorWallet: ethers.Wallet;
    const sponsorBalance = async () => await sponsor.getBalance();

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
  });

  it('generates mnemonic', () => {
    const out = execCommand('generate-mnemonic');

    const explanationInfo = [
      'This mnemonic is created locally on your machine using "ethers.Wallet.createRandom" under the hood.',
      'Make sure to back it up securely, e.g., by writing it down on a piece of paper:',
      '',
    ]
      .map((str) => `${str}\n`)
      .join('');

    expect(out.startsWith(explanationInfo)).toBe(true);
    const mnemonic = out.split(explanationInfo)[1];

    const words = mnemonic.split(' ');
    expect(words).toHaveLength(12);
    words.forEach((word) => expect(word).toMatch(/\w+/));
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
      await accessControlRegistry
        .connect(airnodeWallet)
        .initializeAndGrantRoles(
          [
            await accessControlRegistry.deriveRootRole(airnodeWallet.address),
            await requesterAuthorizerWithAirnode.deriveAdminRole(airnodeWallet.address),
            await requesterAuthorizerWithAirnode.deriveAdminRole(airnodeWallet.address),
            await requesterAuthorizerWithAirnode.deriveAdminRole(airnodeWallet.address),
          ],
          [
            await requesterAuthorizerWithAirnode.adminRoleDescription(),
            await requesterAuthorizerWithAirnode.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION(),
            await requesterAuthorizerWithAirnode.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION(),
            await requesterAuthorizerWithAirnode.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION(),
          ],
          [airnodeWallet.address, bob.address, alice.address, alice.address],
          { gasLimit: 500000 }
        );
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
});
