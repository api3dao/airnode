import * as validator from './validator';
import {
  extraFieldMessage,
  formattingMessage,
  keyFormattingMessage,
  missingParamMessage,
  sizeExceededMessage,
} from './utils/messages';
import fs from 'fs';
import { getPath } from './commands/utils';
import { error } from './utils/logger';
import { Log } from './types';

const messages: Log[] = [];

const apiTemplate = JSON.parse(fs.readFileSync(getPath('apiSpecifications.json', messages), 'utf8'));
const endpointsTemplate = JSON.parse(fs.readFileSync(getPath('endpoints.json', messages), 'utf8'));
const oisTemplate = JSON.parse(fs.readFileSync(getPath('ois.json', messages), 'utf8'));

describe('validator templates loaded', () => {
  expect(messages).toStrictEqual([]);
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
  "oisFormat": "1.10.0",
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
  describe('api specs', () => {
    it('valid specification', () => {
      const validAPISpecification1 = `{
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
      expect(validator.validateJson(JSON.parse(validAPISpecification1), apiTemplate)).toMatchObject({
        valid: true,
        messages: [],
      });

      const validAPISpecification2 = `{
        "servers": [],
        "paths": {},
        "components": {
            "securitySchemes": {}
        },
        "security": {}
      }`;
      expect(validator.validateJson(JSON.parse(validAPISpecification2), apiTemplate)).toMatchObject({
        valid: true,
        messages: [],
      });

      const validAPISpecification3 = `{
        "servers": [],
        "paths": {
            "/myPath": {
              "post": {
                "parameters": []
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
      expect(validator.validateJson(JSON.parse(validAPISpecification3), apiTemplate)).toMatchObject({
        valid: true,
        messages: [],
      });

      const validAPISpecification4 = `{
        "servers": [],
        "paths": {
            "/myPath": {}
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
      expect(validator.validateJson(JSON.parse(validAPISpecification4), apiTemplate)).toMatchObject({
        valid: true,
        messages: [],
      });
    });

    it('formatting of keys and values', () => {
      const invalidUrlAPISpec = `{
        "servers": [
            {
                "url": "ftp:/#test"
            }
        ],
        "paths": {
            "/myPath": {
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
      expect(validator.validateJson(JSON.parse(invalidUrlAPISpec), apiTemplate)).toMatchObject({
        valid: true,
        messages: [formattingMessage(['servers[0]', 'url'])],
      });

      const invalidFormattingAPISpec = `{
        "servers": [
            {
                "url":  "https://myapi.com/api"
            }
        ],
        "paths": {
            "myPath": {
              "get ": {
                "parameters": [
                  {
                    "name": "myParameter",
                    "in": "query "
                  }
                ]
              }
            }   
        },
        "components": {
            "securitySchemes": {
              "mySecurityScheme ": {
                "type": "apiKey",
                "name": "X-MY-API-KEY",
                "in": "Query"
              }
            }
        },
        "security": {
          "mySecurityScheme ": []
        }
      }`;
      expect(validator.validateJson(JSON.parse(invalidFormattingAPISpec), apiTemplate)).toMatchObject({
        valid: false,
        messages: [
          keyFormattingMessage('myPath', ['paths', 'myPath']),
          error('paths.myPath.get : allowed methods are only "get" or "post" not "get "'),
          error("Allowed values in paths.myPath.get .parameters[0].in are: 'path', 'query', 'header' or 'cookie'"),
          keyFormattingMessage('mySecurityScheme ', ['components', 'securitySchemes', 'mySecurityScheme ']),
          error('components.securitySchemes.mySecurityScheme .in: Allowed values are "query", "header" or "cookie"'),
          keyFormattingMessage('mySecurityScheme ', ['security', 'mySecurityScheme ']),
        ],
      });
    });

    it('maximal size of array test', () => {
      const validArraySizesAPISpec = `{
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
                    "in": "path"
                  },
                  {
                    "name": "myParameter",
                    "in": "query"
                  },
                  {
                    "name": "myParameter",
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
                    "in": "path"
                  },
                  {
                    "name": "myParameter",
                    "in": "query"
                  },
                  {
                    "name": "myParameter",
                    "in": "header"
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
              },
              "mySecurityScheme2": {
                "type": "http",
                "in": "header",
                "scheme": "basic"
              }
            }
        },
        "security": {
          "mySecurityScheme": [],
          "mySecurityScheme2": []
        }
      }`;
      expect(validator.validateJson(JSON.parse(validArraySizesAPISpec), apiTemplate)).toMatchObject({
        valid: true,
        messages: [],
      });

      const exceededArraySizeAPISpec = `{
        "servers": [
            {
                "url":  "https://myapi.com/api"
            },
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
                    "in": "path"
                  },
                  {
                    "name": "myParameter",
                    "in": "query"
                  },
                  {
                    "name": "myParameter",
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
                    "in": "path"
                  },
                  {
                    "name": "myParameter",
                    "in": "query"
                  },
                  {
                    "name": "myParameter",
                    "in": "header"
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
              },
              "mySecurityScheme2": {
                "type": "apiKey",
                "name": "X-MY-API-KEY",
                "in": "header"
              }
            }
        },
        "security": {
              "mySecurityScheme": [],
              "mySecurityScheme2": []
          }
      }`;
      expect(validator.validateJson(JSON.parse(exceededArraySizeAPISpec), apiTemplate)).toMatchObject({
        valid: false,
        messages: [sizeExceededMessage(['servers'], 1)],
      });
    });

    it('missing parameters', () => {
      const missingParametersAPISpec1 = `{
        "paths": {
            "/myPath": {
                "post": {}
            }
        },
        "components": {
            "securitySchemes": {
                "mySecurityScheme": {
                  }
            }
        }
      }`;
      expect(validator.validateJson(JSON.parse(missingParametersAPISpec1), apiTemplate)).toMatchObject({
        valid: false,
        messages: [
          missingParamMessage(['servers']),
          missingParamMessage(['paths', '/myPath', 'post', 'parameters']),
          error(
            'Expected security scheme "mySecurityScheme" from components.securitySchemes.mySecurityScheme to be present in security'
          ),
          missingParamMessage(['components', 'securitySchemes', 'mySecurityScheme', 'type']),
          missingParamMessage(['components', 'securitySchemes', 'mySecurityScheme', 'in']),
          missingParamMessage(['security']),
        ],
      });

      const missingParametersAPISpec2 = `{
        "servers": [
            {
                "url":  "https://myapi.com/api"
            }
        ],
        "paths": {
            "/myPath": {
              "get": {
                "parameters": [
                  {}
                ]
              }
            },
            "/myPath2": {
              "post": {
                "parameters": [
                  {
                    "in": "query"
                  },
                  {
                    "name": "myParameter",
                    "in": "query"
                  },
                  {
                    "name": "myParameter"
                  }
                ]
              }
            }   
        },
        "components": {
            "securitySchemes": {
              "mySecurityScheme": {},
              "mySecurityScheme2": {
                "type": "apiKey",
                "name": "X-MY-API-KEY",
                "in": "header"
              }
            }
        },
        "security": {
              "mySecurityScheme": [],
              "mySecurityScheme2": []
          }
      }`;
      expect(validator.validateJson(JSON.parse(missingParametersAPISpec2), apiTemplate)).toMatchObject({
        valid: false,
        messages: [
          missingParamMessage(['paths', '/myPath', 'get', 'parameters[0]', 'name']),
          missingParamMessage(['paths', '/myPath', 'get', 'parameters[0]', 'in']),
          missingParamMessage(['paths', '/myPath2', 'post', 'parameters[0]', 'name']),
          missingParamMessage(['paths', '/myPath2', 'post', 'parameters[2]', 'in']),
          missingParamMessage(['components', 'securitySchemes', 'mySecurityScheme', 'type']),
          missingParamMessage(['components', 'securitySchemes', 'mySecurityScheme', 'in']),
        ],
      });

      const emptyJSON = `{}`;
      expect(validator.validateJson(JSON.parse(emptyJSON), apiTemplate)).toMatchObject({
        valid: false,
        messages: [
          missingParamMessage(['servers']),
          missingParamMessage(['paths']),
          missingParamMessage(['components']),
          missingParamMessage(['security']),
        ],
      });
    });

    it('extra fields', () => {
      const extraFieldsAPISpec = `{
        "extra": {
            "inside": "extra"
        },
        "servers": [
            {
                "url":  "https://myapi.com/api",
                "extra": "field"
            }
        ],
        "paths": {
            "/myPath": {
              "get": {
                "parameters": [
                  {
                    "name": "myParameter",
                    "in": "query",
                    "extra": "field"
                  }
                ],
                "others": [
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
                "in": "query",
                "extra": "field"
              }
            },
            "extra": {}
        },
        "security": {
          "mySecurityScheme": []
            }
      }`;
      expect(validator.validateJson(JSON.parse(extraFieldsAPISpec), apiTemplate)).toMatchObject({
        valid: true,
        messages: [
          extraFieldMessage(['extra']),
          extraFieldMessage(['servers[0]', 'extra']),
          extraFieldMessage(['paths', '/myPath', 'get', 'parameters[0]', 'extra']),
          extraFieldMessage(['paths', '/myPath', 'get', 'others']),
          extraFieldMessage(['components', 'securitySchemes', 'mySecurityScheme', 'extra']),
          extraFieldMessage(['components', 'extra']),
        ],
      });
    });

    it('conditions test', () => {
      const invalidSecuritySchemesAPISpec = `{
        "servers": [
            {
                "url":  "https://myapi.com/api"
            }
        ],
        "paths": {},
        "components": {
            "securitySchemes": {
              "mySecurityScheme": {
                "type": "invalid",
                "in": "query"
              },
              "mySecurityScheme2": {
                "type": "apiKey",
                "in": "query"
              },
              "mySecurityScheme3": {
                "type": "apiKey",
                "in": "query",
                "scheme": "invalid"
              },
              "mySecurityScheme4": {
                "type": "http",
                "in": "query",
                "scheme": "invalid"
              }
            }
        },
        "security": {
          "mySecurityScheme": [],
          "mySecurityScheme2": [],
          "mySecurityScheme3": [],
          "mySecurityScheme4": [],
          "mySecurityScheme5": []
        }
      }`;
      expect(validator.validateJson(JSON.parse(invalidSecuritySchemesAPISpec), apiTemplate)).toMatchObject({
        valid: false,
        messages: [
          error('components.securitySchemes.mySecurityScheme.type: Allowed values are "apiKey" or "http"'),
          error(
            'components.securitySchemes.mySecurityScheme2.type must contain "name" since value of "type" is "apiKey"'
          ),
          error(
            'components.securitySchemes.mySecurityScheme3.type must contain "name" since value of "type" is "apiKey"'
          ),
          extraFieldMessage(['components', 'securitySchemes', 'mySecurityScheme3', 'scheme']),
          formattingMessage(['components', 'securitySchemes', 'mySecurityScheme3', 'scheme'], true),
          formattingMessage(['components', 'securitySchemes', 'mySecurityScheme4', 'scheme'], true),
          error(
            'Expected security scheme "mySecurityScheme5" from security.mySecurityScheme5 to be present in components.securitySchemes'
          ),
        ],
      });

      const invalidPathsAPISpec = `{
        "servers": [
            {
                "url":  "https://myapi.com/api"
            }
        ],
        "paths": {
          "/myPath/{myParam}": {
              "get": {
                "parameters": [
                  {
                    "name": "myParam",
                    "in": "query"
                  }
                ]
              }
            },
            "/{myParam}/{myParam2}": {
              "get": {
                "parameters": [
                  {
                    "name": "myParam",
                    "in": "query"
                  },
                  {
                    "name": "myParam2",
                    "in": "query"
                  }
                ]
              }
            },
            "/{myParam}": {
              "get": {
                "parameters": []
              }
            },
            "/{myParam}/myPath/{myParam2}/subPath": {
              "get": {
                "parameters": [
                  {
                    "name": "myParam",
                    "in": "query"
                  },
                  {
                    "name": "myParam3",
                    "in": "query"
                  }
                ]
              }
            },
            "/{myParam}/myPath/{myParam2}": {
              "get": {
                "parameters": [
                  {
                    "name": "myParam3",
                    "in": "query"
                  }
                ]
              }
            },
            "/{myParam}/{myParam2}/{myParam3}": {
              "get": {
                "parameters": [
                  {
                    "name": "myParam3",
                    "in": "query"
                  },
                  {
                    "name": "myParam",
                    "in": "query"
                  },
                  {
                    "name": "myParam2",
                    "in": "query"
                  }
                ]
              }
            }
        },
        "components": {
            "securitySchemes": {}
        },
        "security": {}
      }`;
      expect(validator.validateJson(JSON.parse(invalidPathsAPISpec), apiTemplate)).toMatchObject({
        valid: false,
        messages: [
          error('Parameter myParam from paths./{myParam} must be in parameters of path /{myParam}'),
          error(
            'Parameter myParam2 from paths./{myParam}/myPath/{myParam2}/subPath must be in parameters of path /{myParam}/myPath/{myParam2}/subPath'
          ),
          error(
            'Parameter myParam from paths./{myParam}/myPath/{myParam2} must be in parameters of path /{myParam}/myPath/{myParam2}'
          ),
          error(
            'Parameter myParam2 from paths./{myParam}/myPath/{myParam2} must be in parameters of path /{myParam}/myPath/{myParam2}'
          ),
        ],
      });
    });
  });

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
        "parameters": []
      }
    ]`;
    expect(validator.validateJson(JSON.parse(validEndpointSpec), endpointsTemplate)).toMatchObject({
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
    expect(validator.validateJson(JSON.parse(invalidEndpointSpec), endpointsTemplate)).toMatchObject({
      valid: false,
      messages: [
        missingParamMessage(['[0]', 'operation', 'path']),
        error('[0].operation.method can be either "get" or "post"'),
        error('[0].reservedParameters[0].name: Reserved parameter can be only "_type", "_path" or "_times"'),
        formattingMessage(['[0]', 'parameters[0]', 'name']),
        missingParamMessage(['[0]', 'parameters[0]', 'operationParameter']),
        missingParamMessage(['[1]', 'name']),
        missingParamMessage(['[1]', 'operation']),
        missingParamMessage(['[1]', 'fixedOperationParameters[0]', 'operationParameter', 'name']),
        error(
          "Allowed values in [1].fixedOperationParameters[0].operationParameter.in are: 'path', 'query', 'header' or 'cookie'"
        ),
        missingParamMessage(['[1]', 'reservedParameters']),
        missingParamMessage(['[1]', 'parameters']),
        extraFieldMessage(['[1]', 'extra']),
      ],
    });
  });

  it('ois specs', () => {
    expect(validator.validateJson(JSON.parse(validOISSpecification), oisTemplate, 'templates/1.0.0/')).toMatchObject({
      valid: true,
      messages: [],
    });

    expect(validator.validateJson(JSON.parse(invalidOISSpecification), oisTemplate, 'templates/1.0.0/')).toMatchObject({
      valid: false,
      messages: [
        formattingMessage(['oisFormat']),
        formattingMessage(['version']),
        error('Path "/myPath2" from apiSpecifications.paths./myPath2 must be included in endpoints array'),
        error('Parameter "myParameter2" from "apiSpecifications.paths./myPath.get" must be included in "endpoints"'),
        error('Parameter "myParameter" from "apiSpecifications.paths./myPath2.get" must be included in "endpoints"'),
        missingParamMessage(['endpoints', '[0]', 'fixedOperationParameters']),
        missingParamMessage(['endpoints', '[1]', 'reservedParameters']),
        missingParamMessage(['endpoints[0]', 'fixedOperationParameters']),
        error(
          'Expected "apiSpecifications.paths./notMyPath.post" to exist as path "/notMyPath" with method "post" is defined in endpoints[1].operation.path'
        ),
        error(
          'Properties of parameter "myParameter" from endpoints[1].parameters[0], must match it\'s properties in apiSpecifications.paths'
        ),
      ],
    });
  });
});
