import { parseArrayType } from './type-parser';

describe('Type parsing', () => {
  it('parses array type correctly', () => {
    expect(parseArrayType('uint256[]')).toEqual({ arrayDimensions: [-1], baseType: 'uint256' });
    expect(parseArrayType('uint256[3][][5]')).toEqual({ arrayDimensions: [3, -1, 5], baseType: 'uint256' });

    // The dimensions number must be positive
    expect(parseArrayType('uint256[-1]')).toEqual(null);
    expect(parseArrayType('uint256[0]')).toEqual(null);

    expect(parseArrayType('unit256[]')).toEqual(null);
    expect(parseArrayType('uint256')).toEqual(null);
  });
});
