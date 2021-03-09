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
      const airnode = await evm.getAirnodeWithSigner(args.mnemonic, args.providerUrl);
      const requesterIndex = await contract.createRequester(airnode, args.requesterAdmin);
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
      const airnode = await evm.getAirnodeWithSigner(args.mnemonic, args.providerUrl);
      const requesterAdmin = await contract.setRequesterAdmin(airnode, args.requesterIndex, args.requesterAdmin);
      console.log(`Requester admin: ${requesterAdmin}`);
    }
  )
  .command(
    'derive-designated-wallet',
    'Derives the address of the designated wallet for a provider-requester pair',
    {
      providerUrl: {
        type: 'string',
        demandOption: true,
        describe: 'URL of the Ethereum provider',
      },
      providerId: {
        type: 'string',
        demandOption: true,
        describe: 'Provider ID',
      },
      requesterIndex: {
        type: 'string',
        demandOption: true,
        describe: 'Requester index',
      },
    },
    async (args) => {
      const airnode = await evm.getAirnode(args.providerUrl);
      const designatedWallet = await contract.deriveDesignatedWallet(airnode, args.providerId, args.requesterIndex);
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
      const airnode = await evm.getAirnodeWithSigner(args.mnemonic, args.providerUrl);
      const clientAddress = await contract.endorseClient(airnode, args.requesterIndex, args.clientAddress);
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
      const airnode = await evm.getAirnodeWithSigner(args.mnemonic, args.providerUrl);
      const clientAddress = await contract.unendorseClient(airnode, args.requesterIndex, args.clientAddress);
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
      const airnode = await evm.getAirnodeWithSigner(args.mnemonic, args.providerUrl);
      const templateId = await contract.createTemplate(airnode, template);
      console.log(`Template ID: ${templateId}`);
    }
  )
  .command(
    'request-withdrawal',
    'Requests withdrawal from the designated wallet of a provider as a requester admin',
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
      providerId: {
        type: 'string',
        demandOption: true,
        describe: 'Provider ID',
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
      const airnode = await evm.getAirnodeWithSigner(args.mnemonic, args.providerUrl);
      const withdrawalRequestId = await contract.requestWithdrawal(
        airnode,
        args.providerId,
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
      const airnode = await evm.getAirnode(args.providerUrl);
      const withdrawnAmount = await contract.checkWithdrawalRequest(airnode, args.withdrawalRequestId);
      if (withdrawnAmount) {
        console.log(`Withdrawn amount: ${withdrawnAmount}`);
      } else {
        console.log(`Withdrawal request is not fulfilled yet`);
      }
    }
  )
  .command(
    'set-provider-parameters',
    'Sets the parameters of a provider and returns its ID',
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
      providerAdmin: {
        type: 'string',
        demandOption: true,
        describe: 'Address of the provider admin',
      },
      authorizersFilePath: {
        type: 'string',
        demandOption: true,
        describe: 'Path of the authorizers JSON file',
      },
    },
    async (args) => {
      const authorizers = JSON.parse(fs.readFileSync(args.authorizersFilePath).toString());
      const airnode = await evm.getAirnodeWithSigner(args.mnemonic, args.providerUrl);
      const providerId = await contract.setProviderParameters(airnode, args.providerAdmin, authorizers);
      console.log(`Provider ID: ${providerId}`);
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
