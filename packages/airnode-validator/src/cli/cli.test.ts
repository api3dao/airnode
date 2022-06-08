import { join } from 'path';
import * as cli from './cli';

describe('validateConfiguration', () => {
  let succeedSpy: any;
  let failSpy: any;

  const configPath = join(__dirname, '../../test/fixtures/config.valid.json');
  const secretsPath = join(__dirname, '../../test/fixtures/secrets.valid.env');

  beforeEach(() => {
    succeedSpy = jest.spyOn(cli, 'succeed').mockImplementation(jest.fn());
    failSpy = jest.spyOn(cli, 'fail').mockImplementation(jest.fn() as any);
  });

  describe('calls fail', () => {
    it('when config file does not exist', () => {
      cli.validateConfiguration('non-existent-config.json', secretsPath);

      expect(failSpy).toHaveBeenCalledTimes(1);
      expect(failSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Unable to read config file at "non-existent-config.json". Reason: Error: ENOENT: no such file or directory'
        )
      );
    });

    it('when secrets file does not exist', () => {
      cli.validateConfiguration(configPath, 'non-existent-secrets.env');

      expect(failSpy).toHaveBeenCalledTimes(1);
      expect(failSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Unable to read secrets file at "non-existent-secrets.env". Reason: Error: ENOENT: no such file or directory'
        )
      );
    });

    it('when secrets have invalid format', () => {
      cli.validateConfiguration(configPath, join(__dirname, '../../test/fixtures/invalid-secrets.env'));

      expect(failSpy).toHaveBeenCalledTimes(1);
      expect(failSpy).toHaveBeenCalledWith(
        'The configuration is not valid. Reason: Secrets interpolation failed. Caused by: PROVIDER_URL is not defined'
      );
    });

    it('when secret is missing', () => {
      cli.validateConfiguration(configPath, join(__dirname, '../../test/fixtures/missing-secrets.env'));

      expect(failSpy).toHaveBeenCalledTimes(1);
      expect(failSpy).toHaveBeenCalledWith(
        'The configuration is not valid. Reason: Secrets interpolation failed. Caused by: PROVIDER_URL is not defined'
      );
    });

    it('when secret is not a valid JS identifier', () => {
      cli.validateConfiguration(
        join(__dirname, '../../test/fixtures/invalid-secret-name/config.json'),
        join(__dirname, '../../test/fixtures/invalid-secret-name/secrets.env')
      );

      expect(failSpy).toHaveBeenCalledTimes(1);
      expect(failSpy).toHaveBeenCalledWith(
        `
The configuration is not valid. Reason: [
  {
    "validation": "regex",
    "code": "invalid_string",
    "message": "Secret name is not a valid. Secret name must match /^[A-Z][A-Z0-9_]*$/",
    "path": [
      "0123STAGE_NAME"
    ]
  }
]
`.trim()
      );
    });
  });

  it('calls success when for valid configuration', () => {
    cli.validateConfiguration(configPath, secretsPath);

    expect(succeedSpy).toHaveBeenCalledTimes(1);
    expect(succeedSpy).toHaveBeenCalledWith('The configuration is valid');
  });
});
