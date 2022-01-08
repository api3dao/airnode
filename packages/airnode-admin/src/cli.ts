import * as fs from 'fs';
import { exit } from 'process';
import * as yargs from 'yargs';
import * as evm from './evm';
import * as admin from './implementation';

const COMMON_COMMAND_ARGUMENTS = {
  airnodeRrpCommands: {
    'provider-url': {
      type: 'string',
      demandOption: true,
      describe: 'URL of the blockchain provider',
    },
    'airnode-rrp-address': {
      type: 'string',
      describe: 'Address of the deployed AirnodeRrp contract',
    },
  },
  requesterAuthorizerWithAirnodeCommands: {
    'provider-url': {
      type: 'string',
      demandOption: true,
      describe: 'URL of the blockchain provider',
    },
    'requester-authorizer-with-airnode-address': {
      type: 'string',
      describe: 'Address of the deployed RequesterAuthorizerWithAirnode contract',
    },
    'endpoint-id': {
      type: 'string',
      demandOption: true,
      describe: 'The ID of the endpoint as a bytes32 string',
    },
    'requester-address': {
      type: 'string',
      demandOption: true,
      describe: 'Address of the requester',
    },
  },
  userWallet: {
    mnemonic: {
      type: 'string',
      demandOption: true,
      describe: 'Mnemonic phrase for the wallet used to make transactions',
    },
    'derivation-path': {
      type: 'string',
      describe: 'Derivation path to be used for deriving the wallet account',
    },
  },
  airnodeMnemonic: {
    type: 'string',
    demandOption: true,
    describe: 'Airnode mnemonic phrase',
  },
  sponsorWallet: {
    'sponsor-mnemonic': {
      type: 'string',
      demandOption: true,
      describe: 'Mnemonic phrase of the sponsor wallet',
    },
    'derivation-path': {
      type: 'string',
      describe: 'Derivation path to be used for deriving the sponsor wallet account',
    },
  },
  airnodeXpub: {
    type: 'string',
    demandOption: true,
    describe: 'Extended public key for the Airnode wallet',
  },
  sponsorAddress: {
    type: 'string',
    demandOption: true,
    describe: 'Address of the sponsor',
  },
  airnodeAddress: {
    type: 'string',
    demandOption: true,
    describe: "Address of the Airnode operator default BIP 44 wallet (m/44'/60'/0'/0/0)",
  },
  sponsorWalletAddress: {
    type: 'string',
    demandOption: true,
    describe: 'Address of the sponsor wallet that is used by the Airnode to fulfill the request',
  },
  requesterAddress: {
    type: 'string',
    demandOption: true,
    describe: 'Address of the requester contract',
  },
  withdrawalRequestId: {
    type: 'string',
    demandOption: true,
    describe: 'Withdrawal request ID',
  },
  expirationTimestamp: {
    type: 'number',
    demandOption: true,
    describe: 'The Unix timestamp at which the whitelisting of the requester will expire',
  },
  indefiniteWhitelistStatus: {
    type: 'boolean',
    demandOption: true,
    describe: 'Indefinite whitelist status that the requester will have',
  },
} as const;

const {
  airnodeAddress,
  airnodeMnemonic,
  requesterAuthorizerWithAirnodeCommands,
  airnodeRrpCommands,
  airnodeXpub,
  requesterAddress,
  sponsorAddress,
  sponsorWallet,
  sponsorWalletAddress,
  userWallet,
  withdrawalRequestId,
  expirationTimestamp,
  indefiniteWhitelistStatus,
} = COMMON_COMMAND_ARGUMENTS;

const toJSON = JSON.stringify;

