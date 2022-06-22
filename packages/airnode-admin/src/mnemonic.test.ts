import { encaseMnemonic } from './mnemonic';

describe('encaseMnemonic', () => {
  it('draws a border for mnemonic of an even length', () => {
    const mnemonic = 'someone define blind kangaroo mountain horse increase race muffin magnet lottery joy';

    expect(mnemonic.length % 2).toEqual(0);
    expect(encaseMnemonic(mnemonic)).toEqual([
      '##################################### MNEMONIC #####################################',
      '                                                                                    ',
      'someone define blind kangaroo mountain horse increase race muffin magnet lottery joy',
      '                                                                                    ',
      '##################################### MNEMONIC #####################################',
    ]);
  });

  it('draws a border for mnemonic of an odd length', () => {
    const mnemonic = 'rigid canyon twist animal pipe volcano insane change point orient silent myth';

    expect(mnemonic.length % 2).not.toEqual(0);
    expect(encaseMnemonic(mnemonic)).toEqual([
      '################################# MNEMONIC ##################################',
      '                                                                             ',
      'rigid canyon twist animal pipe volcano insane change point orient silent myth',
      '                                                                             ',
      '################################# MNEMONIC ##################################',
    ]);
  });
});
