import fs from 'fs';

import * as validator from './validator';
import { extraFieldMessage, formattingMessage, missingParamMessage } from './utils/messages';
import { getPath } from './commands/utils';
import { error, warn } from './utils/logger';
import { Log } from './types';

const messages: Log[] = [];

const endpointsPath = getPath('endpoints.json', messages, '1.0');
const oisPath = getPath('ois.json', messages, '1.0');

let endpointsTemplate: object, oisTemplate: object;

if (endpointsPath) {
  endpointsTemplate = JSON.parse(fs.readFileSync(endpointsPath, 'utf8'));
}

if (oisPath) {
  oisTemplate = JSON.parse(fs.readFileSync(oisPath, 'utf8'));
}

describe('validator templates loaded', () => {
  it('expects no messages', () => {
    expect(messages).toEqual([]);
  });
});

const validAPISpecification = `{
"servers": [
    {
        "url":  "https://myapi.com/api"
    }
],
"paths": {
  "/myPath": {
    "get": {
      "parameters": [
        {
          "name": "myParameter",
          "in": "query"
        },
        {
          "name": "myParameter2",
          "in": "header"
        }
      ]
    }
  },
  "/myPath2": {
    "post": {
      "parameters": [
        {
          "name": "myParameter",
          "in": "query"
        }
      ]
    }
  }
},
"components": {
    "securitySchemes": {
      "mySecurityScheme": {
        "type": "apiKey",
        "name": "X-MY-API-KEY",
        "in": "query"
      }
    }
},
"security": {
      "mySecurityScheme": []
        }
}`;

const invalidAPISpecification = `{
"servers": [
    {
        "url":  "https://myapi.com/api"
    }
],
"paths": {
  "/myPath": {
    "get": {
      "parameters": [
        {
          "name": "myParameter",
          "in": "query"
        },
        {
          "name": "myParameter2",
          "in": "header"
        }
      ]
    }
  },
  "/myPath2": {
    "get": {
      "parameters": [
        {
          "name": "myParameter",
          "in": "query"
        }
      ]
    }
  }
},
"components": {
    "securitySchemes": {
      "mySecurityScheme": {
        "type": "apiKey",
        "name": "X-MY-API-KEY",
        "in": "query"
      }
    }
},
"security": {
      "mySecurityScheme": []
        }
}`;

const validEndpointSpecification = `[
  {
    "name": "test",
    "operation": {
      "path": "/myPath",
      "method": "get"
    },
    "fixedOperationParameters": [
      {
        "operationParameter": {
          "in": "header",
          "name": "myParameter2"
        },
        "value": "myValue"
      }
    ],
    "reservedParameters": [
      {
        "name": "_type",
        "fixed": "int256"
      },
      {
        "name": "_path",
        "fixed": "result"
      },
      {
        "name": "_times",
        "default": "1000000"
      }
    ],
    "parameters": [
      {
        "name": "myParameter",
        "operationParameter": {
          "in": "query",
          "name": "myParameter"
        }
      }
    ]
  },
  {
    "name": "two",
    "operation": {
      "path": "/myPath2",
      "method": "post"
    },
    "fixedOperationParameters": [],
    "reservedParameters": [],
    "parameters": [
      {
        "name": "myParameter",
        "operationParameter": {
          "in": "query",
          "name": "myParameter"
        }
      }
    ]
  }
]`;

const invalidEndpointSpecification = `[
  {
    "name": "test",
    "operation": {
      "path": "/myPath",
      "method": "get"
    },
    "reservedParameters": [],
    "parameters": [
      {
        "name": "myParameter",
        "operationParameter": {
          "in": "query",
          "name": "myParameter"
        }
      }
    ]
  },
  {
    "name": "two",
    "operation": {
      "path": "/notMyPath",
      "method": "post"
    },
    "fixedOperationParameters": [],
    "parameters": [
      {
        "name": "myParameter",
        "operationParameter": {
          "in": "query",
          "name": "myParameter"
        }
      }
    ]
  }
]`;

const validOISSpecification = `{
  "oisFormat": "1.0.0",
  "title": "myOisTitle",
  "version": "1.2.3",
  "apiSpecifications": ${validAPISpecification},
  "endpoints": ${validEndpointSpecification}
}`;

const invalidOISSpecification = `{
  "oisFormat": "1..0",
  "title": "myOisTitle",
  "version": "1.0",
  "apiSpecifications": ${invalidAPISpecification},
  "endpoints": ${invalidEndpointSpecification}
}`;

