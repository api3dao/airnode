export const solidityBaseTypes = ['uint256', 'int256', 'bool', 'bytes32', 'address', 'bytes', 'string'] as const;
export const artificialTypes = ['string32', 'timestamp'] as const;
export const baseResponseTypes = [...solidityBaseTypes, ...artificialTypes] as const;

export const MULTIPLE_PARAMETERS_DELIMETER = ',';
export const PATH_DELIMETER = '.';
export const ESCAPE_CHARACTER = '\\';

export const MAX_ENCODED_RESPONSE_SIZE = 16_384;
