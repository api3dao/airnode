export const encaseMnemonic = (mnemonic: string) => {
  const mnemonicLength = mnemonic.length;
  const evenLength = mnemonicLength % 2 === 0;
  // 2 x '#' sign + 2 x space from each side is 8 characters
  const boxLength = mnemonicLength + 8;
  const title = ' MNEMONIC ';
  const titlePadding = (boxLength - title.length) / 2;
  // We have to add one `#` character for mnemonics with an odd length
  const titleRow = `${'#'.repeat(titlePadding)}${title}${'#'.repeat(evenLength ? titlePadding : titlePadding + 1)}`;
  // 2x space from each side is 4
  const spaceRow = `##${' '.repeat(mnemonicLength + 4)}##`;
  const mnemonicRow = `##  ${mnemonic}  ##`;

  return [titleRow, spaceRow, mnemonicRow, spaceRow, titleRow];
};
