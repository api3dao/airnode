import * as fs from 'fs';
import { exit } from 'process';
import * as yargs from 'yargs';
import * as evm from './evm';
import * as admin from '.';

const COMMON_COMMAND_ARGUMENTS = {
  airnodeRrpCommands: {
    providerUrl: {
      type: 'string',
      demandOption: true,
      describe: 'URL of the blockchain provider',
    },
    airnodeRrp: {
      type: 'string',
      describe: 'Address of the deployed AirnodeRrp contract',
    },
    xpub: {
      type: 'string',
      describe: 'Extended public key for the Airnode wallet',
    },
  },
  mnemonicCommands: {
    mnemonic: {
      type: 'string',
      demandOption: true,
      describe: 'Mnemonic phrase for the wallet',
    },
    derivationPath: {
      type: 'string',
      describe: 'Derivation path to be used for deriving the wallet account',
    },
  },
  sponsor: {
    type: 'string',
    demandOption: true,
    describe: 'Address of the sponsor',
  },
  airnode: {
    type: 'string',
    demandOption: true,
    describe: "Address of the Airnode operator default BIP 44 wallet (m/44'/60'/0'/0/0)",
  },
  sponsorWallet: {
    type: 'string',
    demandOption: true,
    describe: 'Address of the sponsor wallet that is used by the Airnode to fulfill the request',
  },
  requester: {
    type: 'string',
    demandOption: true,
    describe: 'Address of the requester contract',
  },
  withdrawalRequestId: {
    type: 'string',
    demandOption: true,
    describe: 'Withdrawal request ID',
  },
} as const;

const { airnodeRrpCommands, mnemonicCommands, sponsor, airnode, sponsorWallet, requester, withdrawalRequestId } =
  COMMON_COMMAND_ARGUMENTS;

const toJSON = JSON.stringify;

yargs
  .command(
    'derive-sponsor-wallet',
    'Derives the address of the wallet for an airnode-sponsor pair',
    {
      ...airnodeRrpCommands,
      airnode,
      sponsor,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args.providerUrl, args.airnodeRrp);
      const sponsorWallet = await admin.deriveSponsorWallet(airnodeRrp, args.airnode, args.sponsor, args.xpub);
      console.log(`Sponsor wallet address: ${sponsorWallet}`);
    }
  )
  .command(
    'sponsor-requester',
    'Allows a requester to make requests that will be fulfilled by the Airnode using the sponsor wallet',
    {
      ...airnodeRrpCommands,
      ...mnemonicCommands,
      requester,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(
        args.mnemonic,
        args.derivationPath,
        args.providerUrl,
        args.airnodeRrp
      );
      const requester = await admin.sponsorRequester(airnodeRrp, args.requester);
      console.log(`Requester address ${requester} is now sponsored by ${await airnodeRrp.signer.getAddress()}`);
    }
  )
  .command(
    'unsponsor-requester',
    'Disallow a requester to make requests to the airnode',
    {
      ...airnodeRrpCommands,
      ...mnemonicCommands,
      requester,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(
        args.mnemonic,
        args.derivationPath,
        args.providerUrl,
        args.airnodeRrp
      );
      const requester = await admin.unsponsorRequester(airnodeRrp, args.requester);
      console.log(`Requester address ${requester} is no longer sponsored by ${await airnodeRrp.signer.getAddress()}`);
    }
  )
  .command(
    'get-sponsor-status',
    'Returns the sponsorship status for the given sponsor and requester',
    {
      ...airnodeRrpCommands,
      sponsor,
      requester,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args.providerUrl, args.airnodeRrp);
      const status = await admin.sponsorToRequesterToSponsorshipStatus(airnodeRrp, args.sponsor, args.requester);
      console.log(`Requester sponsored: ${status}`);
    }
  )
  .command(
    'create-template',
    'Creates a template and returns its ID',
    {
      ...airnodeRrpCommands,
      ...mnemonicCommands,
      templateFilePath: {
        type: 'string',
        demandOption: true,
        describe: 'Path of the template JSON file',
      },
    },
    async (args) => {
      const template = JSON.parse(fs.readFileSync(args.templateFilePath).toString());
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(
        args.mnemonic,
        args.derivationPath,
        args.providerUrl,
        args.airnodeRrp
      );
      const templateId = await admin.createTemplate(airnodeRrp, template);
      console.log(`Template ID: ${templateId}`);
    }
  )
  .command(
    'get-template',
    'Returns the template for the given templateId',
    {
      ...airnodeRrpCommands,
      templateId: {
        type: 'string',
        demandOption: true,
        describe: 'Onchain ID of the template',
      },
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args.providerUrl, args.airnodeRrp);
      const parameters = await admin.getTemplate(airnodeRrp, args.templateId);
      console.log(toJSON(parameters));
    }
  )
  .command(
    'request-withdrawal',
    'Requests withdrawal from the designated wallet of an Airnode as a sponsor',
    {
      ...airnodeRrpCommands,
      ...mnemonicCommands,
      airnode,
      sponsorWallet,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(
        args.mnemonic,
        args.derivationPath,
        args.providerUrl,
        args.airnodeRrp
      );
      const withdrawalRequestId = await admin.requestWithdrawal(airnodeRrp, args.airnode, args.sponsorWallet);
      console.log(`Withdrawal request ID: ${withdrawalRequestId}`);
    }
  )
  .command(
    'check-withdrawal-request',
    'Checks the state of the withdrawal request',
    {
      ...airnodeRrpCommands,
      withdrawalRequestId,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args.providerUrl, args.airnodeRrp);
      const response = await admin.checkWithdrawalRequest(airnodeRrp, args.withdrawalRequestId);
      if (response) {
        console.log(`Withdrawn amount: ${response.amount}`);
      } else {
        console.log(`Withdrawal request is not fulfilled yet`);
      }
    }
  )
  .command(
    'set-airnode-xpub',
    'Sets the xpub of an Airnode',
    {
      ...airnodeRrpCommands,
      ...mnemonicCommands,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(
        args.mnemonic,
        args.derivationPath,
        args.providerUrl,
        args.airnodeRrp
      );
      const xpub = await admin.setAirnodeXpub(airnodeRrp);
      console.log(`Airnode xpub: ${xpub}`);
    }
  )
  .command(
    'get-airnode-xpub',
    'Returns the Airnode xpub for the given airnode',
    {
      ...airnodeRrpCommands,
      airnode,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args.providerUrl, args.airnodeRrp);
      const xpub = await admin.getAirnodeXpub(airnodeRrp, args.airnode);
      console.log(`Airnode xpub: ${xpub}`);
    }
  )
  .command(
    'derive-endpoint-id',
    'Derives an endpoint ID using the OIS title and endpoint name',
    {
      oisTitle: {
        type: 'string',
        demandOption: true,
        describe: 'Title of the OIS that the endpoint belongs to',
      },
      endpointName: {
        type: 'string',
        demandOption: true,
        describe: 'Name of the endpoint',
      },
    },
    async (args) => {
      const endpointId = await admin.deriveEndpointId(args.oisTitle, args.endpointName);
      console.log(`Endpoint ID: ${endpointId}`);
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
  .help().argv;
