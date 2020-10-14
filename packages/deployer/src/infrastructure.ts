import * as util from 'util';
import * as child from 'child_process';
const exec = util.promisify(child.exec);
import { deriveMasterWalletAddress } from './util';

export async function verifyMnemonicOnSSM(mnemonic, providerIdShort) {
  // Delete the old state files for a standard process
  await exec(`rm -f ./terraform/state/${providerIdShort}*`);

  if (mnemonic) {
    // Attempt to add the mnemonic to SSM
    try {
      await exec(
        `cd terraform && terraform apply -auto-approve -state ./state/${providerIdShort} -var="providerId=${providerIdShort}" -var="mnemonic=${mnemonic}"`
      );
      console.log('Created the mnemonic at the cloud provider');
    } catch (e) {
      if (!e.stderr.includes('ParameterAlreadyExists')) {
        throw e;
      }
      console.log('The mnemonic exists at the cloud provider');
      await exec(
        `cd terraform && terraform import -state ./state/${providerIdShort} aws_ssm_parameter.masterKeyMnemonic /airnode/${providerIdShort}/masterKeyMnemonic`
      );
    }
  } else {
    // Attempt to load the mnemonic from SSM
    try {
      await exec(
        `cd terraform && terraform import -state ./state/${providerIdShort} aws_ssm_parameter.masterKeyMnemonic /airnode/${providerIdShort}/masterKeyMnemonic`
      );
      console.log('Found the mnemonic at the cloud provider');
    } catch (e) {
      if (e.stderr.includes('Cannot import non-existent remote object')) {
        console.error('The mnemonic does not exist at the cloud provider');
      }
      throw e;
    }
  }
  // At this point we know that there is a mnemonic stored at SSM for this providerId

  // Refresh the Terraform output to get the mnemonic
  await exec(`cd terraform && terraform refresh -state ./state/${providerIdShort}`);
  // Check if the stored mnemonic match the one in security.json
  const rawOutput = await exec(`cd terraform && terraform output -state ./state/${providerIdShort} -json`);
  const output = JSON.parse(rawOutput.stdout);
  if (mnemonic && mnemonic !== output.mnemonic.value) {
    throw new Error('The mnemonic stored at the cloud provider does not match the one provided in security.json');
  }
  mnemonic = output.mnemonic.value;

  // Delete the state files because they contain the mnemonic
  await exec(`rm -f ./terraform/state/${providerIdShort}*`);

  return deriveMasterWalletAddress(mnemonic);
}
