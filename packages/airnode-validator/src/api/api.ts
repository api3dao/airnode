import { goSync } from '@api3/promise-utils';
import { interpolateSecretsIntoConfig } from '@api3/commons';
import { z } from 'zod';
import { Config, configSchema } from '../config';
import { Receipt, receiptSchema } from '../receipt';
import { Secrets } from '../types';
import { ValidationResult } from '../validation-result';

/**
 * Interpolates `secrets` into `config` and validates the interpolated configuration.
 *
 * @param config a JSON object representation of config.json
 * @param secrets a key value object with the secrets
 * @returns `{success: true, data: <interpolated config>}` if successful, `{success: false, error: <error>}` otherwise
 */
export function parseConfigWithSecrets(config: unknown, secrets: unknown): ValidationResult<Config> {
  const parsedSecrets = parseSecrets(secrets);
  if (!parsedSecrets.success) return parsedSecrets;

  const interpolateConfigRes = goSync(() =>
    interpolateSecretsIntoConfig(config, parsedSecrets.data, { allowBlankSecretValue: false, validateSecretName: true })
  );
  if (!interpolateConfigRes.success) {
    return {
      success: false,
      error: new Error('Secrets interpolation failed. Caused by: ' + interpolateConfigRes.error.message),
    };
  }

  return parseConfig(interpolateConfigRes.data);
}

/**
 * @param config a JSON object representation of config.json
 * @returns `{success: true, data: <interpolated config>}` if successful, `{success: false, error: <error>}` otherwise
 */
export function parseConfig(config: unknown): ValidationResult<Config> {
  return configSchema.safeParse(config);
}

const secretNamePattern = /^[A-Z][A-Z0-9_]*$/;
export const secretNameSchema = z
  .string()
  .regex(secretNamePattern, `Secret name is not a valid. Secret name must match ${secretNamePattern.toString()}`);
export const secretsSchema = z.record(secretNameSchema, z.string().min(1, { message: 'Secret cannot be empty' }));

/**
 * @param secrets a key value object with the secrets
 * @returns `{success: true, data: <secrets>}` if successful, `{success: false, error: <error>}` otherwise
 */
export function parseSecrets(secrets: unknown): ValidationResult<Secrets> {
  return secretsSchema.safeParse(secrets);
}

/**
 * @param receipt a JSON object representation of receipt.json
 * @returns `{success: true, data: <receipt>}` if successful, `{success: false, error: <error>}` otherwise
 */
export function parseReceipt(receipt: unknown): ValidationResult<Receipt> {
  return receiptSchema.safeParse(receipt);
}

/**
 * Used to interpolate secrets into config. This function only interpolates the secrets and does not perform any
 * validation. Only use this function when you are sure the interpolation result is a valid Airnode config.
 *
 * In case there is an error when interpolating secrets the function throws an error.
 */
export function unsafeParseConfigWithSecrets(config: unknown, secrets: Secrets): Config {
  // System and docker secrets passed via process.env do not necessarily obey the expected secret name pattern
  return interpolateSecretsIntoConfig(config, secrets, {
    allowBlankSecretValue: true,
    validateSecretName: false,
  }) as Config;
}
