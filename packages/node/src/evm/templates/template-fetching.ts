import { ethers } from 'ethers';
import chunk from 'lodash/chunk';
import flatMap from 'lodash/flatMap';
import keyBy from 'lodash/keyBy';
import isEmpty from 'lodash/isEmpty';
import uniq from 'lodash/uniq';
import { go } from '../../utils/promise-utils';
import * as logger from '../../logger';
import { AirnodeRrp, AirnodeRrpFactory } from '../contracts';
import { ApiCall, ApiCallTemplate, Request, LogsData } from '../../types';
import { CONVENIENCE_BATCH_SIZE, DEFAULT_RETRY_TIMEOUT_MS } from '../../constants';

export interface FetchOptions {
  readonly airnodeRrpAddress: string;
  readonly provider: ethers.providers.JsonRpcProvider;
}

interface ApiCallTemplatesById {
  readonly [id: string]: ApiCallTemplate;
}

export async function fetchTemplate(
  airnodeRrp: AirnodeRrp,
  templateId: string
): Promise<LogsData<ApiCallTemplate | null>> {
  const operation = () => airnodeRrp.getTemplates([templateId]);
  const [err, rawTemplate] = await go(operation, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  if (err || !rawTemplate) {
    const log = logger.pend('ERROR', `Failed to fetch API call template:${templateId}`, err);
    return [[log], null];
  }

  const successLog = logger.pend('INFO', `Fetched API call template:${templateId}`);

  const template: ApiCallTemplate = {
    airnodeAddress: rawTemplate.airnodes[0],
    encodedParameters: rawTemplate.parameters[0],
    endpointId: rawTemplate.endpointIds[0],
    id: templateId,
  };
  return [[successLog], template];
}

async function fetchTemplateGroup(
  airnodeRrp: AirnodeRrp,
  templateIds: string[]
): Promise<LogsData<ApiCallTemplatesById>> {
  const contractCall = () => airnodeRrp.getTemplates(templateIds);
  const [err, rawTemplates] = await go(contractCall, { retries: 1, timeoutMs: DEFAULT_RETRY_TIMEOUT_MS });
  // If we fail to fetch templates, the linked requests will be discarded and retried
  // on the next run
  if (err || !rawTemplates) {
    const groupLog = logger.pend('ERROR', 'Failed to fetch API call templates', err);

    // TODO: is this still needed now that getTemplate() was removed from protocol?
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
      encodedParameters: rawTemplates.parameters[index],
      endpointId: rawTemplates.endpointIds[index],
      id: templateId,
    };
    return { ...acc, [templateId]: template };
  }, {});

  return [[], templatesById];
}

export async function fetch(
  apiCalls: Request<ApiCall>[],
  fetchOptions: FetchOptions
): Promise<LogsData<ApiCallTemplatesById>> {
  const templateIds = apiCalls.filter((a) => a.templateId).map((a) => a.templateId);
  if (isEmpty(templateIds)) {
    return [[], {}];
  }

  // Requests are made for up to 10 templates at a time
  // eslint-disable-next-line functional/prefer-readonly-type
  const groupedTemplateIds = chunk(uniq(templateIds), CONVENIENCE_BATCH_SIZE) as string[][];

  // Create an instance of the contract that we can re-use
  const airnodeRrp = AirnodeRrpFactory.connect(fetchOptions.airnodeRrpAddress, fetchOptions.provider);

  // Fetch all groups of templates in parallel
  const promises = groupedTemplateIds.map((ids) => fetchTemplateGroup(airnodeRrp, ids));

  const templateResponses = await Promise.all(promises);
  const templateResponseLogs = flatMap(templateResponses, (t) => t[0]);

  // Merge all templates into a single object, keyed by their ID for faster/easier lookup
  const templatesById = templateResponses.reduce((acc, result) => {
    return { ...acc, ...result[1] };
  }, {});

  return [templateResponseLogs, templatesById];
}
