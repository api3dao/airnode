import { ethers } from 'ethers';
import chunk from 'lodash/chunk';
import flatMap from 'lodash/flatMap';
import keyBy from 'lodash/keyBy';
import isEmpty from 'lodash/isEmpty';
import uniq from 'lodash/uniq';
import { logger, go } from '@api3/airnode-utilities';
import { Template } from '../../config';
import { AirnodeRrpV0, AirnodeRrpV0Factory } from '../contracts';
import { ApiCall, ApiCallTemplate, Request, LogsData } from '../../types';
import { CONVENIENCE_BATCH_SIZE, DEFAULT_RETRY_TIMEOUT_MS } from '../../constants';

export interface FetchOptions {
  readonly airnodeRrpAddress: string;
  readonly provider: ethers.providers.JsonRpcProvider;
  readonly configTemplates: Template[];
  readonly airnodeAddress: string;
}

interface ApiCallTemplatesById {
  readonly [id: string]: ApiCallTemplate;
}

export async function fetchTemplate(
  airnodeRrp: AirnodeRrpV0,
  templateId: string
): Promise<LogsData<ApiCallTemplate | null>> {
  const operation = () => airnodeRrp.templates(templateId);
  const [err, rawTemplate] = await go(operation, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (err || !rawTemplate) {
    const log = logger.pend('ERROR', `Failed to fetch API call template:${templateId}`, err);
    return [[log], null];
  }

  const successLog = logger.pend('INFO', `Fetched API call template:${templateId}`);

  const template: ApiCallTemplate = {
    airnodeAddress: rawTemplate.airnode,
    endpointId: rawTemplate.endpointId,
    encodedParameters: rawTemplate.parameters,
    id: templateId,
  };
  return [[successLog], template];
}

async function fetchTemplateGroup(
  airnodeRrp: AirnodeRrpV0,
  templateIds: string[]
): Promise<LogsData<ApiCallTemplatesById>> {
  const contractCall = () => airnodeRrp.getTemplates(templateIds);
  const [err, rawTemplates] = await go(contractCall, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  // If we fail to fetch templates, the linked requests will be discarded and retried
  // on the next run
  if (err || !rawTemplates) {
    const groupLog = logger.pend('ERROR', 'Failed to fetch API call templates', err);

    // If the template group cannot be fetched, fallback to fetching templates individually
    const promises = templateIds.map((id) => fetchTemplate(airnodeRrp, id));
    const logsWithTemplates = await Promise.all(promises);
    const individualLogs = flatMap(logsWithTemplates, (v) => v[0]);
    const templates = logsWithTemplates.map((v) => v[1]).filter((v) => !!v) as ApiCallTemplate[];
    const templatesById = keyBy(templates, 'id');

    return [[groupLog, ...individualLogs], templatesById];
  }

  const templatesById = templateIds.reduce((acc, templateId, index) => {
    // Templates are always returned in the same order that they
    // are called with
    const template: ApiCallTemplate = {
      airnodeAddress: rawTemplates.airnodes[index],
      endpointId: rawTemplates.endpointIds[index],
      encodedParameters: rawTemplates.parameters[index],
      id: templateId,
    };
    return { ...acc, [templateId]: template };
  }, {});

  return [[], templatesById];
}

export const getConfigTemplates = (templateIds: string[], fetchOptions: FetchOptions) => {
  return templateIds.reduce((acc: ApiCallTemplatesById, id) => {
    const configTemplateMatch = fetchOptions.configTemplates.find((configTemplate) => configTemplate.templateId === id);
    if (configTemplateMatch) {
      const { templateId: _templateId, ...rest } = configTemplateMatch;
      return {
        ...acc,
        [id]: { ...rest, id, airnodeAddress: fetchOptions.airnodeAddress },
      };
    }

    return acc;
  }, {});
};

export async function fetch(
  apiCalls: Request<ApiCall>[],
  fetchOptions: FetchOptions
): Promise<LogsData<ApiCallTemplatesById>> {
  const templateIds = apiCalls.reduce((acc: string[], apiCall) => {
    if (apiCall.templateId) return [...acc, apiCall.templateId];
    return acc;
  }, []);

  if (isEmpty(templateIds)) {
    return [[], {}];
  }

  // Get valid templates from config.json
  const configTemplatesById = getConfigTemplates(templateIds, fetchOptions);

  // Filter verified config templateIds to skip fetching from chain
  const templateIdsToFetch = templateIds.filter((id) => !configTemplatesById[id]);

  // Requests are made for up to 10 templates at a time
  const groupedTemplateIds = chunk(uniq(templateIdsToFetch), CONVENIENCE_BATCH_SIZE);

  // Create an instance of the contract that we can re-use
  const airnodeRrp = AirnodeRrpV0Factory.connect(fetchOptions.airnodeRrpAddress, fetchOptions.provider);

  // Fetch all groups of templates in parallel
  const promises = groupedTemplateIds.map((ids) => fetchTemplateGroup(airnodeRrp, ids));

  const templateResponses = await Promise.all(promises);
  const templateResponseLogs = flatMap(templateResponses, (t) => t[0]);

  // Merge all templates into a single object, keyed by their ID for faster/easier lookup
  const onchainTemplatesById = templateResponses.reduce((acc, result) => {
    return { ...acc, ...result[1] };
  }, {});

  return [templateResponseLogs, { ...onchainTemplatesById, ...configTemplatesById }];
}
