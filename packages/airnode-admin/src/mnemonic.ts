export const encaseMnemonic = (mnemonic: string) => {
  const mnemonicLength = mnemonic.length;
  const evenLength = mnemonicLength % 2 === 0;
  const title = ' MNEMONIC ';
  const titlePadding = (mnemonicLength - title.length) / 2;
  // We have to add one `#` character for mnemonics with an odd length
  const titleRow = `${'#'.repeat(titlePadding)}${title}${'#'.repeat(evenLength ? titlePadding : titlePadding + 1)}`;
  const spaceRow = ' '.repeat(titleRow.length);

  return [titleRow, spaceRow, mnemonic, spaceRow, titleRow];
};
