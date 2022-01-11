import { validateJsonWithTemplate } from '@api3/airnode-validator';

export function validateReceipt(supposedReceipt: any, nodeVersion: string) {
  // TODO: Validate receipt version https://api3dao.atlassian.net/browse/AN-423
  return validateJsonWithTemplate(supposedReceipt, `receipt@${nodeVersion}`, true);
}
