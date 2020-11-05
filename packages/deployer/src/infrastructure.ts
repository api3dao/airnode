import * as util from 'util';
import * as child from 'child_process';
const exec = util.promisify(child.exec);
import ora from 'ora';

export async function checkIfProviderIdShortExistsAtSSM(providerIdShort) {
  await deleteStateFiles(providerIdShort);
  const spinner = ora(`Checking if ${providerIdShort} exists as providerIdShort at AWS SSM`).start();
  try {
    await exec(
      `cd terraform && terraform import -state ./state/${providerIdShort} -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY" aws_ssm_parameter.masterKeyMnemonic /airnode/${providerIdShort}/masterKeyMnemonic`
    );
    spinner.info(`${providerIdShort} exists as providerIdShort at AWS SSM`);
    await deleteStateFiles(providerIdShort);
    return true;
  } catch (e) {
    await deleteStateFiles(providerIdShort);
    if (e.stderr.includes('Cannot import non-existent remote object')) {
      spinner.info(`${providerIdShort} does not exist as providerIdShort at AWS SSM`);
      return false;
    }
    spinner.fail(`Failed to check if ${providerIdShort} exists as providerIdShort at AWS SSM`);
    throw e;
  }
}

export async function removeMnemonicFromSSM(providerIdShort) {
  await deleteStateFiles(providerIdShort);
  await importMnemonicToState(providerIdShort);
  const spinner = ora('Removing the mnemonic from AWS SSM').start();
  try {
    await exec(
      `cd terraform && terraform destroy -auto-approve -state ./state/${providerIdShort} -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY"`
    );
    spinner.succeed('Removed the mnemonic from AWS SSM');
  } catch (e) {
    spinner.fail('Failed to remove the mnemonic from AWS SSM');
    throw e;
  }
  await deleteStateFiles(providerIdShort);
}

export async function addMnemonicToSSM(mnemonic, providerIdShort) {
  await deleteStateFiles(providerIdShort);
  const spinner = ora(`Storing the mnemonic at AWS SMM`).start();
  try {
    await exec(
      `cd terraform && terraform apply -auto-approve -state ./state/${providerIdShort} -var="providerId=${providerIdShort}" -var="mnemonic=${mnemonic}" -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY"`
    );
    spinner.succeed('Stored the mnemonic at AWS SSM');
    await deleteStateFiles(providerIdShort);
  } catch (e) {
    await deleteStateFiles(providerIdShort);
    spinner.fail('Failed to store the mnemonic at AWS SSM');
    throw e;
  }
}

export async function fetchMnemonicFromSSM(providerIdShort) {
  await deleteStateFiles(providerIdShort);
  const spinner = ora('Fetching the mnemonic from AWS SSM').start();
  try {
    // Need to Import -> Refresh -> Output
    await exec(
      `cd terraform && terraform import -state ./state/${providerIdShort} -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY" aws_ssm_parameter.masterKeyMnemonic /airnode/${providerIdShort}/masterKeyMnemonic`
    );
    await exec(
      `cd terraform && terraform refresh -state ./state/${providerIdShort} -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY"`
    );
    const rawOutput = await exec(`cd terraform && terraform output -state ./state/${providerIdShort} -json`);
    const output = JSON.parse(rawOutput.stdout);
    spinner.succeed('Fetched the mnemonic from AWS SSM');
    await deleteStateFiles(providerIdShort);
    return output.mnemonic.value;
  } catch (e) {
    await deleteStateFiles(providerIdShort);
    spinner.fail('Failed to fetch the mnemonic from AWS SSM');
    throw e;
  }
}

async function importMnemonicToState(providerIdShort) {
  // We don't delete the state files for this function, as the whole point
  // is to import the mnemonic to the state files.
  const spinner = ora('Importing the mnemonic from AWS SSM').start();
  try {
    await exec(
      `cd terraform && terraform import -state ./state/${providerIdShort} -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY" aws_ssm_parameter.masterKeyMnemonic /airnode/${providerIdShort}/masterKeyMnemonic`
    );
    spinner.succeed('Imported the mnemonic from AWS SSM');
  } catch (e) {
    spinner.fail('Failed to import the mnemonic from AWS SSM');
    throw e;
  }
}

function deleteStateFiles(providerIdShort) {
  exec(`rm -f ./terraform/state/${providerIdShort}*`);
}
