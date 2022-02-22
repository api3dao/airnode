import { exec, ExecException } from 'child_process';
import { exit } from 'process';

const BINARY = 'terraform';
const DIR = 'packages/airnode-deployer/terraform';
const CMD_CHECK = `${BINARY} fmt -list=true -write=false -recursive ${DIR}`;
const CMD_WRITE = `${BINARY} fmt -list=true -write=true -recursive ${DIR}`;

if (process.argv.length !== 3) {
  console.error('Wrong script usage!');
  console.error('terraform-fmt.ts check | write');
  exit(3);
}

const command = process.argv[2];

if (!['check', 'write'].includes(command)) {
  console.error(`Unknown command '${command}'`);
  exit(3);
}

exec(`command -v ${BINARY}`, (err, _stdout, _stderr) => {
  if (err) {
    console.log('Missing Terraform binary, skipping formatting.');
    exit();
  }

  if (command === 'check') {
    exec(CMD_CHECK, (err, stdout, stderr) => {
      failOnError('Failed to list Terraform formatting issues', err, stderr);

      if (stdout) {
        console.log('Found unformatted TF files:');
        console.log(stdout);
        // We have unformatted files, we have to fail
        exit(1);
      }

      console.log('All TF files formatted correctly!');
      exit();
    });
  }

  if (command === 'write') {
    exec(CMD_WRITE, (err, stdout, stderr) => {
      failOnError('Failed to correct Terraform formatting issues', err, stderr);

      if (stdout) {
        console.log('Fixed formatting of the following TF files:');
        console.log(stdout);
      } else {
        console.log('All TF files already formatted correctly, nothing to do');
      }
      exit();
    });
  }
});

function failOnError(message: string, err: ExecException | null, stderr: string) {
  if (err) {
    console.error(message);
    console.error(err);
    console.error(stderr);
    exit(2);
  }
}
