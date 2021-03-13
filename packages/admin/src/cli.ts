import * as fs from 'fs';
import * as yargs from 'yargs';
import * as evm from './evm';
import * as contract from '.';

yargs
  .command(
    'create-requester',
    'Creates a requester and returns its index',
    {
      providerUrl: {
        type: 'string',
        demandOption: true,
        describe: 'URL of the Ethereum provider',
      },
      mnemonic: {
        type: 'string',
        demandOption: true,
        describe: 'Mnemonic of the wallet',
      },
      requesterAdmin: {
        type: 'string',
        demandOption: true,
        describe: 'Address of the requester admin',
      },
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(args.mnemonic, args.providerUrl);
      const requesterIndex = await contract.createRequester(airnodeRrp, args.requesterAdmin);
      console.log(`Requester index: ${requesterIndex}`);
    }
  )
  .command(
    'set-requester-admin',
    'Sets the requester admin',
    {
      providerUrl: {
        type: 'string',
        demandOption: true,
        describe: 'URL of the Ethereum provider',
      },
      mnemonic: {
        type: 'string',
        demandOption: true,
        describe: 'Mnemonic of the wallet',
      },
      requesterIndex: {
        type: 'string',
        demandOption: true,
        describe: 'Requester index',
      },
      requesterAdmin: {
        type: 'string',
        demandOption: true,
        describe: 'Address of the requester admin',
      },
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(args.mnemonic, args.providerUrl);
      const requesterAdmin = await contract.setRequesterAdmin(airnodeRrp, args.requesterIndex, args.requesterAdmin);
      console.log(`Requester admin: ${requesterAdmin}`);
    }
  )
  .command(
    'derive-designated-wallet',
    'Derives the address of the designated wallet for a airnode-requester pair',
    {
      providerUrl: {
        type: 'string',
        demandOption: true,
        describe: 'URL of the Ethereum provider',
      },
      airnodeId: {
        type: 'string',
        demandOption: true,
        describe: 'Airnode ID',
      },
      requesterIndex: {
        type: 'string',
        demandOption: true,
        describe: 'Requester index',
      },
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args.providerUrl);
      const designatedWallet = await contract.deriveDesignatedWallet(airnodeRrp, args.airnodeId, args.requesterIndex);
      console.log(`Designated wallet address: ${designatedWallet}`);
    }
  )
  .command(
    'endorse-client',
    'Endorses a client as a requester admin',
    {
      providerUrl: {
        type: 'string',
        demandOption: true,
        describe: 'URL of the Ethereum provider',
      },
      mnemonic: {
        type: 'string',
        demandOption: true,
        describe: 'Mnemonic of the wallet',
      },
      requesterIndex: {
        type: 'string',
        demandOption: true,
        describe: 'Requester index',
      },
      clientAddress: {
        type: 'string',
        demandOption: true,
        describe: 'Address of the client',
      },
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(args.mnemonic, args.providerUrl);
      const clientAddress = await contract.endorseClient(airnodeRrp, args.requesterIndex, args.clientAddress);
      console.log(`Client address: ${clientAddress}`);
    }
  )
  .command(
    'unendorse-client',
    'Unendorses a client as a requester admin',
    {
      providerUrl: {
        type: 'string',
        demandOption: true,
        describe: 'URL of the Ethereum provider',
      },
      mnemonic: {
        type: 'string',
        demandOption: true,
        describe: 'Mnemonic of the wallet',
      },
      requesterIndex: {
        type: 'string',
        demandOption: true,
        describe: 'Requester index',
      },
      clientAddress: {
        type: 'string',
        demandOption: true,
        describe: 'Address of the client',
      },
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(args.mnemonic, args.providerUrl);
      const clientAddress = await contract.unendorseClient(airnodeRrp, args.requesterIndex, args.clientAddress);
      console.log(`Client address: ${clientAddress}`);
    }
  )
  .command(
    'create-template',
    'Creates a template and returns its ID',
    {
      providerUrl: {
        type: 'string',
        demandOption: true,
        describe: 'URL of the Ethereum provider',
      },
      mnemonic: {
        type: 'string',
        demandOption: true,
        describe: 'Mnemonic of the wallet',
      },
      templateFilePath: {
        type: 'string',
        demandOption: true,
        describe: 'Path of the template JSON file',
      },
    },
    async (args) => {
      const template = JSON.parse(fs.readFileSync(args.templateFilePath).toString());
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(args.mnemonic, args.providerUrl);
      const templateId = await contract.createTemplate(airnodeRrp, template);
      console.log(`Template ID: ${templateId}`);
    }
  )
  .command(
    'request-withdrawal',
    'Requests withdrawal from the designated wallet of an Airnode as a requester admin',
    {
      providerUrl: {
        type: 'string',
        demandOption: true,
        describe: 'URL of the Ethereum provider',
      },
      mnemonic: {
        type: 'string',
        demandOption: true,
        describe: 'Mnemonic of the wallet',
      },
      airnodeId: {
        type: 'string',
        demandOption: true,
        describe: 'Airnode ID',
      },
      requesterIndex: {
        type: 'string',
        demandOption: true,
        describe: 'Requester index',
      },
      destination: {
        type: 'string',
        demandOption: true,
        describe: 'Withdrawal destination',
      },
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(args.mnemonic, args.providerUrl);
      const withdrawalRequestId = await contract.requestWithdrawal(
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
      providerUrl: {
        type: 'string',
        demandOption: true,
        describe: 'URL of the Ethereum provider',
      },
      withdrawalRequestId: {
        type: 'string',
        demandOption: true,
        describe: 'Withdrawal request ID',
      },
    },
    async (args) => {
      const airnodeRrp = await evm.getAirnodeRrp(args.providerUrl);
      const withdrawnAmount = await contract.checkWithdrawalRequest(airnodeRrp, args.withdrawalRequestId);
      if (withdrawnAmount) {
        console.log(`Withdrawn amount: ${withdrawnAmount}`);
      } else {
        console.log(`Withdrawal request is not fulfilled yet`);
      }
    }
  )
  .command(
    'set-airnode-parameters',
    'Sets the parameters of an Airnode and returns its ID',
    {
      providerUrl: {
        type: 'string',
        demandOption: true,
        describe: 'URL of the Ethereum provider',
      },
      mnemonic: {
        type: 'string',
        demandOption: true,
        describe: 'Mnemonic of the wallet',
      },
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
      const airnodeRrp = await evm.getAirnodeRrpWithSigner(args.mnemonic, args.providerUrl);
      const airnodeId = await contract.setAirnodeParameters(airnodeRrp, args.airnodeAdmin, authorizers);
      console.log(`Airnode ID: ${airnodeId}`);
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
      const endpointId = await contract.deriveEndpointId(args.oisTitle, args.endpointName);
      console.log(`Endpoint ID: ${endpointId}`);
    }
  )
  .help().argv;
