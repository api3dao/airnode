import template from 'lodash/template';
import { z } from 'zod';
import { Config, configSchema } from '../config';
import { Receipt, receiptSchema } from '../receipt';
import { ValidationResult, ValidatorError } from '../error';

export type Secrets = Record<string, string | undefined>;

export function parseConfigWithSecrets(config: unknown, secrets: unknown): ValidationResult<Config> {
  const parseSecretsRes = parseSecrets(secrets);
  if (!parseSecretsRes.success) return parseSecretsRes;

  const interpolateConfigRes = interpolateSecrets(config, parseSecretsRes.data);
  if (!interpolateConfigRes.success) return interpolateConfigRes;

  return parseConfig(interpolateConfigRes.data);
}

export function parseConfig(config: unknown): ValidationResult<Config> {
  const parseConfigRes = configSchema.safeParse(config);

  // TODO: Implement dynamic checks
  return parseConfigRes;
}

export function parseSecrets(secrets: unknown): ValidationResult<Secrets> {
  const secretsSchema = z.record(z.string());

  // TODO: Validate invisible characters in secrets
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

export function interpolateSecrets(config: unknown, secrets: Secrets): ValidationResult<unknown> {
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
