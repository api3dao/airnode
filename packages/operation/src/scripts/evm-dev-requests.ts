import * as requests from '../evm/requests';
import * as io from '../evm/io';
import { FullRequest, RegularRequest, RequestsState as State, RequestType, Withdrawal } from '../types';

type AnyRequest = RegularRequest | FullRequest | Withdrawal;

async function makeRequest(state: State, request: AnyRequest, index: number) {
  switch (request.type as RequestType) {
    case 'regular':
      await requests.makeRegularRequest(state, request as RegularRequest);
      console.log(`--> Request #${index} made (regular)`);
      break;

    case 'full':
      await requests.makeFullRequest(state, request as FullRequest);
      console.log(`--> Request #${index} made (full)`);
      break;

    case 'withdrawal':
      await requests.makeWithdrawal(state, request as Withdrawal);
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
