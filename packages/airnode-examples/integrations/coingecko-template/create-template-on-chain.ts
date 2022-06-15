import { TemplateFile, createTemplate, useAirnodeRrp } from '@api3/airnode-admin';
import { getDeployedContract, runAndHandleErrors } from '../../src';

const main = async () => {
  // NOTE: Matches the template defined in "create-config.ts"
  const template: TemplateFile = {
    airnode: '0x88365f828b8e1eAD1f00c0D3f9ac0512519E809a',
    endpointId: '0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4',
    parameters: [{ name: 'coinId', type: 'string32', value: 'ethereum' }],
  };

  const airnodeRrp = await getDeployedContract('@api3/airnode-protocol/contracts/rrp/AirnodeRrpV0.sol');
  return createTemplate(useAirnodeRrp(airnodeRrp), template);
};

runAndHandleErrors(main);
