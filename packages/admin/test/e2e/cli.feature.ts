import { execSync } from 'child_process';
import difference from 'lodash/difference';
import { AirnodeRrp, AirnodeRrpFactory, authorizers, AirnodeRequesterRrpAuthorizer } from '@api3/protocol';
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

  const deriveSponsorWallet = async (wallet: ethers.Wallet, sponsor: string) => {
    const airnodeMnemonic = wallet.mnemonic.phrase;
    const derivationPath = admin.deriveWalletPathFromSponsorAddress(sponsor);
    return ethers.Wallet.fromMnemonic(airnodeMnemonic, derivationPath).connect(provider);
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

  describe('derive-sponsor-wallet-address', () => {
    it('derives using provided xpub arg', async () => {
      const sponsorAddress = alice.address;

      const airnodeHdNode = ethers.utils.HDNode.fromMnemonic(airnodeWallet.mnemonic.phrase);
      const airnodeXpub = airnodeHdNode.neuter().extendedKey;

      // Derive the wallet using CLI and admin SDK
      const out = execCommand(
        'derive-sponsor-wallet-address',
        ['--provider-url', PROVIDER_URL],
        ['--airnode-rrp', airnodeRrp.address],
        ['--airnode-address', airnodeWallet.address],
        ['--sponsor-address', sponsorAddress],
        ['--xpub', airnodeXpub]
      );

      // Derive the wallet programatically
      const sponsorWallet = await deriveSponsorWallet(airnodeWallet, sponsorAddress);

      // Check that they generate the same wallet address
      expect(out).toBe(`Sponsor wallet address: ${sponsorWallet.address}`);
    });
    it('derives using on chain xpub', async () => {
      const sponsorAddress = alice.address;

      airnodeRrp = airnodeRrp.connect(airnodeWallet);
      await admin.setAirnodeXpub(airnodeRrp);

      // Derive the wallet using CLI and admin SDK
      const out = execCommand(
        'derive-sponsor-wallet-address',
        ['--provider-url', PROVIDER_URL],
        ['--airnode-rrp', airnodeRrp.address],
        ['--airnode-address', airnodeWallet.address],
        ['--sponsor-address', sponsorAddress]
      );

      // Derive the wallet programatically
      const sponsorWallet = await deriveSponsorWallet(airnodeWallet, sponsorAddress);

      // Check that they generate the same wallet address
      expect(out).toBe(`Sponsor wallet address: ${sponsorWallet.address}`);
    });
    it('errors out with missing xpub message', async () => {
      const sponsorAddress = alice.address;
      expect(() =>
        execCommand(
          'derive-sponsor-wallet-address',
          ['--provider-url', PROVIDER_URL],
          ['--airnode-rrp', airnodeRrp.address],
          ['--airnode-address', airnodeWallet.address],
          ['--sponsor-address', sponsorAddress]
        )
      ).toThrow('Airnode xpub is missing in AirnodeRrp contract');
    });
  });

  describe('sponsorship', () => {
    it('starts sponsoring requester', async () => {
      const sponsorAddress = alice.address;
      const requesterAddress = bob.address;

      const out = execCommand(
        'sponsor-requester',
        ['--provider-url', PROVIDER_URL],
        ['--airnode-rrp', airnodeRrp.address],
        ['--mnemonic', mnemonic],
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
        ['--mnemonic', mnemonic],
        ['--derivation-path', aliceDerivationPath],
        ['--provider-url', PROVIDER_URL],
        ['--airnode-rrp', airnodeRrp.address],
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
          ['--airnode-rrp', airnodeRrp.address],
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
        ['--airnode-rrp', airnodeRrp.address],
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
        ['--airnode-rrp', airnodeRrp.address],
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
      sponsorWallet = await deriveSponsorWallet(airnodeWallet, sponsor.address);
      await deployer.sendTransaction({
        to: sponsorWallet.address,
        value: ethers.utils.parseEther('1'),
      });
    });

    it('can create and fulfill withdrawal request', async () => {
      const requestWithdrawalOutput = execCommand(
        'request-withdrawal',
        ['--mnemonic', mnemonic],
        ['--derivation-path', aliceDerivationPath],
        ['--provider-url', PROVIDER_URL],
        ['--airnode-rrp', airnodeRrp.address],
        ['--airnode-address', airnodeWallet.address],
        ['--sponsor-wallet-address', sponsorWallet.address]
      );

      expect(requestWithdrawalOutput).toMatch(new RegExp(`Withdrawal request ID: 0x\\w+`));
      const withdrawalRequestId = requestWithdrawalOutput.split('Withdrawal request ID: ')[1];

      const checkWithdrawalStatus = () =>
        execCommand(
          'check-withdrawal-request',
          ['--provider-url', PROVIDER_URL],
          ['--airnode-rrp', airnodeRrp.address],
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

  it('can set/get airnode xpub', async () => {
    const airnodeHdNode = ethers.utils.HDNode.fromMnemonic(airnodeWallet.mnemonic.phrase);
    const airnodeXpub = airnodeHdNode.neuter().extendedKey;

    const setAirnodeXpubOut = execCommand(
      'set-airnode-xpub',
      ['--mnemonic', airnodeWallet.mnemonic.phrase],
      ['--derivation-path', airnodeWallet.mnemonic.path],
      ['--provider-url', PROVIDER_URL],
      ['--airnode-rrp', airnodeRrp.address]
    );
    expect(setAirnodeXpubOut).toEqual(`Airnode xpub: ${airnodeXpub}`);

    const getAirnodeXpubOut = execCommand(
      'get-airnode-xpub',
      ['--provider-url', PROVIDER_URL],
      ['--airnode-rrp', airnodeRrp.address],
      ['--airnode-address', airnodeWallet.address]
    );

    expect(getAirnodeXpubOut).toEqual(`Airnode xpub: ${airnodeXpub}`);
  });

  it('derives endpoint ID', () => {
    const oisTitle = 'title';
    const endpointName = 'endpoint';

    const out = execCommand('derive-endpoint-id', ['--ois-title', oisTitle], ['--endpoint-name', endpointName]);

    const expected = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(['string'], [`${oisTitle}_${endpointName}`])
    );
    expect(out).toBe(`Endpoint ID: ${expected}`);
  });

  describe('incorrect usage', () => {
    it('is missing command parameter', () => {
      expect(() =>
        execCommand(
          'sponsor-requester',
          ['--mnemonic', mnemonic],
          ['--derivation-path', 'm/0/973563544/2109481170/2137349576/871269377/610184194/17'],
          ['--provider-url', PROVIDER_URL],
          ['--airnode-rrp', airnodeRrp.address]
          // missing ['--requester-address', requester]
        )
      ).toThrow('Missing required argument: requester');
    });

    it('unknown command', () => {
      expect(() =>
        execCommand('not-existent-command', ['--mnemonic', mnemonic], ['--provider-url', PROVIDER_URL])
      ).toThrow('Unknown arguments: mnemonic, provider-url, providerUrl, not-existent-command');
    });
  });

  describe('AirnodeRequesterRrpAuthorizer', () => {
    const AdminRank = Object.freeze({
      Unauthorized: 0,
      Admin: 1,
      SuperAdmin: 2,
    });
    const oisTitle = 'title';
    const endpointName = 'endpoint';
    const endpointId = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(['string'], [`${oisTitle}_${endpointName}`])
    );
    const expirationTimestamp = new Date('2031-09-23T13:04:13Z');
    let airnodeRequesterRrpAuthorizer: AirnodeRequesterRrpAuthorizer;

    beforeEach(async () => {
      airnodeRequesterRrpAuthorizer = await new authorizers.AirnodeRequesterRrpAuthorizerFactory(deployer).deploy();

      await airnodeRequesterRrpAuthorizer
        .connect(airnodeWallet)
        .setRank(airnodeWallet.address, bob.address, AdminRank.Admin, { gasLimit: 500000 });
    });

    it('sets whitelist expiration timestamp', async () => {
      let whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
        airnodeWallet.address,
        endpointId,
        alice.address
      );
      expect(whitelistStatus.expirationTimestamp.toNumber()).toEqual(0);
      expect(whitelistStatus.whitelistedPastExpiration).toEqual(false);

      const setWhitelistExpirationOut = execCommand(
        'set-whitelist-expiration',
        ['--mnemonic', airnodeWallet.mnemonic.phrase],
        ['--derivation-path', airnodeWallet.mnemonic.path],
        ['--provider-url', PROVIDER_URL],
        ['--airnode-requester-rrp-authorizer', airnodeRequesterRrpAuthorizer.address],
        ['--endpoint-id', endpointId],
        ['--user-address', alice.address],
        ['--expiration-timestamp', expirationTimestamp.getTime()],
        ['--airnode-address', airnodeWallet.address]
      );
      expect(setWhitelistExpirationOut).toEqual(
        `Whitelist expiration: ${expirationTimestamp.toUTCString()} (${expirationTimestamp.getTime()})`
      );

      whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
        airnodeWallet.address,
        endpointId,
        alice.address
      );
      expect(whitelistStatus.expirationTimestamp.toNumber()).toEqual(expirationTimestamp.getTime());
      expect(whitelistStatus.whitelistedPastExpiration).toEqual(false);
    });

    it('extends whitelist expiration timestamp', async () => {
      // New expiration timestamp is a month from expirationTimestamp
      const extendedExpirationTimestamp = new Date(expirationTimestamp);
      extendedExpirationTimestamp.setMonth(expirationTimestamp.getMonth() + 1);

      await airnodeRequesterRrpAuthorizer
        .connect(airnodeWallet)
        .setWhitelistExpiration(airnodeWallet.address, endpointId, alice.address, expirationTimestamp.getTime());
      let whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
        airnodeWallet.address,
        endpointId,
        alice.address
      );
      expect(whitelistStatus.expirationTimestamp.toNumber()).toEqual(expirationTimestamp.getTime());
      expect(whitelistStatus.whitelistedPastExpiration).toEqual(false);

      const extendWhitelistExpirationOut = execCommand(
        'extend-whitelist-expiration',
        ['--mnemonic', bob.mnemonic.phrase], // An admin should be able to extend whitelist expiration
        ['--derivation-path', bobDerivationPath],
        ['--provider-url', PROVIDER_URL],
        ['--airnode-requester-rrp-authorizer', airnodeRequesterRrpAuthorizer.address],
        ['--endpoint-id', endpointId],
        ['--user-address', alice.address],
        ['--expiration-timestamp', extendedExpirationTimestamp.getTime()],
        ['--airnode-address', airnodeWallet.address]
      );
      expect(extendWhitelistExpirationOut).toEqual(
        `Whitelist expiration: ${extendedExpirationTimestamp.toUTCString()} (${extendedExpirationTimestamp.getTime()})`
      );

      whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
        airnodeWallet.address,
        endpointId,
        alice.address
      );
      expect(whitelistStatus.expirationTimestamp.toNumber()).toEqual(extendedExpirationTimestamp.getTime());
      expect(whitelistStatus.whitelistedPastExpiration).toEqual(false);
    });

    it('sets the whitelist status of a user past expiration', async () => {
      await airnodeRequesterRrpAuthorizer
        .connect(airnodeWallet)
        .setWhitelistExpiration(airnodeWallet.address, endpointId, alice.address, expirationTimestamp.getTime());
      let whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
        airnodeWallet.address,
        endpointId,
        alice.address
      );
      expect(whitelistStatus.expirationTimestamp.toNumber()).toEqual(expirationTimestamp.getTime());
      expect(whitelistStatus.whitelistedPastExpiration).toEqual(false);

      const setWhitelistStatusPastExpirationOut = execCommand(
        'set-whitelist-status-past-expiration',
        ['--mnemonic', airnodeWallet.mnemonic.phrase],
        ['--derivation-path', airnodeWallet.mnemonic.path],
        ['--provider-url', PROVIDER_URL],
        ['--airnode-requester-rrp-authorizer', airnodeRequesterRrpAuthorizer.address],
        ['--endpoint-id', endpointId],
        ['--user-address', alice.address],
        ['--whitelist-status-past-expiration', true],
        ['--airnode-address', airnodeWallet.address]
      );
      expect(setWhitelistStatusPastExpirationOut).toEqual(`Whitelist status: ${true}`);

      whitelistStatus = await airnodeRequesterRrpAuthorizer.airnodeToEndpointIdToUserToWhitelistStatus(
        airnodeWallet.address,
        endpointId,
        alice.address
      );
      expect(whitelistStatus.expirationTimestamp.toNumber()).toEqual(expirationTimestamp.getTime());
      expect(whitelistStatus.whitelistedPastExpiration).toEqual(true);
    });

    it('can get whitelist status', async () => {
      let out = execCommand(
        'get-whitelist-status',
        ['--provider-url', PROVIDER_URL],
        ['--airnode-requester-rrp-authorizer', airnodeRequesterRrpAuthorizer.address],
        ['--endpoint-id', endpointId],
        ['--user-address', alice.address],
        ['--airnode-address', airnodeWallet.address]
      );
      expect(JSON.parse(out)).toEqual({
        expirationTimestamp: 0,
        whitelistedPastExpiration: false,
      });

      await airnodeRequesterRrpAuthorizer
        .connect(airnodeWallet)
        .setWhitelistExpiration(airnodeWallet.address, endpointId, alice.address, expirationTimestamp.getTime());
      out = execCommand(
        'get-whitelist-status',
        ['--provider-url', PROVIDER_URL],
        ['--airnode-requester-rrp-authorizer', airnodeRequesterRrpAuthorizer.address],
        ['--endpoint-id', endpointId],
        ['--user-address', alice.address],
        ['--airnode-address', airnodeWallet.address]
      );
      expect(JSON.parse(out)).toEqual(
        expect.objectContaining({
          expirationTimestamp: expirationTimestamp.getTime(),
        })
      );

      await airnodeRequesterRrpAuthorizer
        .connect(airnodeWallet)
        .setWhitelistStatusPastExpiration(airnodeWallet.address, endpointId, alice.address, true);
      out = execCommand(
        'get-whitelist-status',
        ['--provider-url', PROVIDER_URL],
        ['--airnode-requester-rrp-authorizer', airnodeRequesterRrpAuthorizer.address],
        ['--endpoint-id', endpointId],
        ['--user-address', alice.address],
        ['--airnode-address', airnodeWallet.address]
      );
      expect(JSON.parse(out)).toEqual(
        expect.objectContaining({
          whitelistedPastExpiration: true,
        })
      );
    });

    it('can get if user is whitelist', async () => {
      let out = execCommand(
        'is-user-whitelisted',
        ['--provider-url', PROVIDER_URL],
        ['--airnode-requester-rrp-authorizer', airnodeRequesterRrpAuthorizer.address],
        ['--endpoint-id', endpointId],
        ['--user-address', alice.address],
        ['--airnode-address', airnodeWallet.address]
      );
      expect(out).toEqual('Is user whitelisted: false');

      await airnodeRequesterRrpAuthorizer
        .connect(airnodeWallet)
        .setWhitelistExpiration(airnodeWallet.address, endpointId, alice.address, expirationTimestamp.getTime());
      out = execCommand(
        'is-user-whitelisted',
        ['--provider-url', PROVIDER_URL],
        ['--airnode-requester-rrp-authorizer', airnodeRequesterRrpAuthorizer.address],
        ['--endpoint-id', endpointId],
        ['--user-address', alice.address],
        ['--airnode-address', airnodeWallet.address]
      );
      expect(out).toEqual('Is user whitelisted: true');
    });
  });
});
