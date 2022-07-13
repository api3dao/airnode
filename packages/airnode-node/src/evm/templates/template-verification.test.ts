import { utils } from 'ethers';
import * as verification from './template-verification';

const validTemplateFields = {
  airnodeAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  endpointId: '0x2f3a3adf6daf5a3bb00ab83aa82262a6a84b59b0a89222386135330a1819ab48',
  encodedParameters: '0x6466726f6d63455448',
};

describe('getExpectedTemplateIdV0', () => {
  it('derives templateId for V0', () => {
    const expectedTemplateIdV0 = verification.getExpectedTemplateIdV0(validTemplateFields);

    expect(expectedTemplateIdV0).toEqual(
      utils.keccak256(
        utils.solidityPack(
          ['address', 'bytes32', 'bytes'],
          [
            '0x5FbDB2315678afecb367f032d93F642f64180aa3',
            '0x2f3a3adf6daf5a3bb00ab83aa82262a6a84b59b0a89222386135330a1819ab48',
            '0x6466726f6d63455448',
          ]
        )
      )
    );
  });

  describe('getExpectedTemplateIdV1', () => {});
  it('derives templateId for V1', () => {
    const expectedTemplateIdV1 = verification.getExpectedTemplateIdV1(validTemplateFields);

    expect(expectedTemplateIdV1).toEqual(
      utils.keccak256(
        utils.solidityPack(
          ['bytes32', 'bytes'],
          ['0x2f3a3adf6daf5a3bb00ab83aa82262a6a84b59b0a89222386135330a1819ab48', '0x6466726f6d63455448']
        )
      )
    );
  });
});
