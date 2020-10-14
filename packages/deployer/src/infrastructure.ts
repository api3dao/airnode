import * as util from 'util';
import * as child from 'child_process';
const exec = util.promisify(child.exec);
import { deriveMasterWalletAddress } from './util';

export async function verifyMnemonicOnSSM(mnemonic, providerIdShort) {
  // Delete the old state files for a standard process
  await exec(`rm -f ./terraform/state/${providerIdShort}*`);

  if (mnemonic) {
    await addMnemonicToSSM(mnemonic, providerIdShort);
  } else {
    await importMnemonicToState(providerIdShort);
  }
  // At this point we know that there is a mnemonic stored at AWS SSM for this providerIdShort

  const fetchedMnemonic = await fetchMnemonicFromSSM(providerIdShort);
  if (mnemonic && mnemonic !== fetchedMnemonic) {
    throw new Error('The mnemonic stored at AWS SSM does not match the one provided in security.json');
  }

  // Delete the state files because they contain the mnemonic
  await exec(`rm -f ./terraform/state/${providerIdShort}*`);

  return deriveMasterWalletAddress(mnemonic);
}

export async function removeMnemonicFromSSM(providerIdShort) {
  // Delete the old state files for a standard process
  await exec(`rm -f ./terraform/state/${providerIdShort}*`);

  await importMnemonicToState(providerIdShort);

  await exec(
    `cd terraform && terraform destroy -auto-approve -state ./state/${providerIdShort}`
  );
  console.log('Removed the mnemonic from AWS SSM');

  // Delete the state files
  await exec(`rm -f ./terraform/state/${providerIdShort}*`);
}

async function importMnemonicToState(providerIdShort) {
  try {
    await exec(
      `cd terraform && terraform import -state ./state/${providerIdShort} aws_ssm_parameter.masterKeyMnemonic /airnode/${providerIdShort}/masterKeyMnemonic`
    );
    console.log('Found the mnemonic at AWS SSM');
  } catch (e) {
    if (e.stderr.includes('Cannot import non-existent remote object')) {
      console.error('The mnemonic does not exist at AWS SSM');
    }
    throw e;
  }
}

async function addMnemonicToSSM(mnemonic, providerIdShort) {
  try {
    await exec(
      `cd terraform && terraform apply -auto-approve -state ./state/${providerIdShort} -var="providerId=${providerIdShort}" -var="mnemonic=${mnemonic}"`
    );
    console.log('Created the mnemonic at AWS SSM');
  } catch (e) {
    if (!e.stderr.includes('ParameterAlreadyExists')) {
      throw e;
    }
    console.log('The mnemonic exists at AWS SSM');
    await exec(
      `cd terraform && terraform import -state ./state/${providerIdShort} aws_ssm_parameter.masterKeyMnemonic /airnode/${providerIdShort}/masterKeyMnemonic`
    );
  }
}

async function fetchMnemonicFromSSM(providerIdShort) {
  // Refresh the Terraform output to get the mnemonic
  await exec(`cd terraform && terraform refresh -state ./state/${providerIdShort}`);
  // Check if the stored mnemonic match the one in security.json
  const rawOutput = await exec(`cd terraform && terraform output -state ./state/${providerIdShort} -json`);
  const output = JSON.parse(rawOutput.stdout);
  return output.mnemonic.value;
}
