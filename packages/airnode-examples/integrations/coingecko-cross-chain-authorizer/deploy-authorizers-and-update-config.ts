import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { deployContract, runAndHandleErrors, cliPrint, SameOrCrossChain, readIntegrationInfo } from '../../src';

const replacePlaceholdersInConfig = (everythingAuthorizer: string, nothingAuthorizer: string) => {
  const integrationInfo = readIntegrationInfo();
  const configPath = join(__dirname, `../../integrations/`, integrationInfo.integration, `config.json`);
  const rawConfig = readFileSync(configPath).toString();
  writeFileSync(
    configPath,
    rawConfig
      .replace('0xE2E1111111111111111111111111111111111111', `${everythingAuthorizer}`)
      .replace('0xE2E0000000000000000000000000000000000000', `${nothingAuthorizer}`)
  );
};

const main = async () => {
  const everythingAuthorizer = await deployContract(
    `contracts/coingecko-cross-chain-authorizer/EverythingAuthorizer.sol`,
    [],
    SameOrCrossChain.cross
  );
  cliPrint.info(`EverythingAuthorizer deployed to address: ${everythingAuthorizer.address}`);

  const nothingAuthorizer = await deployContract(
    `contracts/coingecko-cross-chain-authorizer/NothingAuthorizer.sol`,
    [],
    SameOrCrossChain.same
  );
  cliPrint.info(`NothingAuthorizer deployed to address: ${nothingAuthorizer.address}`);

  // Replace placeholders in config.json with the above addresses
  replacePlaceholdersInConfig(everythingAuthorizer.address, nothingAuthorizer.address);
};

runAndHandleErrors(main);
