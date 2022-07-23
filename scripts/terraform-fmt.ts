import { exec, ExecException } from 'child_process';
import { exit } from 'process';
import { logger } from '@api3/airnode-utilities';

const BINARY = 'terraform';
const DIR = 'packages/airnode-deployer/terraform';
const BINARY_TEST = `${BINARY} -version`;
const CMD_CHECK = `${BINARY} fmt -list=true -write=false -recursive ${DIR}`;
const CMD_WRITE = `${BINARY} fmt -list=true -write=true -recursive ${DIR}`;

const EC_ARGUMENTS = 22; // Invalid arguments
const EC_TERRAFORM = 23; // Terraform command failed
const EC_FORMATTING = 24; // Formatting issue

if (process.argv.length !== 3) {
  logger.error('Wrong script usage!');
  logger.error('terraform-fmt.ts check | write');
  exit(EC_ARGUMENTS);
}

const command = process.argv[2];

if (!['check', 'write'].includes(command)) {
  logger.error(`Unknown command '${command}'`);
  exit(EC_ARGUMENTS);
}

exec(BINARY_TEST, (err, _stdout, _stderr) => {
  if (err) {
    logger.log('Missing Terraform binary, skipping formatting.');
    exit();
  }

  if (command === 'check') {
    exec(CMD_CHECK, (err, stdout, stderr) => {
      failOnError('Failed to list Terraform formatting issues', err, stderr);

      if (stdout) {
        logger.log('Found unformatted TF files:');
        logger.log(stdout);
        // We have unformatted files, we have to fail
        exit(EC_FORMATTING);
      }

      logger.log('All TF files formatted correctly!');
      exit();
    });
  }

  if (command === 'write') {
    exec(CMD_WRITE, (err, stdout, stderr) => {
      failOnError('Failed to correct Terraform formatting issues', err, stderr);

      if (stdout) {
        logger.log('Fixed formatting of the following TF files:');
        logger.log(stdout);
      } else {
        logger.log('All TF files already formatted correctly, nothing to do');
      }
      exit();
    });
  }
});

function failOnError(message: string, err: ExecException | null, stderr: string) {
  if (err) {
    logger.error(message);
    logger.error(err.message);
    logger.error(stderr);
    exit(EC_TERRAFORM);
  }
}
