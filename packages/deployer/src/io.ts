import readline from 'readline';

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

function clearLine() {
  readline.moveCursor(process.stdout, 0, -1);
  readline.clearLine(process.stdout, 1);
}

export async function verifyMnemonic(mnemonic) {
  const mnemonics = mnemonic.split(' ');
  const shuffledIndexedMnemonics = shuffleArray(
    mnemonics.map((element, index) => {
      return { mnemonic: element, index: index + 1 };
    })
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(mnemonic);
  await ask(rl, `press return to start mnemonic verification, the mnemonic will disappear!`);
  clearLine();
  clearLine();

  let correct = false;
  while (!correct) {
    correct = true;
    for (const indexedMnemonic of shuffledIndexedMnemonics) {
      const word = await ask(rl, `Enter ${indexedMnemonic.index}-th word:`);
      clearLine();
      if (word != indexedMnemonic.mnemonic) {
        correct = false;
        await ask(rl, `Incorrect ${indexedMnemonic.index}-th word, press return to verification again`);
        break;
      }
    }
  }
  console.log('Mnemonic verification passed');
  rl.close();
}
