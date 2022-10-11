import { deployContract, runAndHandleErrors, cliPrint } from '../../src';

const main = async () => {
  const everythingAuthorizer = await deployContract(`contracts/coingecko-e2e/EverythingAuthorizer.sol`, []);
  cliPrint.info(`EverythingAuthorizer deployed to address: ${everythingAuthorizer.address}`);

  const nothingAuthorizer = await deployContract(`contracts/coingecko-e2e/NothingAuthorizer.sol`, []);
  cliPrint.info(`NothingAuthorizer deployed to address: ${nothingAuthorizer.address}`);
};

runAndHandleErrors(main);
