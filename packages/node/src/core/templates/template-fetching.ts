import { ethers } from 'ethers';
import chunk from 'lodash/chunk';
import flatMap from 'lodash/flatMap';
import uniq from 'lodash/uniq';
import { go, retryOperation } from '../utils/promise-utils';
import * as logger from '../utils/logger';
import * as ethereum from '../ethereum';
import { ApiCallTemplate, ProviderState } from '../../types';

interface ApiCallTemplatesById {
  [id: string]: ApiCallTemplate;
}

async function fetchTemplateGroup(state: ProviderState, templateIds: string[]): Promise<ApiCallTemplatesById> {
  const { Convenience } = ethereum.contracts;
  const { config, provider } = state;

  const contract = new ethers.Contract(Convenience.addresses[config.chainId], Convenience.ABI, provider);
  const contractCall = () => contract.getTemplates(templateIds) as Promise<any>;
  const retryableContractCall = retryOperation(2, contractCall, { timeouts: [4000, 4000] }) as Promise<any>;

  const [err, rawTemplates] = await go(retryableContractCall);
  // If we fail to fetch templates, the linked requests will be discarded and retried
  // on the next run
  if (err || !rawTemplates) {
    logger.logProviderError(config.name, 'Failed to fetch API call templates', err);
    return {};
  }

  return templateIds.reduce((acc, templateId, index) => {
    // Templates are always returned in the same order that they
    // are called with
    const template: ApiCallTemplate = {
      templateId,
      endpointId: rawTemplates.endpointIds[index],
      providerId: rawTemplates.providerIds[index],
      fulfillAddress: rawTemplates.fulfillAddresses[index],
      fulfillFunctionId: rawTemplates.fulfillFunctionIds[index],
      errorAddress: rawTemplates.errorAddresses[index],
      errorFunctionId: rawTemplates.errorFunctionIds[index],
      encodedParameters: rawTemplates.parameters[index],
    };
    return { ...acc, [templateId]: template };
  }, {});
}

export async function fetch(state: ProviderState): Promise<ApiCallTemplatesById> {
  const apiCalls = flatMap(Object.values(state.walletDataByIndex).map((wd) => wd.requests.apiCalls));

  const templateIds = apiCalls.filter((a) => a.templateId).map((a) => a.templateId);

  // Requests are made for up to 10 templates at a time
  const groupedTemplateIds = chunk(uniq(templateIds), 10);

  // Fetch all groups of templates in parallel
  const promises = groupedTemplateIds.map((ids: string[]) => fetchTemplateGroup(state, ids));

  const templatesById = await Promise.all(promises);

  // Merge all templates into a single object, keyed by their ID for faster/easier lookup
  return Object.assign({}, ...templatesById);
}
