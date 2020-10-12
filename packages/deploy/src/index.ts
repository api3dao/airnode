import * as fs from 'fs';
import * as util from 'util';
import * as child from 'child_process';
import * as ethers from 'ethers';
const exec = util.promisify(child.exec);

// TODO: Pass as arguments to the script
const CONFIG_PATH = './config.json';
const SECURITY_PATH = './security.json';

async function main() {
  // 1- Operate on the mnemonic/providerId read from the configuration files
  const rawSecurity = fs.readFileSync(SECURITY_PATH, 'utf8');
  const security = JSON.parse(rawSecurity);
  let mnemonic = security.masterKeyMnemonic;

  const rawConfig = fs.readFileSync(CONFIG_PATH, 'utf8');
  const config = JSON.parse(rawConfig);

  let providerId;
  if (mnemonic) {
    console.log('Found the mnemonic in security.json');
    console.log('Deriving the providerId from the mnemonic');
    // The mnemonic from security.json and the providerId from config.json should be
    // consistent if the two files have been validated.
    const masterWallet = ethers.utils.HDNode.fromMnemonic(mnemonic);
    providerId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [masterWallet.address]));
  } else {
    console.log('Did not find the mnemonic in security.json');
    providerId = config.nodeSettings.providerId;
    if (!providerId) {
      console.log('Did not find the providerId in config.json');
      console.log('Creating a new mnemonic-providerId pair');
      const masterWallet = ethers.Wallet.createRandom();
      mnemonic = masterWallet.mnemonic.phrase;
      providerId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [masterWallet.address]));
      console.log('Write down the mnemonic below on a piece of paper and keep it somewhere safe');
      console.log(mnemonic);
    } else {
      console.log('Found the providerId in config.json');
    }
  }
  // At this point, we are guaranteed to have the providerId, but the mnemonic
  // may be undefined.

  // 2 - Use terraform to communicate with the cloud provider
  // Start by deleting the old state files
  await exec(`rm -f ./terraform/state/${providerId}*`);
  if (mnemonic) {
    // Attempt to add the mnemonic to SSM
    try {
      await exec(
        `cd terraform && terraform apply -auto-approve -state ./state/${providerId} -var="providerId=${providerId}" -var="mnemonic=${mnemonic}"`
      );
      console.log('Created the mnemonic at the cloud provider');
    } catch (e) {
      if (!e.stderr.includes('ParameterAlreadyExists')) {
        throw e;
      }
      console.log('The mnemonic exists at the cloud provider');
    }
  } else {
    // Attempt to load the mnemonic from SSM
    try {
      await exec(
        `cd terraform && terraform import -state ./state/${providerId} aws_ssm_parameter.masterKeyMnemonic /airnode/${providerId}/masterKeyMnemonic`
      );
      // Refresh the Terraform output to get the mnemonic
      await exec(`cd terraform && terraform refresh -state ./state/${providerId}`);
      console.log('Found the mnemonic at the cloud provider');
    } catch (e) {
      if (e.stderr.includes('Cannot import non-existent remote object')) {
        console.error('Did not find the mnemonic of the providerId in config.json at the cloud provider');
      }
      throw e;
    }
    const rawOutput = await exec(`cd terraform && terraform output -state ./state/${providerId} -json`);
    const output = JSON.parse(rawOutput.stdout);
    mnemonic = output.mnemonic.value;
  }
  // At this point, we are guaranteed to have both the providerId and the mnemonic, and the
  // mnemonic is stored at the cloud provider.

  // 3 - Check if the provider record is created on-chain, warn the user if not
  // mainnet, ropsten, rinkeby, kovan, göerli
  const validChainIds = [1, 3, 4, 5, 42];
  for (const chain of config.nodeSettings.chains) {
    if (validChainIds.includes(chain.id)) {
      const provider = ethers.getDefaultProvider(chain.id);
      const abi = [
        {
          inputs: [
            {
              internalType: 'bytes32',
              name: 'providerId',
              type: 'bytes32',
            },
          ],
          name: 'getProvider',
          outputs: [
            {
              internalType: 'address',
              name: 'admin',
              type: 'address',
            },
            {
              internalType: 'string',
              name: 'xpub',
              type: 'string',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
      ];
      const airnode = new ethers.Contract(chain.contracts.Airnode, abi, provider);
      const providerRecord = await airnode.getProvider(providerId);

      if (providerRecord.xpub === '') {
        console.log(`Provider record not found on chain with ID ${chain.id}`);
        const masterWallet = ethers.utils.HDNode.fromMnemonic(mnemonic);
        const balance = await provider.getBalance(masterWallet.address);
        // Overestimate the required ETH
        const txCost = (await provider.getGasPrice()).mul(500_000);
        if (txCost.gt(balance)) {
          console.log(`Balance of ${masterWallet.address} is ${ethers.utils.formatEther(balance)} ETH`);
          console.log(`Fund it with at least ${ethers.utils.formatEther(txCost)} ETH`);
        }
      }
    } else {
      console.log(`Skipping chain with ID ${chain.id} for provider record check`);
    }
  }

  // 4 - Write the secrets to a temporary file for Serverless to read
  const secrets = {};
  secrets['MASTER_KEY_MNEMONIC'] = `$\{ssm:/airnode/${providerId}/masterKeyMnemonic~true\}`;
  for (const oisTitle in security.apiCredentials) {
    for (const securityScheme of security.apiCredentials[oisTitle]) {
      secrets[`${oisTitle}_${securityScheme.securitySchemeName}`] = securityScheme.value;
    }
  }
  fs.writeFileSync('secrets.json', JSON.stringify(secrets, null, 4));

  // 5 - Remove the state file because it contains the mnemonics
  await exec(`rm -f ./terraform/state/${providerId}*`);
}

main();
