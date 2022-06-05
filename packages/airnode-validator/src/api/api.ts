import { goSync } from '@api3/promise-utils';
import template from 'lodash/template';
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
  const parseSecretsRes = parseSecrets(secrets);
  if (!parseSecretsRes.success) return parseSecretsRes;

  const interpolateConfigRes = interpolateSecrets(config, parseSecretsRes.data);
  if (!interpolateConfigRes.success) return interpolateConfigRes;

  return parseConfig(interpolateConfigRes.data);
}

/**
 * @param config a JSON object representation of config.json
 * @returns `{success: true, data: <interpolated config>}` if successful, `{success: false, error: <error>}` otherwise
 */
export function parseConfig(config: unknown): ValidationResult<Config> {
  return configSchema.safeParse(config);
}

/**
 * @param secrets a key value object with the secrets
 * @returns `{success: true, data: <secrets>}` if successful, `{success: false, error: <error>}` otherwise
 */
export function parseSecrets(secrets: unknown): ValidationResult<Secrets> {
  const secretsSchema = z.record(z.string(), z.string());
  return secretsSchema.safeParse(secrets);
}

/**
 * @param receipt a JSON object representation of receipt.json
 * @returns `{success: true, data: <receipt>}` if successful, `{success: false, error: <error>}` otherwise
 */
export function parseReceipt(receipt: unknown): ValidationResult<Receipt> {
  return receiptSchema.safeParse(receipt);
}

// Regular expression that does not match anything, ensuring no escaping or interpolation happens
// https://github.com/lodash/lodash/blob/4.17.15/lodash.js#L199
const NO_MATCH_REGEXP = /($^)/;
// Regular expression matching ES template literal delimiter (${}) with escaping
// https://github.com/lodash/lodash/blob/4.17.15/lodash.js#L175
const ES_MATCH_REGEXP = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

function interpolateSecrets(config: unknown, secrets: Secrets): ValidationResult<unknown> {
  return goSync(() =>
    JSON.parse(
      template(JSON.stringify(config), {
        escape: NO_MATCH_REGEXP,
        evaluate: NO_MATCH_REGEXP,
        interpolate: ES_MATCH_REGEXP,
      })(secrets)
    )
  );
}

/**
 * Used to interpolate secrets into config. This function only interpolates the secrets and does not perform any
 * validation. Only use this function when you are sure the interpolation result is a valid Airnode config.
 *
 * In case there is an error when interpolating secrets the function throws an error.
 */
export function unsafeParseConfigWithSecrets(config: unknown, secrets: Secrets): Config {
  const interpolationResult = interpolateSecrets(config, secrets);
  if (!interpolationResult.success) throw interpolationResult.error;

  return interpolationResult.data as Config;
}
