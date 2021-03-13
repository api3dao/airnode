import * as util from 'util';
import * as child from 'child_process';
const exec = util.promisify(child.exec);

export async function applyTerraformWorkaround(region) {
  // See https://github.com/api3dao/airnode/issues/110
  await exec('cp ./terraform/variables.tf.workaround ./terraform/variables.tf');
  await exec(`sed -i -- "s=<UPDATE_REGION>=${region}=g" ./terraform/variables.tf`);
}

export async function deleteStateFiles(airnodeIdShort) {
  await exec(`rm -f ./terraform/state/${airnodeIdShort}*`);
}

export async function apply(airnodeIdShort, mnemonic) {
  await exec(
    `cd terraform && terraform apply -auto-approve -state ./state/${airnodeIdShort} -var="airnodeId=${airnodeIdShort}" -var="mnemonic=${mnemonic}" -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY"`
  );
}

export async function destroy(airnodeIdShort) {
  await exec(
    `cd terraform && terraform destroy -auto-approve -state ./state/${airnodeIdShort} -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY"`
  );
}

export async function import_(airnodeIdShort) {
  await exec(
    `cd terraform && terraform import -state ./state/${airnodeIdShort} -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY" aws_ssm_parameter.masterKeyMnemonic /airnode/${airnodeIdShort}/masterKeyMnemonic`
  );
}

export async function refresh(airnodeIdShort) {
  await exec(
    `cd terraform && terraform refresh -state ./state/${airnodeIdShort} -var="aws_access_key_id=$AWS_ACCESS_KEY_ID" -var="aws_secret_key=$AWS_SECRET_KEY"`
  );
}

export async function output(airnodeIdShort) {
  return await exec(`cd terraform && terraform output -state ./state/${airnodeIdShort} -json`);
}
