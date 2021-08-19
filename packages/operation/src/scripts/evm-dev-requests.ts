import * as requests from '../evm/requests';
import * as io from '../evm/io';
import { FullRequest, TemplateRequest, RequestsState as State, RequestType, Request } from '../types';

type AnyRequest = TemplateRequest | FullRequest | Request;

async function makeRequest(state: State, request: AnyRequest, index: number) {
  switch (request.type as RequestType) {
    case 'template':
      await requests.makeTemplateRequest(state, request as TemplateRequest);
      console.log(`--> Request #${index} made (template)`);
      break;

    case 'full':
      await requests.makeFullRequest(state, request as FullRequest);
      console.log(`--> Request #${index} made (full)`);
      break;

    case 'withdrawal':
      await requests.makeWithdrawal(state, request as Request);
      console.log(`--> Request #${index} made (withdrawal)`);
      break;
  }
}

async function run() {
  console.log('--> Loading configuration...');
  const config = io.loadConfig();

  console.log('--> Loading deployment...');
  const deployment = io.loadDeployment();

  const state1 = requests.buildRequestsState(config, deployment);

  console.log('--> Making requests...');
  for (const [index, request] of state1.config.requests.entries()) {
    await makeRequest(state1, request, index);
  }
  console.log('--> Requests made successfully');

  return state1;
}

run();
