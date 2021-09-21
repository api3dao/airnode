import { writeFileSync } from 'fs';
import { ethers } from 'ethers';
import prompts, { PromptObject } from 'prompts';

const questions: PromptObject[] = [
  {
    type: 'text',
    name: 'providerUrl',
    message: 'Specify the provider URL:',
    initial: 'https://ropsten.infura.io/v3/{YOUR_KEY}',
  },
];

const askForProviderUrl = async (): Promise<string> => {
  const response = await prompts(questions);

  return response.providerUrl;
};

async function main() {
  const wallet = ethers.Wallet.createRandom();
  const providerUrl = await askForProviderUrl();
  const airnodeSecrets = `MNEMONIC=${wallet.mnemonic.phrase}\nPROVIDER_URL=${providerUrl}\n`;
  writeFileSync('.env', airnodeSecrets);

  console.log(`We have created '.env' file with the necessary credentials for you.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
