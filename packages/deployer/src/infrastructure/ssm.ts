import ora from 'ora';
import * as terraform from './terraform';

export async function checkIfProviderIdShortExists(providerIdShort) {
  await terraform.deleteStateFiles(providerIdShort);
  const spinner = ora(`Checking if ${providerIdShort} exists as providerIdShort at AWS SSM`).start();
  try {
    await terraform.import_(providerIdShort);
    spinner.info(`${providerIdShort} exists as providerIdShort at AWS SSM`);
    return true;
  } catch (e) {
    if (e.stderr.includes('Cannot import non-existent remote object')) {
      spinner.info(`${providerIdShort} does not exist as providerIdShort at AWS SSM`);
      return false;
    }
    spinner.fail(`Failed to check if ${providerIdShort} exists as providerIdShort at AWS SSM`);
    throw e;
  }
}

export async function removeMnemonic(providerIdShort) {
  await terraform.deleteStateFiles(providerIdShort);
  await importMnemonicToState(providerIdShort);
  const spinner = ora('Removing the mnemonic from AWS SSM').start();
  try {
    await terraform.destroy(providerIdShort);
    spinner.succeed('Removed the mnemonic from AWS SSM');
  } catch (e) {
    spinner.fail('Failed to remove the mnemonic from AWS SSM');
    throw e;
  }
}

export async function addMnemonic(mnemonic, providerIdShort) {
  await terraform.deleteStateFiles(providerIdShort);
  const spinner = ora(`Storing the mnemonic at AWS SMM`).start();
  try {
    await terraform.apply(providerIdShort, mnemonic);
    spinner.succeed('Stored the mnemonic at AWS SSM');
  } catch (e) {
    spinner.fail('Failed to store the mnemonic at AWS SSM');
    throw e;
  }
}

export async function fetchMnemonic(providerIdShort) {
  await terraform.deleteStateFiles(providerIdShort);
  const spinner = ora('Fetching the mnemonic from AWS SSM').start();
  try {
    await terraform.import_(providerIdShort);
    await terraform.refresh(providerIdShort);
    const rawOutput = await terraform.output(providerIdShort);
    const output = JSON.parse(rawOutput.stdout);
    spinner.succeed('Fetched the mnemonic from AWS SSM');
    return output.mnemonic.value;
  } catch (e) {
    spinner.fail('Failed to fetch the mnemonic from AWS SSM');
    throw e;
  }
}

async function importMnemonicToState(providerIdShort) {
  // Not deleting the state files on purpose
  const spinner = ora('Importing the mnemonic from AWS SSM').start();
  try {
    await terraform.import_(providerIdShort);
    spinner.succeed('Imported the mnemonic from AWS SSM');
  } catch (e) {
    spinner.fail('Failed to import the mnemonic from AWS SSM');
    throw e;
  }
}
