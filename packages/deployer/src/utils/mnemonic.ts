import readline, { Interface } from 'readline';
import shuffle from 'lodash/shuffle';
import * as logger from '../utils/logger';

export async function verifyMnemonic(mnemonic: string) {
  logger.debug('Mnemonic verification');
  const mnemonics = mnemonic.split(' ');
  const shuffledIndexedMnemonics = shuffle(
    mnemonics.map((element, index) => {
      return { mnemonic: element, index: index + 1 };
    })
  ).slice(0, 3);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  logger.info(
    'When you press Enter, the mnemonic below will disappear and you will be asked to provide 3 of the words selected at random.\n'
  );
  await ask(rl, mnemonic);
  clearLine();

  for (const indexedMnemonic of shuffledIndexedMnemonics) {
    let word = await ask(rl, `Enter word #${indexedMnemonic.index}: `);
    clearLine();
    while (word != indexedMnemonic.mnemonic) {
      word = await ask(rl, `Enter word #${indexedMnemonic.index} again, or exit and start over: `);
      clearLine();
    }
  }
  logger.succeed('Mnemonic verified successfully');
  rl.close();
}

function ask(rl: Interface, question: string) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

function clearLine() {
  readline.moveCursor(process.stdout, 0, -1);
  readline.clearLine(process.stdout, 1);
}
