import { ethers } from 'ethers';
import { ApiCallTemplateWithoutId } from '../../types';

interface ValidatedField {
  readonly type: string;
  readonly value: any;
}

function getTemplateIdValidationFieldsV0(template: ApiCallTemplateWithoutId): ValidatedField[] {
  return [
    { type: 'address', value: template.airnodeAddress },
    { type: 'bytes32', value: template.endpointId },
    { type: 'bytes', value: template.encodedParameters },
  ];
}

export function getExpectedTemplateIdV0(template: ApiCallTemplateWithoutId): string {
  const validatedFields = getTemplateIdValidationFieldsV0(template);
  const types = validatedFields.map((v) => v.type);
  const values = validatedFields.map((v) => v.value);
  const {
    utils: { keccak256, solidityPack },
  } = ethers;

  return keccak256(solidityPack(types, values));
}

function getTemplateIdValidationFieldsV1(template: ApiCallTemplateWithoutId): ValidatedField[] {
  return [
    { type: 'bytes32', value: template.endpointId },
    { type: 'bytes', value: template.encodedParameters },
  ];
}

export function getExpectedTemplateIdV1(template: ApiCallTemplateWithoutId): string {
  const validatedFields = getTemplateIdValidationFieldsV1(template);
  const types = validatedFields.map((v) => v.type);
  const values = validatedFields.map((v) => v.value);
  const {
    utils: { keccak256, solidityPack },
  } = ethers;

  return keccak256(solidityPack(types, values));
}
