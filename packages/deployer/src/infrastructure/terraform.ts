import * as util from 'util';
import * as child from 'child_process';
const exec = util.promisify(child.exec);

export function deleteStateFiles(providerIdShort) {
  exec(`rm -f ./terraform/state/${providerIdShort}*`);
}

export async function deleteStateFiles(providerIdShort) {
  await exec(`rm -f ./terraform/state/${providerIdShort}*`);
}

export async function apply(providerIdShort, mnemonic) {
  await exec(
    `cd terraform && terraform apply -auto-approve -state ./state/${providerIdShort} -var="providerId=${providerIdShort}" -var="mnemonic=${mnemonic}" -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY"`
  );
}

export async function destroy(providerIdShort) {
  await exec(
    `cd terraform && terraform destroy -auto-approve -state ./state/${providerIdShort} -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY"`
  );
}

export async function import_(providerIdShort) {
  await exec(
    `cd terraform && terraform import -state ./state/${providerIdShort} -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY" aws_ssm_parameter.masterKeyMnemonic /airnode/${providerIdShort}/masterKeyMnemonic`
  );
}

export async function refresh(providerIdShort) {
  await exec(
    `cd terraform && terraform refresh -state ./state/${providerIdShort} -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY"`
  );
}

export async function output(providerIdShort) {
  return await exec(`cd terraform && terraform output -state ./state/${providerIdShort} -json`);
}
