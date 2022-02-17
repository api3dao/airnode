const deployAirnodeSpy = jest.fn();
const removeAirnodeSpy = jest.fn();

jest.mock('@api3/airnode-node', () => ({
  ...jest.requireActual('@api3/airnode-node'),
  version: jest.fn().mockReturnValue('0.2.0'),
}));
jest.mock('../../infrastructure', () => ({
  deployAirnode: deployAirnodeSpy,
  removeAirnode: removeAirnodeSpy,
}));
jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  writeReceiptFile: jest.fn(),
}));

import { join } from 'path';
import { deploy } from '../commands';

describe('deployer commands - invalid node version', () => {
  // TODO: Implement node version check and enable this test. Also write error message to assertion
  it.skip('fails deployment when the node version does not match the config version', async () => {
    await expect(
      deploy(
        join(__dirname, '../../../config/config.example.json'),
        join(__dirname, '../../../config/secrets.example.env'),
        'mocked receipt filename'
      )
    ).rejects.toThrow();
  });
});
