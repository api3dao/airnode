import { execSync, spawnSync } from 'child_process';
import { join } from 'path';

const runValidator = (args: string[]) => {
  const command = ['node', join(__dirname, '../dist/cjs/bin/validator.js'), ...args].join(' ');

  return spawnSync(command, { shell: true });
};

describe('validator CLI', () => {
  beforeAll(() => {
    execSync('yarn build');
  });

  it('shows help', () => {
    const cliHelp = runValidator(['--help']).stdout.toString();

    expect(cliHelp).toMatchSnapshot();
  });

  it('validates valid configuration', () => {
    const args = [
      `--config ${join(__dirname, './fixtures/config.valid.json')}`,
      `--secrets ${join(__dirname, './fixtures/secrets.valid.env')}`,
    ];

    const output = runValidator(args).stderr.toString();

    expect(output).toEqual(expect.stringContaining('The configuration is valid'));
  });

  it('validates invalid configuration', () => {
    const args = [
      `--config ${join(__dirname, './fixtures/config.valid.json')}`,
      `--secrets ${join(__dirname, './fixtures/missing-secrets.env')}`,
    ];

    const output = runValidator(args).stderr.toString();

    expect(output).toEqual(
      expect.stringContaining(
        'The configuration is not valid. Reason: Error: Error interpolating secrets. Make sure the secrets format is correct\n'
      )
    );
  });
});
