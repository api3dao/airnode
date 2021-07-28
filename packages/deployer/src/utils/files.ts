import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { Receipt } from '../types';
import * as logger from '../utils/logger';

export function parseSecretsFile(secretsPath: string) {
  logger.debug('Parsing secrets file');
  try {
    return dotenv.parse(fs.readFileSync(secretsPath));
  } catch (e) {
    logger.fail('Failed to parse secrets file');
    throw e;
  }
}

export function parseReceiptFile(receiptFilename: string) {
  logger.debug('Parsing receipt file');
  try {
    return JSON.parse(fs.readFileSync(receiptFilename, 'utf8')) as Receipt;
  } catch (e) {
    logger.fail('Failed to parse receipt file');
    throw e;
  }
}