describe('validator', () => {
  it('endpoints specs', () => {
    const validEndpointSpec = `[
      {
        "name": "test",
        "operation": {
          "path": "/myPath",
          "method": "get"
        },
        "fixedOperationParameters": [],
        "reservedParameters": [],
        "parameters": []
      },
      {
        "name": "two",
        "operation": {
          "path": "/myPath2",
          "method": "post"
        },
        "fixedOperationParameters": [],
        "reservedParameters": [],
        "parameters": [
          {
            "name": "correct",
            "operationParameter": {
              "name": "project_type",
              "in": "header"
            }
          }
        ]
      }
    ]`;
    expect(validator.validateJson(JSON.parse(validEndpointSpec), endpointsTemplate)).toEqual({
      valid: true,
      messages: [],
    });
    expect(
      validator.validateJson(JSON.parse(validEndpointSpec), endpointsTemplate, undefined, undefined, undefined, false)
    ).toEqual({
      valid: true,
      messages: [],
    });

    const invalidEndpointSpec = `[
      {
        "name": "test",
        "operation": {
          "method": "undefined"
        },
        "fixedOperationParameters": [],
        "reservedParameters": [
          {
            "name": "path",
            "fixed": "int256",
            "default": "data.0.price"
          },
          {
            "name": "_path"
          }
        ],
        "parameters": [
          {
            "name": "_incorrect",
            "default": "",
            "description": "",
            "required": "",
            "example": ""
          },
          {
            "name": "_incorrect",
            "operationParameter": {
              "name": "_type",
              "in": "header"
            }
          },
          {
            "name": "correct",
            "operationParameter": {
              "name": "operation",
              "in": "header"
            }
          }
        ]
      },
      {
        "extra": "extra",
        "fixedOperationParameters": [
          {
            "operationParameter": {
              "in": "none"
            },
            "value": "param value"
          }
        ]
      }
    ]`;
    expect(validator.validateJson(JSON.parse(invalidEndpointSpec), endpointsTemplate)).toEqual({
      valid: false,
      messages: [
        missingParamMessage(['[0]', 'operation', 'path']),
        error('[0].operation.method can be either "get" or "post"'),
        error('[0].reservedParameters.[0].name: Reserved parameter can be only "_type", "_path" or "_times"'),
        formattingMessage(['[0]', 'parameters', '[0]', 'name']),
        missingParamMessage(['[0]', 'parameters', '[0]', 'operationParameter']),
        formattingMessage(['[0]', 'parameters', '[1]', 'name']),
        error("[0].parameters.[1].operationParameter.name: Can't have a name of reserved parameter"),
        missingParamMessage(['[1]', 'name']),
        missingParamMessage(['[1]', 'operation']),
        missingParamMessage(['[1]', 'fixedOperationParameters', '[0]', 'operationParameter', 'name']),
        error(
          "Allowed values in [1].fixedOperationParameters.[0].operationParameter.in are: 'path', 'query', 'header' or 'cookie'"
        ),
        missingParamMessage(['[1]', 'reservedParameters']),
        missingParamMessage(['[1]', 'parameters']),
        extraFieldMessage(['[1]', 'extra']),
      ],
    });
    expect(
      validator.validateJson(JSON.parse(invalidEndpointSpec), endpointsTemplate, undefined, undefined, undefined, false)
    ).toEqual({
      valid: true,
      messages: [],
    });
  });

  it('ois specs', () => {
    expect(validator.validateJson(JSON.parse(validOISSpecification), oisTemplate, 'templates/1.0/')).toEqual({
      valid: true,
      messages: [],
    });

    expect(validator.validateJson(JSON.parse(invalidOISSpecification), oisTemplate, 'templates/1.0/')).toEqual({
      valid: false,
      messages: [
        error('oisFormat: OIS format should be 1.0.0'),
        warn('version is not formatted correctly'),
        error('Path "/myPath2" from apiSpecifications.paths./myPath2 must be included in endpoints array'),
        missingParamMessage(['endpoints', '[0]', 'fixedOperationParameters']),
        missingParamMessage(['endpoints', '[1]', 'reservedParameters']),
        missingParamMessage(['endpoints', '[0]', 'fixedOperationParameters']),
        error(
          'Expected "apiSpecifications.paths./notMyPath.post" to exist as path "/notMyPath" with method "post" is defined in endpoints.[1].operation.path'
        ),
        error(
          'Properties of parameter "myParameter" from endpoints.[1].parameters.[0], must match it\'s properties in apiSpecifications.paths'
        ),
      ],
    });
    expect(
      validator.validateJson(
        JSON.parse(invalidOISSpecification),
        oisTemplate,
        'templates/1.0/',
        undefined,
        undefined,
        false
      )
    ).toEqual({
      valid: true,
      messages: [],
    });
  });

  it('interpolation', () => {
    expect(
      validator.validate('exampleSpecs/secrets.config.json', 'templates/0.5/config.json', 'exampleSpecs/secrets.env')
    ).toEqual({ valid: true, messages: [] });
  });
});
