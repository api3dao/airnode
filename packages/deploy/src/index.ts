import * as fs from 'fs';
import * as util from 'util';
import * as child from 'child_process';
import * as ethers from 'ethers';
const exec = util.promisify(child.exec);

// TODO: Pass as arguments to the script
const CONFIG_PATH = './config.json';
const SECURITY_PATH = './security.json';

async function main() {
  // Read config.json
  const rawConfig = fs.readFileSync(CONFIG_PATH, 'utf8');
  const config = JSON.parse(rawConfig);
  let providerId = config.nodeSettings.providerId;
  // Read security.json
  const rawSecurity = fs.readFileSync(SECURITY_PATH, 'utf8');
  const security = JSON.parse(rawSecurity);
  let mnemonic = security.masterKeyMnemonic;

  if (config.id !== security.id) {
    throw new Error('config.json and security.json IDs do not match');
  }

  if (providerId) {
    console.log('Found provider ID in config.json');
    if (mnemonic) {
      console.log('Found mnemonic in security.json');
      // Verify that the provider ID and the mnemonic are consistent
      const masterWallet = ethers.Wallet.fromMnemonic(mnemonic, 'm');
      const expectedProviderId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(['address'], [masterWallet.address])
      );
      if (providerId !== expectedProviderId) {
        throw new Error('Provider ID in config.json and mnemonic in security.json are not consistent');
      }
      // Check if SSM has the private key created
      console.log('Checking the cloud provider for the private key...');
      await exec(
        `cd terraform && terraform refresh -state ./state/${providerId} -var="providerId=${providerId}" -var="mnemonic=${mnemonic}"`
      );
      const out = await exec(`cd terraform && terraform output -state ./state/${providerId} -json`);
      const terraformOutput = JSON.parse(out.stdout);
      // Create the private key if it doesn't exist
      if (!terraformOutput.providerId) {
        console.log('Did not find the private key at the cloud provider, creating...');
        await exec(
          `cd terraform && terraform apply -auto-approve -state ./state/${providerId} -var="providerId=${providerId}" -var="mnemonic=${mnemonic}"`
        );
        console.log('Created the private key at the cloud provider');
      } else {
        console.log('Found the private key at the cloud provider');
      }
    } else {
      console.log('Did not find the mnemonic in security.json');
      // Check if SSM has the private key created
      console.log('Checking the cloud provider for the private key...');
      await exec(
        `cd terraform && terraform refresh -state ./state/${providerId} -var="providerId=${providerId}" -var="mnemonic=${mnemonic}"`
      );
      const out = await exec(`cd terraform && terraform output -state ./state/${providerId} -json`);
      const terraformOutput = JSON.parse(out.stdout);
      // Throw if the private key doesn't exist
      if (!terraformOutput.providerId) {
        throw new Error('Provider ID provided in config.json is not created ');
      }
      console.log('Found the private key at the cloud provider');
    }
  } else {
    console.log('Did not find provider ID in config.json');
    if (mnemonic) {
      console.log('Found mnemonic in security.json');
      // Derive the provider ID from the mnemonic
      const masterWallet = ethers.Wallet.fromMnemonic(mnemonic, 'm');
      providerId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [masterWallet.address]));
      console.log('Derived the provider ID from the mnemonic');
      // Check if SSM has the private key created
      console.log('Checking the cloud provider for the private key...');
      await exec(
        `cd terraform && terraform refresh -state ./state/${providerId} -var="providerId=${providerId}" -var="mnemonic=${mnemonic}"`
      );
      const out = await exec(`cd terraform && terraform output -state ./state/${providerId} -json`);
      const terraformOutput = JSON.parse(out.stdout);
      // Create the private key if it doesn't exist
      if (!terraformOutput.providerId) {
        console.log('Did not find the private key at the cloud provider, creating...');
        await exec(
          `cd terraform && terraform apply -auto-approve -state ./state/${providerId} -var="providerId=${providerId}" -var="mnemonic=${mnemonic}"`
        );
        console.log('Created the private key at the cloud provider');
      } else {
        console.log('Found the private key at the cloud provider');
      }
    } else {
      console.log('Did not find the mnemonic in security.json');
      // Generate a random mnemonic
      const masterWallet = ethers.Wallet.createRandom();
      mnemonic = masterWallet.mnemonic.phrase;
      console.log('Generated new random master key mnemonic');
      // Derive the provider ID from the mnemonic
      providerId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [masterWallet.address]));
      console.log('Derived the provider ID from the mnemonic');
      // Create the private key (we can assume that it doesn't exist because it's randomly generated)
      console.log('Creating the private key at the cloud provider...');
      await exec(
        `cd terraform && terraform apply -auto-approve -state ./state/${providerId} -var="providerId=${providerId}" -var="mnemonic=${mnemonic}"`
      );
      console.log('Created the private key at the cloud provider');
    }
  }

  const secrets = {};
  secrets['MASTER_KEY_MNEMONIC'] = `$\{ssm:/masterKeyMnemonic/${providerId}~true\}`;
  for (const oisTitle in security.apiCredentials) {
    for (const securityScheme of security.apiCredentials[oisTitle]) {
      secrets[`${oisTitle}_${securityScheme.securitySchemeName}`] = securityScheme.value;
    }
  }
  fs.writeFileSync('secrets.json', JSON.stringify(secrets, null, 4));
}

main();
