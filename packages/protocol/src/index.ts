import {
  MockAirnodeRrpClient__factory as MockAirnodeRrpClientFactory,
  AirnodeRrp__factory as AirnodeRrpFactory,
} from './contracts';

const AirnodeRrpAddresses: { [chainId: number]: string } = {};
const mocks = {
  MockAirnodeRrpClientFactory,
};
// TODO
const authorizers = {};

export { AirnodeRrpAddresses, AirnodeRrpFactory, mocks, authorizers };
export type { AirnodeRrp, MockAirnodeRrpClient } from './contracts';
