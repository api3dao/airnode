import { readFileSync } from 'fs';
import { join } from 'path';
import { ZodError } from 'zod';
import cloneDeep from 'lodash/cloneDeep';
import {
  oisSchema,
  operationParameterSchema,
  endpointParameterSchema,
  OIS,
  pathNameSchema,
  semverSchema,
  reservedParameterSchema,
} from './ois';

const loadOisFixture = (): OIS =>
  // This OIS is guaranteed to be valid because there is a test for it's validity below
  JSON.parse(readFileSync(join(__dirname, '../../test/fixtures/ois.json')).toString());

it('successfully parses OIS spec', () => {
  const ois = loadOisFixture();
  expect(() => oisSchema.parse(ois)).not.toThrow();
});

it(`doesn't allow extraneous properties`, () => {
  const ois = JSON.parse(readFileSync(join(__dirname, '../../test/fixtures/ois.json')).toString());
  expect(() => oisSchema.parse(ois)).not.toThrow();

  const invalidOis = { ...ois, unknownProp: 'someValue' };
  expect(() => oisSchema.parse(invalidOis)).toThrow(
    new ZodError([
      {
        code: 'unrecognized_keys',
        keys: ['unknownProp'],
        path: [],
        message: `Unrecognized key(s) in object: 'unknownProp'`,
      },
    ])
  );
});

it('handles discriminated union error nicely', () => {
  const ois = loadOisFixture();
  delete (ois.apiSpecifications.components.securitySchemes.coinlayerSecurityScheme as any).name;

  expect(() => oisSchema.parse(ois)).toThrow(
    new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: ['apiSpecifications', 'components', 'securitySchemes', 'coinlayerSecurityScheme', 'name'],
        message: 'Required',
      },
    ])
  );
});

describe('disallows reserved parameter name', () => {
  it('in operation parameters', () => {
    expect(() => operationParameterSchema.parse({ in: 'header', name: '_type' })).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: '"_type" cannot be used because it is a name of a reserved parameter',
          path: ['name'],
        },
      ])
    );
  });

  it('in parameters', () => {
    expect(() =>
      endpointParameterSchema.parse({ name: 'param', operationParameter: { in: 'header', name: '_type' } })
    ).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: '"_type" cannot be used because it is a name of a reserved parameter',
          path: ['operationParameter', 'name'],
        },
      ])
    );
  });
});

describe('parameter uniqueness', () => {
  it('allows parameter with same name, but different location', () => {
    const paramName = 'some-id';
    const ois = loadOisFixture();
    ois.apiSpecifications.paths['/convert'].get!.parameters.push({
      in: 'query',
      name: paramName,
    });
    ois.endpoints[0].fixedOperationParameters.push({
      operationParameter: {
        in: 'query',
        name: paramName,
      },
      value: 'query-id',
    });
    ois.apiSpecifications.paths['/convert'].get!.parameters.push({
      in: 'cookie',
      name: paramName,
    });
    ois.endpoints[0].fixedOperationParameters.push({
      operationParameter: {
        in: 'cookie',
        name: paramName,
      },
      value: 'cookie-id',
    });

    expect(() => oisSchema.parse(ois)).not.toThrow();
  });

  it(`fails if the same parameter is used in "parameters"`, () => {
    const ois = loadOisFixture();
    ois.endpoints[0].parameters.push(ois.endpoints[0].parameters[0] as any);

    expect(() => oisSchema.parse(ois)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: 'Parameter "from" in "query" is used multiple times',
          path: ['ois', 'endpoints', 0, 'parameters', 0],
        },
        {
          code: 'custom',
          message: 'Parameter "from" in "query" is used multiple times',
          path: ['ois', 'endpoints', 0, 'parameters', 3],
        },
      ])
    );
  });

  it(`fails if the same parameter is used in "fixedOperationParameters"`, () => {
    const ois = loadOisFixture();
    ois.endpoints[0].fixedOperationParameters.push(ois.endpoints[0].fixedOperationParameters[0] as any);

    expect(() => oisSchema.parse(ois)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: 'Parameter "to" in "query" is used multiple times',
          path: ['ois', 'endpoints', 0, 'fixedOperationParameters', 0],
        },
        {
          code: 'custom',
          message: 'Parameter "to" in "query" is used multiple times',
          path: ['ois', 'endpoints', 0, 'fixedOperationParameters', 1],
        },
      ])
    );
  });

  it('fails if the same parameter is used in both "fixedOperationParameters" and "parameters"', () => {
    const ois = loadOisFixture();
    ois.endpoints[0].fixedOperationParameters.push({
      operationParameter: ois.endpoints[0].parameters[0].operationParameter,
      value: '123',
    });

    expect(() => oisSchema.parse(ois)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: 'Parameter "from" in "query" is used in both "parameters" and "fixedOperationParameters"',
          path: ['ois', 'endpoints', 0, 'parameters', 0],
        },
        {
          code: 'custom',
          message: 'Parameter "from" in "query" is used in both "parameters" and "fixedOperationParameters"',
          path: ['ois', 'endpoints', 0, 'fixedOperationParameters', 1],
        },
      ])
    );
  });
});

