import ora from 'ora';
import * as terraform from './terraform';

export async function checkIfairnodeIdShortExists(airnodeIdShort) {
  await terraform.deleteStateFiles(airnodeIdShort);
  const spinner = ora(`Checking if ${airnodeIdShort} exists as airnodeIdShort at AWS SSM`).start();
  try {
    await terraform.import_(airnodeIdShort);
    spinner.info(`${airnodeIdShort} exists as airnodeIdShort at AWS SSM`);
    return true;
  } catch (e) {
    if (e.stderr.includes('Cannot import non-existent remote object')) {
      spinner.info(`${airnodeIdShort} does not exist as airnodeIdShort at AWS SSM`);
      return false;
    }
    spinner.fail(`Failed to check if ${airnodeIdShort} exists as airnodeIdShort at AWS SSM`);
    throw e;
  }
}

export async function removeMnemonic(airnodeIdShort) {
  await terraform.deleteStateFiles(airnodeIdShort);
  await importMnemonicToState(airnodeIdShort);
  const spinner = ora('Removing the mnemonic from AWS SSM').start();
  try {
    await terraform.destroy(airnodeIdShort);
    spinner.succeed('Removed the mnemonic from AWS SSM');
  } catch (e) {
    spinner.fail('Failed to remove the mnemonic from AWS SSM');
    throw e;
  }
}

export async function addMnemonic(mnemonic, airnodeIdShort) {
  await terraform.deleteStateFiles(airnodeIdShort);
  const spinner = ora(`Storing the mnemonic at AWS SMM`).start();
  try {
    await terraform.apply(airnodeIdShort, mnemonic);
    spinner.succeed('Stored the mnemonic at AWS SSM');
  } catch (e) {
    spinner.fail('Failed to store the mnemonic at AWS SSM');
    throw e;
  }
}

export async function fetchMnemonic(airnodeIdShort) {
  await terraform.deleteStateFiles(airnodeIdShort);
  const spinner = ora('Fetching the mnemonic from AWS SSM').start();
  try {
    await terraform.import_(airnodeIdShort);
    await terraform.refresh(airnodeIdShort);
    const rawOutput = await terraform.output(airnodeIdShort);
    const output = JSON.parse(rawOutput.stdout);
    spinner.succeed('Fetched the mnemonic from AWS SSM');
    return output.mnemonic.value;
  } catch (e) {
    spinner.fail('Failed to fetch the mnemonic from AWS SSM');
    throw e;
  }
}

async function importMnemonicToState(airnodeIdShort) {
  // Not deleting the state files on purpose
  const spinner = ora('Importing the mnemonic from AWS SSM').start();
  try {
    await terraform.import_(airnodeIdShort);
    spinner.succeed('Imported the mnemonic from AWS SSM');
  } catch (e) {
    spinner.fail('Failed to import the mnemonic from AWS SSM');
    throw e;
  }
}
