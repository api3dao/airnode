import * as fs from 'fs';
import * as yargs from 'yargs';
import * as evm from './evm';
import * as admin from '.';
import { exit } from 'process';

const COMMON_COMMAND_ARGUMENTS = {
  airnodeRrpCommands: {
    providerUrl: {
      type: 'string',
      demandOption: true,
      describe: 'URL of the Ethereum provider',
    },
    airnodeRrp: {
      type: 'string',
      describe: 'Address of the deployed AirnodeRrp contract',
    },
  },
  mnemonicCommands: {
    mnemonic: {
      type: 'string',
      demandOption: true,
      describe: 'Mnemonic of the wallet',
    },
    derivationPath: {
      type: 'string',
      describe: 'Derivation path to be used for deriving the wallet account',
    },
  },
  requesterAdmin: {
    type: 'string',
    demandOption: true,
    describe: 'Address of the requester admin',
  },
  requesterIndex: {
    type: 'string',
    demandOption: true,
    describe: 'Requester index',
  },
  airnodeId: {
    type: 'string',
    demandOption: true,
    describe: 'Airnode id',
  },
  client: {
    type: 'string',
    demandOption: true,
    describe: 'Address of the client',
  },
  destination: {
    type: 'string',
    demandOption: true,
    describe: 'Withdrawal destination',
  },
} as const;

const {
  airnodeRrpCommands,
  mnemonicCommands,
  requesterAdmin,
  requesterIndex,
  airnodeId,
  client,
  destination,
} = COMMON_COMMAND_ARGUMENTS;

const toJSON = JSON.stringify;

