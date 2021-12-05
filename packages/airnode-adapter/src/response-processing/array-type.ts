import { baseResponseTypes } from '../constants';
import { ResponseType, BaseResponseType } from '../types';

// Numeric types could be multiplied by the "_times" reserved parameter
export function isNumericType(type: ResponseType): type is 'uint256' | 'int256' {
  return type === 'int256' || type === 'uint256';
}

export interface ParsedArrayType {
  readonly baseType: BaseResponseType;
  readonly dimensions: number;
}

export function parseArrayType(type: ResponseType): ParsedArrayType | null {
  if (!type.includes('[')) return null;

  const typeMatch = type.match(/^([^\[]+)(.*)$/);
  if (!typeMatch || !baseResponseTypes.includes(typeMatch[1] as any)) return null;
  const baseType = typeMatch[1] as BaseResponseType;

  let dimensionsString = typeMatch[2];
  let dimensions = 0;
  while (dimensionsString) {
    const match = dimensionsString.match(/^\[(\d*)\](.*)$/);
    if (!match) return null;

    if (match[1]) {
      const parsedLength = Number.parseInt(match[1], 10);
      if (parsedLength === 0) return null;
    }

    dimensions++;
    dimensionsString = match[2];
  }

  return { baseType, dimensions };
}

export function applyToArrayRecursively<T>(
  value: unknown,
  type: ParsedArrayType,
  predicate: (value: any, type: ResponseType) => T
): unknown {
  if (type.dimensions === 0) return predicate(value, type.baseType);

  if (!Array.isArray(value)) {
    throw new Error(`Expected ${value} to be an array`);
  }

  const typeWithReducedDimension: ParsedArrayType = { ...type, dimensions: type.dimensions - 1 };
  return value.map((element) => applyToArrayRecursively(element, typeWithReducedDimension, predicate));
}
