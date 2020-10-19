import * as util from 'util';
import * as child from 'child_process';
const exec = util.promisify(child.exec);
import ora from 'ora';
import { deriveMasterWalletAddress } from './util';

export async function verifyMnemonicAtSSM(mnemonic, providerIdShort) {
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

  const spinner = ora('Removing the mnemonic from AWS SSM').start();
  await exec(
    `cd terraform && terraform destroy -auto-approve -state ./state/${providerIdShort} -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY"`
  );
  spinner.succeed('Removed the mnemonic from AWS SSM');

  // Delete the state files
  await exec(`rm -f ./terraform/state/${providerIdShort}*`);
}

async function importMnemonicToState(providerIdShort) {
  let spinner;
  try {
    spinner = ora('Checking for the mnemonic at AWS SSM').start();
    await exec(
      `cd terraform && terraform import -state ./state/${providerIdShort} -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY" aws_ssm_parameter.masterKeyMnemonic /airnode/${providerIdShort}/masterKeyMnemonic`
    );
    spinner.succeed('Found the mnemonic at AWS SSM');
  } catch (e) {
    if (e.stderr.includes('Cannot import non-existent remote object')) {
      spinner.fail('The mnemonic does not exist at AWS SSM');
    }
    throw e;
  }
}

async function addMnemonicToSSM(mnemonic, providerIdShort) {
  let spinner;
  try {
    spinner = ora(`Attempting to store the mnemonic at AWS SMM`).start();
    await exec(
      `cd terraform && terraform apply -auto-approve -state ./state/${providerIdShort} -var="providerId=${providerIdShort}" -var="mnemonic=${mnemonic}" -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY"`
    );
    spinner.succeed('Stored the mnemonic at AWS SSM');
  } catch (e) {
    if (!e.stderr.includes('ParameterAlreadyExists')) {
      throw e;
    }
    await exec(
      `cd terraform && terraform import -state ./state/${providerIdShort} -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY" aws_ssm_parameter.masterKeyMnemonic /airnode/${providerIdShort}/masterKeyMnemonic`
    );
    spinner.succeed('The mnemonic exists at AWS SSM');
  }
}

async function fetchMnemonicFromSSM(providerIdShort) {
  const spinner = ora('Fetching the mnemonic from AWS SSM').start();
  // Refresh the Terraform output to get the mnemonic
  await exec(
    `cd terraform && terraform refresh -state ./state/${providerIdShort} -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY"`
  );
  // Check if the stored mnemonic match the one in security.json
  const rawOutput = await exec(`cd terraform && terraform output -state ./state/${providerIdShort} -json`);
  const output = JSON.parse(rawOutput.stdout);
  spinner.succeed('Fetched the mnemonic from AWS SSM');
  return output.mnemonic.value;
}
