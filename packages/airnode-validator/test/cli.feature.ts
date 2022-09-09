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
      `--config ${join(__dirname, './fixtures/config.valid.json')}`,
      `--secrets ${join(__dirname, './fixtures/secrets.valid.env')}`,
    ];

    const output = runValidator(args);

    expect(output.status).toBe(0);
    // We use "expect.stringContaining" because the output begins with "✔"
    expect(output.stderr.toString()).toEqual(expect.stringContaining('The configuration is valid\n'));
  });

  it('validates invalid configuration', () => {
    const args = [
      `--config ${join(__dirname, './fixtures/config.valid.json')}`,
      `--secrets ${join(__dirname, './fixtures/missing-secrets.env')}`,
    ];

    const output = runValidator(args);

    expect(output.status).toBe(1);
    expect(output.stderr.toString()).toEqual(
      // We use "expect.stringContaining" because the output begins with "✖"
      expect.stringContaining(
        'The configuration is not valid. Reason: Secrets interpolation failed. Caused by: PROVIDER_URL is not defined'
      )
    );
  });
});
