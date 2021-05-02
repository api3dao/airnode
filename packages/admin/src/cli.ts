import * as fs from 'fs';
import * as yargs from 'yargs';
import * as evm from './evm';
import * as admin from '.';
import { exit } from 'process';

type CmdExample = {
  [key: string]: [string, (string | undefined)?];
};

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
  },
  mnemonicCommands: {
    mnemonic: {
      type: 'string',
      demandOption: true,
      describe: 'Mnemonic phrase for the Airnode master wallet',
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
    describe: 'The onchain ID of the Airnode instance',
  },
  clientAddress: {
    type: 'string',
    demandOption: true,
    describe: 'Address of the client contract',
  },
  destination: {
    type: 'string',
    demandOption: true,
    describe: 'Address of the receiving account (account to which the funds will be withdrawn to)',
  },
  withdrawalRequestId: {
    type: 'string',
    demandOption: true,
    describe: 'Withdrawal request ID',
  },
} as const;

const COMMON_COMMAND_EXAMPLES: CmdExample = {
  createRequester: [
    `$0 create-requester \
      --providerUrl https://ropsten.infura.io/v3/<KEY> \
      --mnemonic "nature about salad..." \
      --requesterAdmin 0x5c17cb...
    `,
    'Creates a requester and returns a requester index. Note down your requester index because you will be using it in future interactions.',
  ],
  setRequesterAdmin: [
    `$0 set-requester-admin \
      --providerUrl https://ropsten.infura.io/v3/<KEY> \
      --mnemonic "nature about salad..." \
      --requesterIndex 6 \
      --requesterAdmin 0xe97301...
    `,
    'Sets the requester admin. The account derived from the "mnemonic" you provide here has to belong to the previous requester admin.',
  ],
  deriveDesignatedWallet: [
    `$0 derive-designated-wallet \
      --providerUrl https://ropsten.infura.io/v3/<KEY> \
      --airnodeId 0xe1e0dd... \
      --requesterIndex 6
    `,
    'Derives the address of the wallet designated by an Airnode for a requester.',
  ],
  endorseClient: [
    `$0 endorse-client \
      --providerUrl https://ropsten.infura.io/v3/<KEY> \
      --mnemonic "nature about salad..." \
      --requesterIndex 6 \
      --clientAddress 0x2c2e12...
    `,
    `Endorses a client contract so that its requests can be fulfilled by the requester's designated wallet.
    The account derived from the mnemonic you provide here has to belong to the requester admin.
    `,
  ],
  unendorseClient: [
    `$0 unendorse-client \
      --providerUrl https://ropsten.infura.io/v3/<KEY> \
      --mnemonic "nature about salad..." \
      --requesterIndex 6 \
      --clientAddress 0x2c2e12...
    `,
    `Unendorses a client contract so that its requests can no longer be fulfilled by the requester's designated wallet.
    The account derived from the mnemonic you provide here has to belong to the requester admin.
    `,
  ],
  getEndorsementStatus: [
    `$0 get-endorsement-status \
      --providerUrl https://ropsten.infura.io/v3/<KEY> \
      --requesterIndex 6 \
      --clientAddress 0x2c2e12...
    `,
    'Returns the endorsement status for the given requester index and client (true if endorsed, false otherwise).',
  ],
  createTemplate: [
    `$0 create-template \
      --providerUrl https://ropsten.infura.io/v3/<KEY> \
      --mnemonic "nature about salad..." \
      --templateFilePath ./template.json
    `,
    'Reads a file, uses its contents to create a template and returns the template ID. See the /example directory for an example template file.',
  ],
  getTemplate: [
    `$0 get-template \
      --providerUrl https://ropsten.infura.io/v3/<KEY> \
      --templateId 0x8d3b9...
    `,
    'Returns the template for the given templateId.',
  ],
  requestWithdrawal: [
    `$0 request-withdrawal \
      --providerUrl https://ropsten.infura.io/v3/<KEY> \
      --mnemonic "nature about salad..." \
      --airnodeId 0xe1e0dd... \
      --requesterIndex 6 \
      --destination 0x98aaba...
    `,
    `Requests a withdrawal from the wallet designated by an Airnode for a requester, and returns the request ID.
    The account derived from the mnemonic you provide here has to belong to the requester admin.`,
  ],
  checkWithdrawalRequest: [
    `$0 check-withdrawal-request \
      --providerUrl https://ropsten.infura.io/v3/<KEY> \
      --withdrawalRequestId 0x011d1b...
    `,
    'Checks the status of the withdrawal request with the given ID.',
  ],
  getAirnodeParameters: [
    `$0 get-airnode-parameters \
      --providerUrl https://ropsten.infura.io/v3/<KEY> \
      --airnodeId 0xe1e0dd...
    `,
    'Returns the Airnode parameters and block number for the given airnodeId.',
  ],
  deriveEndpointId: [
    `$0 get-airnode-parameters \
      --oisTitle "My OIS title..." \
      --endpointName "My endpoint name..."
    `,
    'Derives the endpoint ID using the OIS title and the endpoint name using the triggers convention.',
  ],
};

const {
  airnodeRrpCommands,
  mnemonicCommands,
  requesterAdmin,
  requesterIndex,
  airnodeId,
  clientAddress,
  destination,
  withdrawalRequestId,
} = COMMON_COMMAND_ARGUMENTS;

const {
  createRequester,
  setRequesterAdmin,
  deriveDesignatedWallet,
  endorseClient,
  unendorseClient,
  getEndorsementStatus,
  createTemplate,
  getTemplate,
  requestWithdrawal,
  checkWithdrawalRequest,
  getAirnodeParameters,
  deriveEndpointId,
} = COMMON_COMMAND_EXAMPLES;

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
      clientAddress,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(
        args.mnemonic,
        args.derivationPath,
        args.providerUrl,
        args.airnodeRrp
      );
      const client = await admin.endorseClient(airnodeRrp, args.requesterIndex, args.clientAddress);
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
      clientAddress,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(
        args.mnemonic,
        args.derivationPath,
        args.providerUrl,
        args.airnodeRrp
      );
      const client = await admin.unendorseClient(airnodeRrp, args.requesterIndex, args.clientAddress);
      console.log(`Client address: ${client}`);
    }
  )
  .command(
    'get-endorsement-status',
    'Returns the endorsment status for the given requesterIndex and client',
    {
      ...airnodeRrpCommands,
      requesterIndex,
      clientAddress,
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args.providerUrl, args.airnodeRrp);
      const status = await admin.requesterIndexToClientAddressToEndorsementStatus(
        airnodeRrp,
        args.requesterIndex,
        args.clientAddress
      );
      console.log(`Endorsment status: ${status}`);
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
    'set-airnode-parameters',
    'Sets the parameters of an Airnode and returns its ID',
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
      console.log(`Airnode ID: ${airnodeId}`);
    }
  )
  .command(
    'get-airnode-parameters',
    'Returns the Airnode parameters and current block number for the given airnodeId',
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
  .example([
    createRequester,
    setRequesterAdmin,
    deriveDesignatedWallet,
    endorseClient,
    unendorseClient,
    getEndorsementStatus,
    createTemplate,
    getTemplate,
    requestWithdrawal,
    checkWithdrawalRequest,
    getAirnodeParameters,
    deriveEndpointId,
  ])
  .demandCommand(1)
  .strict()
  .fail((message, err) => {
    if (message) console.log(message);
    else if (err instanceof Error) console.log(`Command failed with unexpected error:\n\n${err.message}`);
    else console.log(`Command failed with unexpected error:\n\n${err}`);

    exit(1);
  })
  .help().argv;
