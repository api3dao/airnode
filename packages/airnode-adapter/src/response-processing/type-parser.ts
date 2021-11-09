import { ResponseType, BaseResponseType, baseResponseTypes } from '../types';

// Numeric types should be multiplied by the "_times" reserved parameter
export function isNumericType(type: ResponseType): type is 'uint256' | 'int256' {
  return type === 'int256' || type === 'uint256';
}

export interface ParsedArrayType {
  readonly baseType: BaseResponseType;
  readonly dimensions: number; // -1 for infinite length
}

export function parseArrayType(type: ResponseType): ParsedArrayType | null {
  if (!type.includes('[')) return null;

  const typeMatch = type.match(/^([^\[]+)(.*)$/);
  if (!typeMatch || !baseResponseTypes.includes(typeMatch[1] as any)) return null;
  const baseType = typeMatch[1] as BaseResponseType;

  // eslint-disable-next-line functional/no-let
  let dimensionsString = typeMatch[2];
  // eslint-disable-next-line functional/no-let
  let dimensions = 0;
  // eslint-disable-next-line functional/no-loop-statement
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