it('verifies parameter interpolation in "apiSpecification.paths"', () => {
  const ois = loadOisFixture();
  ois.apiSpecifications.paths['/someEndpoint/{id1}/{id2}'] = {
    get: {
      parameters: [
        {
          in: 'path',
          name: 'id1',
        },
      ],
    },
    post: {
      parameters: [
        {
          in: 'path',
          name: 'id2',
        },
        {
          in: 'path',
          name: 'id3',
        },
      ],
    },
  };

  expect(() => oisSchema.parse(ois)).toThrow(
    new ZodError([
      {
        code: 'custom',
        message: 'Path parameter "id2" is not found in "parameters"',
        path: ['apiSpecifications', 'paths', '/someEndpoint/{id1}/{id2}', 'get', 'parameters'],
      },
      {
        code: 'custom',
        message: 'Path parameter "id1" is not found in "parameters"',
        path: ['apiSpecifications', 'paths', '/someEndpoint/{id1}/{id2}', 'post', 'parameters'],
      },
      {
        code: 'custom',
        message: 'Parameter "id3" is not found in the URL path',
        path: ['apiSpecifications', 'paths', '/someEndpoint/{id1}/{id2}', 'post', 'parameters', 1],
      },
    ])
  );
});

it('fails if apiSpecifications.security.<securitySchemeName> is not defined in apiSpecifications.components.<securitySchemeName>', () => {
  const invalidSecuritySchemeName = 'INVALID_SECURITY_SCHEME_NAME';
  const ois = loadOisFixture();
  const invalidOis = {
    ...ois,
    ...{
      apiSpecifications: {
        ...ois.apiSpecifications,
        security: { ...ois.apiSpecifications.security, [invalidSecuritySchemeName]: [] },
      },
    },
  };

  expect(() => oisSchema.parse(invalidOis)).toThrow(
    new ZodError([
      {
        code: 'custom',
        message: `Security scheme "${invalidSecuritySchemeName}" is not defined in "components.securitySchemes"`,
        path: ['apiSpecifications', 'security', 1],
      },
    ])
  );
});

