import { buildClientRequest } from './event-logs';
import { ethers } from 'ethers';
import { AirnodeRrpArtifact } from '@airnode/protocol';

describe('constants', () => {
  it('tests event logs', () => {
    const log = buildClientRequest();
    const airnodeRrpInterface = new ethers.utils.Interface(AirnodeRrpArtifact.abi);
    const parsedLog = airnodeRrpInterface.parseLog(log);
    console.log(parsedLog.args);
    expect(parsedLog.args).toMatchInlineSnapshot(`
      Array [
        "0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb",
        "0x676274e2d1979dbdbd0b6915276fcb2cc3fb3be32862eab9d1d201882edc8c93",
        Object {
          "hex": "0x01",
          "type": "BigNumber",
        },
        Object {
          "hex": "0x7a69",
          "type": "BigNumber",
        },
        "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
        "0x41e0458b020642796b14db9bb790bcdebab805ec4b639232277f0e007b088796",
        Object {
          "hex": "0x05",
          "type": "BigNumber",
        },
        "0xD748Bc4212d8130879Ec4F24B950cAAb9EddfCB2",
        "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
        "0x48a4157c",
        "0x316262000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f0000000000000000000000000000000000000000000000000000000000005553440000000000000000000000000000000000000000000000000000000000",
      ]
    `);
  });
});