yargs
  .command(
    'create-requester',
    'Creates a requester and returns its index',
    {
      ...airnodeRrpCommands,
      ...mnemonicCommands,
      requesterAdmin,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(
        args.mnemonic,
        args.derivationPath,
        args.providerUrl,
        args.airnodeRrp
      );
      await airnodeRrp.deployed();
      const requesterIndex = await admin.createRequester(airnodeRrp, args.requesterAdmin);
      console.log(`Requester index: ${requesterIndex}`);
    }
  )
  .command(
    'requester-index-to-admin',
    'Returns the admin of the requesterIndex',
    {
      ...airnodeRrpCommands,
      requesterIndex,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args.providerUrl, args.airnodeRrp);
      const requesterAdmin = await admin.requesterIndexToAdmin(airnodeRrp, args.requesterIndex);
      console.log(`Requester admin: ${requesterAdmin}`);
    }
  )
  .command(
    'set-requester-admin',
    'Sets the requester admin',
    {
      ...airnodeRrpCommands,
      ...mnemonicCommands,
      requesterIndex,
      requesterAdmin,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(
        args.mnemonic,
        args.derivationPath,
        args.providerUrl,
        args.airnodeRrp
      );
      const requesterAdmin = await admin.setRequesterAdmin(airnodeRrp, args.requesterIndex, args.requesterAdmin);
      console.log(`Requester admin: ${requesterAdmin}`);
    }
  )
  .command(
    'derive-designated-wallet',
    'Derives the address of the designated wallet for a airnode-requester pair',
    {
      ...airnodeRrpCommands,
      airnodeId,
      requesterIndex,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args.providerUrl, args.airnodeRrp);
      const designatedWallet = await admin.deriveDesignatedWallet(airnodeRrp, args.airnodeId, args.requesterIndex);
      console.log(`Designated wallet address: ${designatedWallet}`);
    }
  )
  .command(
    'endorse-client',
    'Endorses a client as a requester admin',
    {
      ...airnodeRrpCommands,
      ...mnemonicCommands,
      requesterIndex,
      client,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(
        args.mnemonic,
        args.derivationPath,
        args.providerUrl,
        args.airnodeRrp
      );
      const client = await admin.endorseClient(airnodeRrp, args.requesterIndex, args.client);
      console.log(`Client address: ${client}`);
    }
  )
  .command(
    'unendorse-client',
    'Unendorses a client as a requester admin',
    {
      ...airnodeRrpCommands,
      ...mnemonicCommands,
      requesterIndex,
      client,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(
        args.mnemonic,
        args.derivationPath,
        args.providerUrl,
        args.airnodeRrp
      );
      const client = await admin.unendorseClient(airnodeRrp, args.requesterIndex, args.client);
      console.log(`Client address: ${client}`);
    }
  )
  .command(
    'get-endorsement-status',
    'Returns the endorsment status for the given requesterIndex and client',
    {
      ...airnodeRrpCommands,
      requesterIndex,
      client,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args.providerUrl, args.airnodeRrp);
      const status = await admin.requesterIndexToClientAddressToEndorsementStatus(
        airnodeRrp,
        args.requesterIndex,
        args.client
      );
      console.log(`Endorsment status: ${status}`);
    }
  )
  .command(
    'create-template',
    'Creates a template and returns its id',
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
      console.log(`Template id: ${templateId}`);
    }
  )
  .command(
    'request-withdrawal',
    'Requests withdrawal from the designated wallet of an Airnode as a requester admin',
    {
      ...airnodeRrpCommands,
      ...mnemonicCommands,
      airnodeId,
      requesterIndex,
      destination,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(
        args.mnemonic,
        args.derivationPath,
        args.providerUrl,
        args.airnodeRrp
      );
      const withdrawalRequestId = await admin.requestWithdrawal(
        airnodeRrp,
        args.airnodeId,
        args.requesterIndex,
        args.destination
      );
      console.log(`Withdrawal request id: ${withdrawalRequestId}`);
    }
  )
  .command(
    'check-withdrawal-request',
    'Checks the state of the withdrawal request',
    {
      ...airnodeRrpCommands,
      requestId: {
        type: 'string',
        demandOption: true,
        describe: 'Withdrawal request id',
      },
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args.providerUrl, args.airnodeRrp);
      const withdrawnAmount = await admin.checkWithdrawalRequest(airnodeRrp, args.requestId);
      if (withdrawnAmount) {
        console.log(`Withdrawn amount: ${withdrawnAmount}`);
      } else {
        console.log(`Withdrawal request is not fulfilled yet`);
      }
    }
  )
  .command(
    'fulfill-withdrawal',
    'Fulfils the withdrawal status',
    {
      ...airnodeRrpCommands,
      mnemonic: {
        type: 'string',
        demandOption: true,
        describe: 'Mnemonic of the wallet (derivation path of the account will be derived from the requesterIndex)',
      },
      requesterIndex,
      airnodeId,
      requestId: {
        type: 'string',
        demandOption: true,
        describe: 'Withdrawal request id',
      },
      destination,
      amount: {
        type: 'string',
        demandOption: true,
        describe: 'Amount of ether to withdraw. For example "1.2" to withdraw 1.2 ETH',
      },
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(
        args.mnemonic,
        `m/0/${args.requesterIndex}`,
        args.providerUrl,
        args.airnodeRrp
      );
      const params = await admin.fulfilWithdrawal(
        airnodeRrp,
        args.requestId,
        args.airnodeId,
        args.requesterIndex,
        args.destination,
        args.amount
      );

      console.log(toJSON(params));
    }
  )
  .command(
    'count-withdrawal-requests',
    'Returns the number of withdrawal requests for the given requesterIndex',
    {
      ...airnodeRrpCommands,
      requesterIndex,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args.providerUrl, args.airnodeRrp);
      const requestsCount = await admin.requesterIndexToNoWithdrawalRequests(airnodeRrp, args.requesterIndex);
      console.log(`Number of withdrawal requests: ${requestsCount}`);
    }
  )
  .command(
    'set-airnode-parameters',
    'Sets the parameters of an Airnode and returns its id',
    {
      ...airnodeRrpCommands,
      ...mnemonicCommands,
      airnodeAdmin: {
        type: 'string',
        demandOption: true,
        describe: 'Address of the Airnode admin',
      },
      authorizersFilePath: {
        type: 'string',
        demandOption: true,
        describe: 'Path of the authorizers JSON file',
      },
    },
    async (args) => {
      const authorizers = JSON.parse(fs.readFileSync(args.authorizersFilePath).toString());
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(
        args.mnemonic,
        args.derivationPath,
        args.providerUrl,
        args.airnodeRrp
      );
      const airnodeId = await admin.setAirnodeParameters(airnodeRrp, args.airnodeAdmin, authorizers);
      console.log(`Airnode id: ${airnodeId}`);
    }
  )
  .command(
    'get-airnode-parameters',
    'Returns the airnode parameters and block number for the given airnodeId',
    {
      ...airnodeRrpCommands,
      airnodeId,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args.providerUrl, args.airnodeRrp);
      const parameters = await admin.getAirnodeParameters(airnodeRrp, args.airnodeId);
      console.log(toJSON(parameters));
    }
  )
  .command(
    'derive-endpoint-id',
    'Derives an endpoint id using the OIS title and endpoint name',
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
      console.log(`Endpoint id: ${endpointId}`);
    }
  )
  .command(
    'client-address-to-no-requests',
    'Returns the number of requests made by the client',
    {
      ...airnodeRrpCommands,
      client: { type: 'string', demandOption: true, describe: 'Address of the client' },
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args.providerUrl, args.airnodeRrp);
      const requestsCount = await admin.clientAddressToNoRequests(airnodeRrp, args.client);
      console.log(`Number of requests: ${requestsCount}`);
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
        describe: 'Id of the template',
      },
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args.providerUrl, args.airnodeRrp);
      const parameters = await admin.getTemplate(airnodeRrp, args.templateId);
      console.log(toJSON(parameters));
    }
  )
  .command(
    'get-templates',
    'Returns the templates for the given templateIds',
    {
      ...airnodeRrpCommands,
      templateIds: {
        type: 'string',
        array: true,
        demandOption: true,
        describe: 'Array of template ids (separated by space)',
      },
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args.providerUrl, args.airnodeRrp);
      const parameters = await admin.getTemplates(airnodeRrp, args.templateIds as string[]);
      console.log(toJSON(parameters));
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
