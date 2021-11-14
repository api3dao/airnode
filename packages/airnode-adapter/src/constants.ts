export const solidityBaseTypes = ['uint256', 'int256', 'bool', 'bytes32', 'address', 'bytes', 'string'] as const;
export const artificialTypes = ['string32'] as const;
export const baseResponseTypes = [...solidityBaseTypes, ...artificialTypes] as const;

export const MULTIPLE_PARAMETERS_DELIMETER = ',';
export const PATH_DELIMETER = '.';
export const ESCAPE_CHARACTER = '\\';
