import rawSecurity from '../../../security.json';
import rawSpecs from '../../../specs.json';
import { SecuritySpecification, Specification } from './types';

// Cast the raw JSON files with the defined types
export const specs = rawSpecs as Specification[];
export const security = rawSecurity as SecuritySpecification;
