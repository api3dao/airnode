import { parseArrayType, applyToArrayRecursively } from './array-type';

it('parses array type correctly', () => {
  expect(parseArrayType('uint256[]')).toEqual({ dimensions: 1, baseType: 'uint256' });
  expect(parseArrayType('uint256[3][][5]')).toEqual({ dimensions: 3, baseType: 'uint256' });

  // The dimensions number must be positive
  expect(parseArrayType('uint256[-1]')).toEqual(null);
  expect(parseArrayType('uint256[0]')).toEqual(null);

  expect(parseArrayType('unit256[]')).toEqual(null);
  expect(parseArrayType('uint256')).toEqual(null);
});

it('applyToArrayRecursively works', () => {
  expect(
    applyToArrayRecursively([1, 2, 3, 4, 5], { baseType: 'int256', dimensions: 1 }, (value) => (value as number) % 2)
  ).toEqual([1, 0, 1, 0, 1]);
});