describe('apiSpecification parameters validation', () => {
  it('fails if "apiSpecification.paths" parameter is not defined in "endpoints"', () => {
    const invalidOis = loadOisFixture();
    invalidOis.apiSpecifications.paths['/convert'].get!.parameters.push({
      in: 'query',
      name: 'non-existing-parameter',
    });

    expect(() => oisSchema.parse(invalidOis)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: 'Parameter "non-existing-parameter" not found in "fixedOperationParameters" or "parameters"',
          path: ['ois', 'endpoints', 0],
        },
      ])
    );
  });

  it('"endpoint" parameter must reference parameter from "apiSpecification.paths"', () => {
    const invalidOis = loadOisFixture();
    invalidOis.endpoints[0].parameters.push({
      name: 'some-new-param',
      default: 'EUR',
      operationParameter: {
        in: 'query',
        name: 'non-existing-param',
      },
    });

    expect(() => oisSchema.parse(invalidOis)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: 'No matching API specification parameter found in "apiSpecifications" section',
          path: ['ois', 'endpoints', 0, 'parameters', 3],
        },
      ])
    );
  });

  it('handles multiple endpoints for the same API specification', () => {
    const ois = loadOisFixture();
    ois.endpoints.push(cloneDeep(ois.endpoints[0]));
    ois.apiSpecifications.paths['/convert'].get!.parameters.push({
      in: 'query',
      name: 'api-param-name',
    });

    expect(() => oisSchema.parse(ois)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: 'Parameter "api-param-name" not found in "fixedOperationParameters" or "parameters"',
          path: ['ois', 'endpoints', 0],
        },
        {
          code: 'custom',
          message: 'Parameter "api-param-name" not found in "fixedOperationParameters" or "parameters"',
          path: ['ois', 'endpoints', 1],
        },
      ])
    );
  });

  it('fails when there is no matching API specification for endpoint', () => {
    const invalidOis = loadOisFixture();
    invalidOis.endpoints[0].parameters.push({
      operationParameter: {
        in: 'query',
        name: 'non-existent',
      },
      name: 'param-name',
    });

    expect(() => oisSchema.parse(invalidOis)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: 'No matching API specification parameter found in "apiSpecifications" section',
          path: ['ois', 'endpoints', 0, 'parameters', 3],
        },
      ])
    );
  });
});

it('validates path name', () => {
  expect(() => pathNameSchema.parse('my-path')).toThrow(
    new ZodError([
      {
        validation: 'regex',
        code: 'invalid_string',
        message: 'Invalid',
        path: [],
      },
    ])
  );

  expect(() => pathNameSchema.parse('/my path')).toThrow(
    new ZodError([
      {
        validation: 'regex',
        code: 'invalid_string',
        message: 'Invalid',
        path: [],
      },
    ])
  );

  expect(() => pathNameSchema.parse('/my-path')).not.toThrow();

  expect(() => pathNameSchema.parse('/')).not.toThrow();
});

it('validates semantic versioning', () => {
  expect(() => semverSchema.parse('1.0')).toThrow(
    new ZodError([
      {
        code: 'custom',
        message: 'Expected semantic versioning "x.y.z"',
        path: [],
      },
    ])
  );
  expect(() => semverSchema.parse('0.x.y')).toThrow(
    new ZodError([
      {
        code: 'custom',
        message: 'Expected semantic versioning "x.y.z"',
        path: [],
      },
    ])
  );
  expect(() => semverSchema.parse('^0.1.1')).toThrow(
    new ZodError([
      {
        code: 'custom',
        message: 'Expected semantic versioning "x.y.z"',
        path: [],
      },
    ])
  );
  expect(() => semverSchema.parse('0.1.1.2')).toThrow(
    new ZodError([
      {
        code: 'custom',
        message: 'Expected semantic versioning "x.y.z"',
        path: [],
      },
    ])
  );

  expect(() => semverSchema.parse('1.0.0')).not.toThrow();
  expect(() => semverSchema.parse('00.01.02')).not.toThrow();
});

it('validates reserved parameters', () => {
  expect(() =>
    reservedParameterSchema.parse({
      name: '_times',
      default: '123',
      fixed: '123',
    })
  ).toThrow(
    new ZodError([
      {
        code: 'custom',
        message: 'Reserved parameter must use at most one of "default" and "fixed" properties',
        path: [],
      },
    ])
  );

  // Empty parameter is allowed (the user is expected to pass it or it won't be used)
  expect(() =>
    reservedParameterSchema.parse({
      name: '_times',
    })
  ).not.toThrow();
});
