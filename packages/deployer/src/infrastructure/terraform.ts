import * as util from 'util';
import * as child from 'child_process';
const exec = util.promisify(child.exec);

export function deleteStateFiles(providerIdShort) {
  exec(`rm -f ./terraform/state/${providerIdShort}*`);
}

export function apply(providerIdShort, mnemonic) {
  exec(
    `cd terraform && terraform apply -auto-approve -state ./state/${providerIdShort} -var="providerId=${providerIdShort}" -var="mnemonic=${mnemonic}" -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY"`
  );
}

export function destroy(providerIdShort) {
  exec(
    `cd terraform && terraform destroy -auto-approve -state ./state/${providerIdShort} -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY"`
  );
}

export function import_(providerIdShort) {
  exec(
    `cd terraform && terraform import -state ./state/${providerIdShort} -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY" aws_ssm_parameter.masterKeyMnemonic /airnode/${providerIdShort}/masterKeyMnemonic`
  );
}

export function refresh(providerIdShort) {
  exec(
    `cd terraform && terraform refresh -state ./state/${providerIdShort} -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY"`
  );
}

export function output(providerIdShort) {
  return exec(`cd terraform && terraform output -state ./state/${providerIdShort} -json`);
}
