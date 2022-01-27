import { ParameterType } from './constants';

export type ValueOf<T> = T[keyof T];
export interface DecodedMap {
  readonly [key: string]: string;
}

export interface InputParameter {
  readonly name: string;
  // NOTE: The only possible values are from ParameterType, but typing it like this in TS would require writing many
  // "as const" so it is not worth doing.
  readonly type: string;
  readonly value: unknown;
}

export type ValueTransformation = {
  readonly [key in ParameterType]?: (value: any) => string;
};

export type TypeTransformation = {
  readonly [key in ParameterType]?: ParameterType;
};
