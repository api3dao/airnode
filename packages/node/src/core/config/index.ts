import security from '../../../security.json';
import specs from '../../../specs.json';
import * as types from './types';

type ApiSpec = types.ApiSpecification | types.ApiSpecification[];

export const apiSpecs = specs as ApiSpec;

export { security, specs };
