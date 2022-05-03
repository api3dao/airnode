import { spawnSync } from 'child_process';
import { join } from 'path';

const runValidator = (args: string[]) => {
  const command = ['node', join(__dirname, '../dist/bin/validator.js'), ...args].join(' ');

  return spawnSync(command, { shell: true });
};

describe('validator CLI', () => {
  it('shows help', () => {
    const cliHelp = runValidator(['--help']).stdout.toString();

    expect(cliHelp).toMatchSnapshot();
  });

  it('validates valid configuration', () => {
    const args = [
      `--config ${join(__dirname, './fixtures/valid-config.json')}`,
      `--secrets ${join(__dirname, './fixtures/valid-secrets.env')}`,
    ];

    const output = runValidator(args).stderr.toString();

    expect(output).toEqual('✔ The configuration is valid\n');
  });

  it('validates invalid configuration', () => {
    const args = [
      `--config ${join(__dirname, './fixtures/valid-config.json')}`,
      `--secrets ${join(__dirname, './fixtures/missing-secrets.env')}`,
    ];

    const output = runValidator(args).stderr.toString();

    expect(output).toEqual(
      '✖ The configuration is not valid. Reason: Error: Error interpolating secrets. Make sure the secrets format is correct\n'
    );
  });
});
