import { ethers } from 'ethers';
import chunk from 'lodash/chunk';
import { goTimeout } from '../../../utils/promise-utils';
import { logProviderJSON } from '../../../utils/logger';
import { Convenience } from '../../../ethereum/contracts';
import { ApiCallRequest, ApiCallTemplate, ProviderState } from '../../../../types';

const TIMEOUT = 5_000;

async function fetchTemplateGroup(state: ProviderState, templateIds: string[]): Promise<ApiCallTemplate[] | null> {
  const { config, provider } = state;
  const contract = new ethers.Contract(Convenience.addresses[config.chainId], Convenience.ABI, provider);
  const contractCall = contract.getTemplates(templateIds) as Promise<ApiCallTemplate[]>;
  const [err, templates] = await goTimeout(TIMEOUT, contractCall);
  if (err || !templates) {
    logProviderJSON(config.name, 'ERROR', `Failed to templates. ${err}`);
    return null;
  }
  return templates;
}

export async function fetchTemplates(state: ProviderState, apiCallRequests: ApiCallRequest[]) {
  const templateIds = apiCallRequests.map(r => r.templateId).filter(t => !!t);

  const groupedTemplateIds = chunk(templateIds, 10);

}
