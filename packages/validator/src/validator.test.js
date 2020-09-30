'use strict';

const validator = require('./validator');

function formattingMessage(paramPath, error = false) {
  return { level: error ? 'error' : 'warning', message: `${paramPath} is not formatted correctly` };
}

function keyFormattingMessage(key, paramPath) {
  return { level: 'error', message: `Key ${key} in ${paramPath} is formatted incorrectly` };
}

function sizeExceededMessage(paramPath, maxSize) {
  return { level: 'error', message: `${paramPath} must contain ${maxSize} or less items` };
}

function missingParamMessage(param) {
  return { level: 'error', message: `Missing parameter ${param}` };
}

function extraFieldMessage(param) {
  return { level: 'warning', message: `Extra field: ${param}` };
}

function conditionNotMetMessage(paramPath, param) {
  return { level: 'error', message: `Condition in ${paramPath} is not met with ${param}` };
}

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
        "url":  "https:/myapi.com/api"
    }
],
"paths": {
  "/myPath/{myParam}": {
    "get": {
      "parameters": [
        {
          "name": "myParam0",
          "in": "query"
        }
      ]
    }
  }
},
"components": {
  "securitySchemes": {
    "mySecurityScheme": {
      "type": "invalid",
      "in": "query"
    }
  }
},
"security": {
  "mySecurityScheme": [],
  "mySecurityScheme2": []
}
}`;

const validEndpointSpecification = `[
  {
    "name": "test",
    "operation": {
      "path": "/myPath",
      "method": "get"
    }
  },
  {
    "name": "two",
    "operation": {
      "path": "/myPath2",
      "method": "post"
    }
  }
]`;

const invalidEndpointSpecification = `[
  {
    "name": "test",
    "operation": {
      "method": "undefined"
    },
    "parameters": [
      {
        "name": "correct",
        "operationParameter": {
          "name": "operation",
          "in": "header"
        }
      }
    ]
  }
]`;

describe('validator', () => {
  describe('api specs', () => {
    test('valid specification', () => {
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
      expect(validator.isApiSpecsValid(validAPISpecification1)).toMatchObject({ valid: true, messages: [] });

      const validAPISpecification2 = `{
        "servers": [],
        "paths": {},
        "components": {
            "securitySchemes": {}
        },
        "security": {}
      }`;
      expect(validator.isApiSpecsValid(validAPISpecification2)).toMatchObject({ valid: true, messages: [] });

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
      expect(validator.isApiSpecsValid(validAPISpecification3)).toMatchObject({ valid: true, messages: [] });

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
      expect(validator.isApiSpecsValid(validAPISpecification4)).toMatchObject({ valid: true, messages: [] });
    });

    test('formatting of keys and values', () => {
      const invalidUrlAPISpec = `{
        "servers": [
            {
                "url":  "https:/myapi.com/api"
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
      expect(validator.isApiSpecsValid(invalidUrlAPISpec)).toMatchObject({
        valid: true,
        messages: [formattingMessage('servers[0].url')],
      });

      const invalidFormattingAPISpec = `{
        "servers": [
            {
                "url":  "https://myapi.com/api "
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
      expect(validator.isApiSpecsValid(invalidFormattingAPISpec)).toMatchObject({
        valid: true,
        messages: [
          formattingMessage('servers[0].url'),
          keyFormattingMessage('myPath', 'paths.myPath'),
          keyFormattingMessage('get ', 'paths.myPath.get '),
          formattingMessage('paths.myPath.get .parameters[0].in'),
          keyFormattingMessage('mySecurityScheme ', 'components.securitySchemes.mySecurityScheme '),
          formattingMessage('components.securitySchemes.mySecurityScheme .in'),
          keyFormattingMessage('mySecurityScheme ', 'security.mySecurityScheme ')
        ],
      });
    });

    test('maximal size of array test', () => {
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
                "scheme": "Basic"
              }
            }
        },
        "security": {
          "mySecurityScheme": [],
          "mySecurityScheme2": []
        }
      }`;
      expect(validator.isApiSpecsValid(validArraySizesAPISpec)).toMatchObject({ valid: true, messages: [] });

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
      expect(validator.isApiSpecsValid(exceededArraySizeAPISpec)).toMatchObject({
        valid: false,
        messages: [sizeExceededMessage('servers', 1)],
      });
    });

    test('JSON validity test', () => {
      const smallValidAPISpec = `{
        "servers": [],
        "paths": {},
        "components": {
            "securitySchemes": {}
        },
        "security": {}
      }`;
      expect(validator.isApiSpecsValid(smallValidAPISpec)).toMatchObject({ valid: true, messages: [] });

      const invalidJSONAPISpec = `{
        "servers": [],
        "paths": {},
        "components": {
            "securitySchemes": {}
        },
        "security": {}`;
      expect(validator.isApiSpecsValid(invalidJSONAPISpec)).toMatchObject({
        valid: false,
        messages: [{ level: 'error', message: 'SyntaxError: Unexpected end of JSON input' }],
      });
    });

    test('missing parameters', () => {
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
      expect(validator.isApiSpecsValid(missingParametersAPISpec1)).toMatchObject({
        valid: false,
        messages: [
          missingParamMessage('servers'),
          missingParamMessage('paths./myPath.post.parameters'),
          missingParamMessage('components.securitySchemes.mySecurityScheme.type'),
          missingParamMessage('security.mySecurityScheme'),
          missingParamMessage('components.securitySchemes.mySecurityScheme.in'),
          missingParamMessage('security'),
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
      expect(validator.isApiSpecsValid(missingParametersAPISpec2)).toMatchObject({
        valid: false,
        messages: [
          missingParamMessage('paths./myPath.get.parameters[0].name'),
          missingParamMessage('paths./myPath.get.parameters[0].in'),
          missingParamMessage('paths./myPath2.post.parameters[0].name'),
          missingParamMessage('paths./myPath2.post.parameters[2].in'),
          missingParamMessage('components.securitySchemes.mySecurityScheme.type'),
          missingParamMessage('components.securitySchemes.mySecurityScheme.in')
        ],
      });

      const emptyJSON = `{}`;
      expect(validator.isApiSpecsValid(emptyJSON)).toMatchObject({
        valid: false,
        messages: [
          missingParamMessage('servers'),
          missingParamMessage('paths'),
          missingParamMessage('components'),
          missingParamMessage('security'),
        ],
      });
    });

    test('extra fields', () => {
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
      expect(validator.isApiSpecsValid(extraFieldsAPISpec)).toMatchObject({
        valid: true,
        messages: [
          extraFieldMessage('extra'),
          extraFieldMessage('servers[0].extra'),
          extraFieldMessage('paths./myPath.get.parameters[0].extra'),
          extraFieldMessage('paths./myPath.get.others'),
          extraFieldMessage('components.securitySchemes.mySecurityScheme.extra'),
          extraFieldMessage('components.extra'),
        ],
      });
    });

    test('conditions (if, then, require) test', () => {
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
      expect(validator.isApiSpecsValid(invalidSecuritySchemesAPISpec)).toMatchObject({
        valid: false,
        messages: [
          formattingMessage('components.securitySchemes.mySecurityScheme.type', true),
          missingParamMessage('components.securitySchemes.mySecurityScheme2.name'),
          missingParamMessage('components.securitySchemes.mySecurityScheme3.name'),
          formattingMessage('components.securitySchemes.mySecurityScheme4.scheme', true),
          missingParamMessage('components.securitySchemes.mySecurityScheme5'),
          extraFieldMessage('components.securitySchemes.mySecurityScheme3.scheme')
        ]
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
      expect(validator.isApiSpecsValid(invalidPathsAPISpec)).toMatchObject({
        valid: false, messages: [
          conditionNotMetMessage('paths./{myParam}', 'myParam'),
          conditionNotMetMessage('paths./{myParam}/myPath/{myParam2}/subPath', 'myParam2'),
          conditionNotMetMessage('paths./{myParam}/myPath/{myParam2}', 'myParam'),
          conditionNotMetMessage('paths./{myParam}/myPath/{myParam2}', 'myParam2')
        ]
      });
    });
  });

  test('endpoints specs', () => {
    const validEndpointSpec = `[
      {
        "name": "test",
        "operation": {
          "path": "/myPath",
          "method": "get"
        }
      },
      {
        "name": "two",
        "operation": {
          "path": "/myPath2",
          "method": "post"
        }
      }
    ]`;
    expect(validator.isEndpointsValid(validEndpointSpec)).toMatchObject({
      valid: true,
      messages: []
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
            "example": "",
            "summary": "",
            "externalDocs": ""
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
    expect(validator.isEndpointsValid(invalidEndpointSpec)).toMatchObject({
      valid: false,
      messages: [
        missingParamMessage('[0].operation.path'),
        formattingMessage('[0].operation.method'),
        formattingMessage('[0].reservedParameters[0].name'),
        formattingMessage('[0].parameters[0].name'),
        missingParamMessage('[0].parameters[0].operationParameter'),
        missingParamMessage('[1].name'),
        missingParamMessage('[1].operation'),
        missingParamMessage('[1].fixedOperationParameters[0].operationParameter.name'),
        formattingMessage('[1].fixedOperationParameters[0].operationParameter.in'),
        extraFieldMessage('[1].extra')
      ]
    });
  });

  test('ois specs', () => {
    const validOISSpecification = `{
      "oisFormat": "1.10.0",
      "title": "myOisTitle",
      "version": "1.2.3",
      "apiSpecifications": ${validAPISpecification},
      "endpoints": ${validEndpointSpecification}
    }`;
    expect(validator.isOisValid(validOISSpecification)).toMatchObject({
      valid: true,
      messages: []
    });

    const invalidOISSpecification = `{
      "oisFormat": "1..0",
      "title": "myOisTitle",
      "version": "1.0",
      "apiSpecifications": ${invalidAPISpecification},
      "endpoints": ${invalidEndpointSpecification}
    }`;
    expect(validator.isOisValid(invalidOISSpecification)).toMatchObject({
      valid: false,
      messages: [
        formattingMessage('oisFormat'),
        formattingMessage('version'),
        formattingMessage('apiSpecifications.servers[0].url'),
        conditionNotMetMessage('apiSpecifications.paths./myPath/{myParam}', 'myParam'),
        formattingMessage('apiSpecifications.components.securitySchemes.mySecurityScheme.type', true),
        missingParamMessage('apiSpecifications.components.securitySchemes.mySecurityScheme2'),
        missingParamMessage('endpoints[0].operation.path'),
        formattingMessage('endpoints[0].operation.method')
      ]
    });
  });
});
