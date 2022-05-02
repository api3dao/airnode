import template from 'lodash/template';
import { z } from 'zod';
import { SchemaType } from '../types';
import { configSchema } from '../config';
import { Receipt, receiptSchema } from '../receipt';
import { ValidationResult, ValidatorError } from '../validation-result';

type Secrets = Record<string, string | undefined>;
type Config = SchemaType<typeof configSchema>;

export function parseConfigWithSecrets(config: unknown, secrets: unknown): ValidationResult<Config> {
  const parseSecretsRes = parseSecrets(secrets);
  if (!parseSecretsRes.success) return parseSecretsRes;

  const interpolateConfigRes = interpolateSecrets(config, parseSecretsRes.data);
  if (!interpolateConfigRes.success) return interpolateConfigRes;

  return parseConfig(interpolateConfigRes.data);
}

export function parseConfig(config: unknown): ValidationResult<Config> {
  const parseConfigRes = configSchema.safeParse(config);
  return parseConfigRes;
}

export function parseSecrets(secrets: unknown): ValidationResult<Secrets> {
  const secretsSchema = z.record(z.string());

  const result = secretsSchema.safeParse(secrets);
  return result;
}

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
  // TODO: Replace with go utils
  try {
    const interpolated = JSON.parse(
      template(JSON.stringify(config), {
        escape: NO_MATCH_REGEXP,
        evaluate: NO_MATCH_REGEXP,
        interpolate: ES_MATCH_REGEXP,
      })(secrets)
    );

    return {
      success: true,
      data: interpolated,
    };
  } catch (e) {
    return {
      success: false,
      error: new ValidatorError('Error interpolating secrets. Make sure the secrets format is correct'),
    };
  }
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