yargs
  .command(
    'derive-airnode-xpub',
    'Derives the Airnode extended public key',
    {
      'airnode-mnemonic': airnodeMnemonic,
    },
    async (args) => {
      const xpub = await admin.deriveAirnodeXpub(args['airnode-mnemonic']);
      console.log(`Airnode xpub: ${xpub}`);
    }
  )
  .command(
    'verify-airnode-xpub',
    'Verifies that the xpub belongs to the Airnode wallet',
    {
      'airnode-xpub': airnodeXpub,
      'airnode-address': airnodeAddress,
    },
    async (args) => {
      try {
        admin.verifyAirnodeXpub(args['airnode-xpub'], args['airnode-address']);
        console.log(`Airnode xpub is: VALID`);
      } catch {
        console.log(`Airnode xpub is: INVALID`);
      }
    }
  )
  .command(
    'derive-sponsor-wallet-address',
    'Derives the address of the wallet for an airnode-sponsor pair',
    {
      'airnode-xpub': airnodeXpub,
      'airnode-address': airnodeAddress,
      'sponsor-address': sponsorAddress,
    },
    async (args) => {
      const sponsorWalletAddress = await admin.deriveSponsorWalletAddress(
        args['airnode-xpub'],
        args['airnode-address'],
        args['sponsor-address']
      );
      console.log(`Sponsor wallet address: ${sponsorWalletAddress}`);
    }
  )
  .command(
    'sponsor-requester',
    'Allows a requester to make requests that will be fulfilled by the Airnode using the sponsor wallet',
    {
      ...airnodeRrpCommands,
      ...sponsorWallet,
      'requester-address': requesterAddress,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args['provider-url'], {
        airnodeRrpAddress: args['airnode-rrp-address'],
        signer: { mnemonic: args['sponsor-mnemonic'], derivationPath: args['derivation-path'] },
      });
      const requesterAddress = await admin.sponsorRequester(airnodeRrp, args['requester-address']);
      console.log(`Requester address ${requesterAddress} is now sponsored by ${await airnodeRrp.signer.getAddress()}`);
    }
  )
  .command(
    'unsponsor-requester',
    'Disallow a requester to make requests to the Airnode',
    {
      ...airnodeRrpCommands,
      ...sponsorWallet,
      'requester-address': requesterAddress,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args['provider-url'], {
        airnodeRrpAddress: args['airnode-rrp-address'],
        signer: { mnemonic: args['sponsor-mnemonic'], derivationPath: args['derivation-path'] },
      });
      const requesterAddress = await admin.unsponsorRequester(airnodeRrp, args['requester-address']);
      console.log(
        `Requester address ${requesterAddress} is no longer sponsored by ${await airnodeRrp.signer.getAddress()}`
      );
    }
  )
  .command(
    'get-sponsor-status',
    'Returns the sponsorship status for the given sponsor and requester',
    {
      ...airnodeRrpCommands,
      'sponsor-address': sponsorAddress,
      'requester-address': requesterAddress,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args['provider-url'], {
        airnodeRrpAddress: args['airnode-rrp-address'],
      });
      const status = await admin.sponsorToRequesterToSponsorshipStatus(
        airnodeRrp,
        args['sponsor-address'],
        args['requester-address']
      );
      console.log(`Requester address sponsored: ${status}`);
    }
  )
  .command(
    'create-template',
    'Creates a template and returns its ID',
    {
      ...airnodeRrpCommands,
      ...userWallet,
      'template-file-path': {
        type: 'string',
        demandOption: true,
        describe: 'Path of the template JSON file',
      },
    },
    async (args) => {
      const template = JSON.parse(fs.readFileSync(args['template-file-path']).toString());
      const airnodeRrp = await evm.getAirnodeRrp(args['provider-url'], {
        airnodeRrpAddress: args['airnode-rrp-address'],
        signer: { mnemonic: args.mnemonic, derivationPath: args['derivation-path'] },
      });
      const templateId = await admin.createTemplate(airnodeRrp, template);
      console.log(`Template ID: ${templateId}`);
    }
  )
  .command(
    'get-template',
    'Returns the template for the given template-id',
    {
      ...airnodeRrpCommands,
      'template-id': {
        type: 'string',
        demandOption: true,
        describe: 'Onchain ID of the template',
      },
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args['provider-url'], {
        airnodeRrpAddress: args['airnode-rrp-address'],
      });
      const parameters = await admin.getTemplate(airnodeRrp, args['template-id']);
      console.log(toJSON(parameters));
    }
  )
  .command(
    'request-withdrawal',
    'Requests withdrawal from the designated wallet of an Airnode as a sponsor',
    {
      ...airnodeRrpCommands,
      ...sponsorWallet,
      'airnode-address': airnodeAddress,
      'sponsor-wallet-address': sponsorWalletAddress,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args['provider-url'], {
        airnodeRrpAddress: args['airnode-rrp-address'],
        signer: { mnemonic: args['sponsor-mnemonic'], derivationPath: args['derivation-path'] },
      });

      const withdrawalRequestId = await admin.requestWithdrawal(
        airnodeRrp,
        args['airnode-address'],
        args['sponsor-wallet-address']
      );
      console.log(`Withdrawal request ID: ${withdrawalRequestId}`);
    }
  )
  .command(
    'check-withdrawal-request',
    'Checks the state of the withdrawal request',
    {
      ...airnodeRrpCommands,
      'withdrawal-request-id': withdrawalRequestId,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args['provider-url'], {
        airnodeRrpAddress: args['airnode-rrp-address'],
      });
      const response = await admin.checkWithdrawalRequest(airnodeRrp, args['withdrawal-request-id']);
      if (response) {
        console.log(`Withdrawn amount: ${response.amount}`);
      } else {
        console.log(`Withdrawal request is not fulfilled yet`);
      }
    }
  )
  .command(
    'derive-endpoint-id',
    'Derives an endpoint ID using the OIS title and endpoint name',
    {
      'ois-title': {
        type: 'string',
        demandOption: true,
        describe: 'Title of the OIS that the endpoint belongs to',
      },
      'endpoint-name': {
        type: 'string',
        demandOption: true,
        describe: 'Name of the endpoint',
      },
    },
    async (args) => {
      const endpointId = await admin.deriveEndpointId(args['ois-title'], args['endpoint-name']);
      console.log(`Endpoint ID: ${endpointId}`);
    }
  )
  .command(
    'set-whitelist-expiration',
    'Sets whitelist expiration of a requester for the Airnode–endpoint pair',
    {
      ...requesterAuthorizerWithAirnodeCommands,
      ...userWallet,
      'airnode-address': airnodeAddress,
      'expiration-timestamp': expirationTimestamp,
    },
    async (args) => {
      const requesterAuthorizerWithAirnode = await evm.getRequesterAuthorizerWithAirnode(args['provider-url'], {
        requesterAuthorizerWithAirnodeAddress: args['requester-authorizer-with-airnode-address'],
        signer: { mnemonic: args.mnemonic, derivationPath: args['derivation-path'] },
      });

      await admin.setWhitelistExpiration(
        requesterAuthorizerWithAirnode,
        args['airnode-address'],
        args['endpoint-id'],
        args['requester-address'],
        args['expiration-timestamp']
      );
      console.log(
        `Whitelist expiration: ${new Date(args['expiration-timestamp']).toUTCString()} (${
          args['expiration-timestamp']
        })`
      );
    }
  )
  .command(
    'extend-whitelist-expiration',
    'Extends whitelist expiration of a requester for the Airnode–endpoint pair',
    {
      ...requesterAuthorizerWithAirnodeCommands,
      ...userWallet,
      'airnode-address': airnodeAddress,
      'expiration-timestamp': expirationTimestamp,
    },
    async (args) => {
      const requesterAuthorizerWithAirnode = await evm.getRequesterAuthorizerWithAirnode(args['provider-url'], {
        requesterAuthorizerWithAirnodeAddress: args['requester-authorizer-with-airnode-address'],
        signer: { mnemonic: args.mnemonic, derivationPath: args['derivation-path'] },
      });
      await admin.extendWhitelistExpiration(
        requesterAuthorizerWithAirnode,
        args['airnode-address'],
        args['endpoint-id'],
        args['requester-address'],
        args['expiration-timestamp']
      );
      console.log(
        `Whitelist expiration: ${new Date(args['expiration-timestamp']).toUTCString()} (${
          args['expiration-timestamp']
        })`
      );
    }
  )
  .command(
    'set-indefinite-whitelist-status',
    'Sets the indefinite whitelist status of a requester for the Airnode–endpoint pair',
    {
      ...requesterAuthorizerWithAirnodeCommands,
      ...userWallet,
      'airnode-address': airnodeAddress,
      'indefinite-whitelist-status': indefiniteWhitelistStatus,
    },
    async (args) => {
      const requesterAuthorizerWithAirnode = await evm.getRequesterAuthorizerWithAirnode(args['provider-url'], {
        requesterAuthorizerWithAirnodeAddress: args['requester-authorizer-with-airnode-address'],
        signer: { mnemonic: args.mnemonic, derivationPath: args['derivation-path'] },
      });
      await admin.setIndefiniteWhitelistStatus(
        requesterAuthorizerWithAirnode,
        args['airnode-address'],
        args['endpoint-id'],
        args['requester-address'],
        args['indefinite-whitelist-status']
      );
      console.log(`Whitelist status: ${args['indefinite-whitelist-status']}`);
    }
  )
  .command(
    'get-whitelist-status',
    'Returns the detailed whitelist status of a requester for the Airnode–endpoint pair',
    {
      ...requesterAuthorizerWithAirnodeCommands,
      'airnode-address': airnodeAddress,
    },
    async (args) => {
      const requesterAuthorizerWithAirnode = await evm.getRequesterAuthorizerWithAirnode(args['provider-url'], {
        requesterAuthorizerWithAirnodeAddress: args['requester-authorizer-with-airnode-address'],
      });
      const whitelistStatus = await admin.getWhitelistStatus(
        requesterAuthorizerWithAirnode,
        args['airnode-address'],
        args['endpoint-id'],
        args['requester-address']
      );
      console.log(toJSON(whitelistStatus));
    }
  )
  .command(
    'is-requester-whitelisted',
    'Returns a boolean to indicate whether or not the requester is whitelisted to use the Airnode–endpoint pair',
    {
      ...requesterAuthorizerWithAirnodeCommands,
      'airnode-address': airnodeAddress,
    },
    async (args) => {
      const requesterAuthorizerWithAirnode = await evm.getRequesterAuthorizerWithAirnode(args['provider-url'], {
        requesterAuthorizerWithAirnodeAddress: args['requester-authorizer-with-airnode-address'],
      });
      const isRequesterWhitelisted = await admin.isRequesterWhitelisted(
        requesterAuthorizerWithAirnode,
        args['airnode-address'],
        args['endpoint-id'],
        args['requester-address']
      );
      console.log(`Is requester whitelisted: ${isRequesterWhitelisted}`);
    }
  )
  .command(
    'generate-mnemonic',
    'Generates a random mnemonic. Uses "ethers.Wallet.createRandom" under the hood',
    async () => {
      const mnemonic = await admin.generateMnemonic();
      const lines = [
        'This mnemonic is created locally on your machine using "ethers.Wallet.createRandom" under the hood.',
        'Make sure to back it up securely, e.g., by writing it down on a piece of paper:',
        '',
        mnemonic,
      ];
      lines.forEach((line) => console.log(line));
    }
  )
  .command(
    'derive-airnode-address',
    'Derives the airnode address which is the identifier of the particular Airnode on chain',
    { 'airnode-mnemonic': airnodeMnemonic },
    async (args) => {
      const airnodeAddress = await admin.deriveAirnodeAddress(args['airnode-mnemonic']);
      console.log(`Airnode address: ${airnodeAddress}`);
    }
  )
  .demandCommand(1)
  .strict()
  .fail((message, err) => {
    if (message) console.log(message);
    else if (err instanceof Error) console.log(`Command failed with unexpected error:\n\n${err.message}`);
    else console.log(`Command failed with unexpected error:\n\n${err}`);

    exit(1);
  })
  .help()
  .wrap(120).argv;
