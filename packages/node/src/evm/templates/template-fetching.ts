import { ethers } from 'ethers';
import chunk from 'lodash/chunk';
import flatMap from 'lodash/flatMap';
import isEmpty from 'lodash/isEmpty';
import uniq from 'lodash/uniq';
import { go, retryOperation } from '../../utils/promise-utils';
import * as logger from '../../logger';
import { Convenience } from '../contracts';
import { ApiCall, ApiCallTemplate, ClientRequest, LogsData } from '../../types';

interface FetchOptions {
  convenienceAddress: string;
  provider: ethers.providers.JsonRpcProvider;
}

interface ApiCallTemplatesById {
  [id: string]: ApiCallTemplate;
}

async function fetchTemplateGroup(
  convenience: ethers.Contract,
  templateIds: string[]
): Promise<LogsData<ApiCallTemplatesById>> {
  const contractCall = () => convenience.getTemplates(templateIds) as Promise<any>;
  const retryableContractCall = retryOperation(2, contractCall);

  const [err, rawTemplates] = await go(retryableContractCall);
  // If we fail to fetch templates, the linked requests will be discarded and retried
  // on the next run
  if (err || !rawTemplates) {
    const log = logger.pend('ERROR', 'Failed to fetch API call templates', err);
    return [[log], {}];
  }

  const templatesById = templateIds.reduce((acc, templateId, index) => {
    // Templates are always returned in the same order that they
    // are called with
    const template: ApiCallTemplate = {
      designatedWallet: rawTemplates.designatedWallets[index],
      encodedParameters: rawTemplates.parameters[index],
      endpointId: rawTemplates.endpointIds[index],
      fulfillAddress: rawTemplates.fulfillAddresses[index],
      fulfillFunctionId: rawTemplates.fulfillFunctionIds[index],
      id: templateId,
      providerId: rawTemplates.providerIds[index],
      requesterIndex: rawTemplates.requesterIndices[index],
    };
    return { ...acc, [templateId]: template };
  }, {});

  return [[], templatesById];
}

export async function fetch(
  apiCalls: ClientRequest<ApiCall>[],
  fetchOptions: FetchOptions
): Promise<LogsData<ApiCallTemplatesById>> {
  const templateIds = apiCalls.filter((a) => a.templateId).map((a) => a.templateId);
  if (isEmpty(templateIds)) {
    return [[], {}];
  }

  // Requests are made for up to 10 templates at a time
  const groupedTemplateIds = chunk(uniq(templateIds), 10);

  // Create an instance of the contract that we can re-use
  const convenience = new ethers.Contract(fetchOptions.convenienceAddress, Convenience.ABI, fetchOptions.provider);

  // Fetch all groups of templates in parallel
  const promises = groupedTemplateIds.map((ids: string[]) => fetchTemplateGroup(convenience, ids));

  const templateResponses = await Promise.all(promises);
  const templateResponseLogs = flatMap(templateResponses, (t) => t[0]);

  // Merge all templates into a single object, keyed by their ID for faster/easier lookup
  const templatesById = templateResponses.reduce((acc, result) => {
    return { ...acc, ...result[1] };
  }, {});

  return [templateResponseLogs, templatesById];
}
