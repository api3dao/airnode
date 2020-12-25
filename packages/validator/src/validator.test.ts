import * as validator from './validator';
import { validateJson } from './validate';

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

const validSecuritySpecification = `
{
  "id": "abc123",
  "apiCredentials": {
    "myOisTitle": [
      {
        "securitySchemeName": "mySecurityScheme",
        "value": "<TO_BE_FILLED>"
      }
    ]
  }
}
`;

const invalidSecuritySpecification = `
{
  "id": "abc",
  "apiCredentials": {
    "myOisTitle": [
      {
        "securitySchemeName": "mySecurityScheme",
        "value": "<TO_BE_FILLED>"
      }
    ]
  }
}
`;

const validConfigSpecification = `
{
  "id": "abc123",
  "ois": [ ${validOISSpecification} ],
  "triggers": {
    "request": {
      "endpointId": "...",
      "oisTitle": "...",
      "endpointName": "..."
    }
  },
  "nodeSettings": {
    "providerIdShort": "9e5a89d",
    "nodeVersion": "0.1.0",
    "cloudProvider": "aws",
    "region": "us-east-1",
    "stage": "testnet",
    "logFormat": "plain",
    "chains": [
      {
        "providerAdminForRecordCreation": "0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9",
        "id": 1,
        "type": "evm",
        "providers": [
          {
            "name": "infura-mainnet",
            "url": "https://mainnet.infura.io/v3/your_key",
            "blockHistoryLimit": 600,
            "minConfirmations": 6
          }
        ]
      },
      {
        "providerAdminForRecordCreation": "0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9",
        "id": 3,
        "type": "evm",
        "providers": [
          {
            "name": "infura-ropsten",
            "url": "https://ropsten.infura.io/v3/your_key"
          }
        ],
        "contracts": {
          "Airnode": "0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9"
        }
      }
    ]
  }
}
`;

const invalidConfigSpecification = `
{
  "id": "abc123",
  "ois": [ ${invalidOISSpecification}, ${validOISSpecification} ],
  "triggers": {
    "request": {
      "endpointId": "...",
      "oisTitle": "...",
      "endpointName": "..."
    }
  },
  "nodeSettings": {
    "providerIdShort": "9e5a89de",
    "nodeVersion": "0.1.0",
    "cloudProvider": ":aws",
    "region": "us-east-1",
    "stage": "testnet",
    "logFormat": "jsonp",
    "chains": [
      {
        "providerAdminForRecordCreation": "0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c",
        "id": 1,
        "type": "evm",
        "providers": [
          {
            "name": "infura-mainnet",
            "url": "https://mainnet.infura.io/v3/your_key",
            "blockHistoryLimit": 600,
            "minConfirmations": 6
          }
        ]
      },
      {
        "providerAdminForRecordCreation": "0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9",
        "id": 3,
        "type": "evm",
        "providers": [
          {
            "name": "infura-ropsten",
            "url": "https://ropsten.infura.io/v3/your_key"
          }
        ],
        "contracts": {
          "Airnod": "0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9",
          "Convenience": "0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9"
        }
      }
    ]
  }
}
`;

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

    it('formatting of keys and values', () => {
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
        valid: false,
        messages: [
          formattingMessage('servers[0].url'),
          keyFormattingMessage('myPath', 'paths.myPath'),
          keyFormattingMessage('get ', 'paths.myPath.get '),
          formattingMessage('paths.myPath.get .parameters[0].in'),
          keyFormattingMessage('mySecurityScheme ', 'components.securitySchemes.mySecurityScheme '),
          formattingMessage('components.securitySchemes.mySecurityScheme .in'),
          keyFormattingMessage('mySecurityScheme ', 'security.mySecurityScheme '),
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

    it('JSON validity test', () => {
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
          missingParamMessage('components.securitySchemes.mySecurityScheme.in'),
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

    it('conditions (if, then, require) test', () => {
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
          extraFieldMessage('components.securitySchemes.mySecurityScheme3.scheme'),
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
      expect(validator.isApiSpecsValid(invalidPathsAPISpec)).toMatchObject({
        valid: false,
        messages: [
          conditionNotMetMessage('paths./{myParam}', 'myParam'),
          conditionNotMetMessage('paths./{myParam}/myPath/{myParam2}/subPath', 'myParam2'),
          conditionNotMetMessage('paths./{myParam}/myPath/{myParam2}', 'myParam'),
          conditionNotMetMessage('paths./{myParam}/myPath/{myParam2}', 'myParam2'),
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
        extraFieldMessage('[1].extra'),
      ],
    });
  });

  it('ois specs', () => {
    expect(validator.isOisValid(validOISSpecification)).toMatchObject({
      valid: true,
      messages: [],
    });

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
        formattingMessage('endpoints[0].operation.method'),
      ],
    });
  });

  it('config & security specs', () => {
    expect(validator.isConfigSecurityValid(validConfigSpecification, validSecuritySpecification)).toMatchObject({
      valid: true,
      messages: [],
    });

    expect(validator.isConfigSecurityValid(invalidConfigSpecification, invalidSecuritySpecification)).toMatchObject({
      valid: false,
      messages: [
        formattingMessage('config.ois[0].oisFormat'),
        formattingMessage('config.ois[0].version'),
        formattingMessage('config.ois[0].apiSpecifications.servers[0].url'),
        conditionNotMetMessage('config.ois[0].apiSpecifications.paths./myPath/{myParam}', 'myParam'),
        formattingMessage('config.ois[0].apiSpecifications.components.securitySchemes.mySecurityScheme.type', true),
        missingParamMessage('config.ois[0].apiSpecifications.components.securitySchemes.mySecurityScheme2'),
        missingParamMessage('config.ois[0].endpoints[0].operation.path'),
        formattingMessage('config.ois[0].endpoints[0].operation.method'),
        formattingMessage('config.nodeSettings.providerIdShort'),
        formattingMessage('config.nodeSettings.cloudProvider'),
        formattingMessage('config.nodeSettings.logFormat'),
        formattingMessage('config.nodeSettings.chains[0].providerAdminForRecordCreation'),
        keyFormattingMessage('Airnod', 'config.nodeSettings.chains[1].contracts.Airnod'),
        formattingMessage('security.id', true),
      ],
    });
  });

  describe('readme examples', () => {
    it('basic', () => {
      const basicTemplate = `  
    {
      "server": {
        "url": {}
      },
      "component": {
        "securityScheme": {
            "in": {},
            "name": {},
            "type": {}
        }
      }
    }
    `;

      const basicValidInput = `
    {
      "server": {
        "url": "https://just.example.com"
      },
      "component": {
        "securityScheme": {
          "in": "query",
          "name": "example",
          "type": {}
        }
      }
    }
    `;

      const basicInvalidInput = `
    {
      "server": {
        "extra": {}
      },
      "component": {
        "securityScheme": {}
      }
    }
    `;

      expect(validateJson(basicValidInput, basicTemplate)).toMatchObject({ valid: true, messages: [] });
      expect(validateJson(basicInvalidInput, basicTemplate)).toMatchObject({
        valid: false,
        messages: [
          missingParamMessage('server.url'),
          missingParamMessage('component.securityScheme.in'),
          missingParamMessage('component.securityScheme.name'),
          missingParamMessage('component.securityScheme.type'),
          extraFieldMessage('server.extra'),
        ],
      });
    });

    it('regular expressions', () => {
      const regexpTemplate = `
        {
          "__keyRegexp": "^server$",
          "__objectItem": {
            "__regexp": "^(https?|ftp)://[^\\\\s/$.?#].[^\\\\s]*$"
          }
        }
      `;

      const validRegexpInput = `
      {
        "server": "https://www.google.com/"
      }
      `;

      const invalidRegexpInput = `
      {
        "invalid": "google"
      }
      `;

      expect(validateJson(validRegexpInput, regexpTemplate)).toMatchObject({ valid: true, messages: [] });
      expect(validateJson(invalidRegexpInput, regexpTemplate)).toMatchObject({
        valid: false,
        messages: [keyFormattingMessage('invalid', 'invalid'), formattingMessage('invalid')],
      });
    });

    it('arrays and objects', () => {
      const arraysObjectsTemplate = `
    {
      "server": {
        "__maxSize": 1,
        "__arrayItem": {
          "url": {
            "__regexp": "^(https?|ftp)://[^\\\\s/$.?#].[^\\\\s]*$"
          }
        }
      },
      "component": {
        "securitySchemes": {
          "__objectItem": {
            "in": {
              "__regexp": "^(query|header|cookie)$"
            },
            "name": {
              "__regexp": "^[^\\\\s'\\"\\\\\\\\]+$"
            },
            "type": {}
          }
        }
      },
      "security": {
        "__objectItem": {
          "__arrayItem": {}
        }
      }
    }
    `;

      const arraysObjectValidInput = `
      {
        "server": [
          {
            "url": "https://just.example.com"
          }
        ],
        "component": {
          "securitySchemes": {
            "scheme1": {
              "in": "query",
              "name": "example1",
              "type": {}
            },
            "scheme2": {
              "in": "query",
              "name": "example2",
              "type": {}
            }
          }
        },
        "security": {
          "scheme1": [],
          "scheme2": []
        }
      }
    `;

      const arraysObjectInvalidInput = `
      {
        "server": [
          {
            "url": "https://just.example.com"
          },
          {
            "url": "example.com"
          }
        ],
        "component": {
          "securitySchemes": {
            "scheme": {
              "in": "invalid",
              "name": {},
              "type": {}
            }
          }
        },
        "security": {
          "scheme": [
            {
              "extra": "extra"
            }
          ]
        }
      }
    `;

      expect(validateJson(arraysObjectValidInput, arraysObjectsTemplate)).toMatchObject({ valid: true, messages: [] });
      expect(validateJson(arraysObjectInvalidInput, arraysObjectsTemplate)).toMatchObject({
        valid: false,
        messages: [
          sizeExceededMessage('server', 1),
          formattingMessage('server[1].url'),
          formattingMessage('component.securitySchemes.scheme.in'),
          formattingMessage('component.securitySchemes.scheme.name'),
          extraFieldMessage('security.scheme[0].extra'),
        ],
      });
    });

    it('conditions', () => {
      const basicTemplate = `
        {
          "conditionsExample": {
            "value": {},
            "__conditions": [
              {
                "__if": {
                  "value": "^one$"
                },
                "__then": {
                  "one": {
                    "__regexp": "^This is required by one$"
                  }
                }
              },
              {
                "__if": {
                  "value": "^two$"
                },
                "__then": {
                  "two": {
                    "__regexp": "^This is required by two$"
                  }
                }
              }
            ]
          }
        }
      `;

      const validBasicSpec = `
        {
          "conditionsExample": {
            "value": "one",
            "one": "This is required by one"
          }
        }
      `;

      const invalidBasicSpec = `
      {
        "conditionsExample": {
          "value": "two",
          "one": "This is required by two"
        }
      }
      `;

      expect(validateJson(validBasicSpec, basicTemplate)).toMatchObject({ valid: true, messages: [] });
      expect(validateJson(invalidBasicSpec, basicTemplate)).toMatchObject({
        valid: false,
        messages: [missingParamMessage('conditionsExample.two'), extraFieldMessage('conditionsExample.one')],
      });

      const requireTemplate = `
      {
        "items": {
        "__objectItem": {
          "__keyRegexp": "^require[0-9]$",
          "__conditions": [
            {
              "__require": {
                "/outer.__this_name.inner": {}
              }
            }
          ]
        }
        }
      }
      `;

      const validRequireSpec = `
      {
        "items": {
          "require0": {},
          "require5": {}
        },
        "outer": {
          "require0": {
            "inner": {}
          },
          "require5": {
            "inner": {}
          }
        }
      }
      `;

      const invalidRequireSpec = `
      {
        "items": {
            "require0": {},
            "require5": {}
          },
        "outer": {
          "require0": {},
          "require1": {
            "inner": {}
          }
        }
      }
      `;

      expect(validateJson(validRequireSpec, requireTemplate)).toMatchObject({ valid: true, messages: [] });
      expect(validateJson(invalidRequireSpec, requireTemplate)).toMatchObject({
        valid: false,
        messages: [
          missingParamMessage('outer.require0.inner'),
          missingParamMessage('outer.require5.inner'),
          extraFieldMessage('outer.require1'),
        ],
      });

      const ifThenMatchesTemplate = `
      {
        "items": {
          "__objectItem": {
            "__conditions": [
              {
                "__if": {
                  "__this": "^matchedValue$"
                },
                "__rootThen": {
                  "thenItems": {
                    "byValue": {
                      "__regexp": "^__match$"
                    }
                  }
                }
              }
            ]
          },
          "__conditions": [
                  {
                      "__if": {
                          "__this_name": "^matchedKey$"
                      },
                      "__rootThen": {
                          "thenItems": {
                              "byKey": {
                                  "__regexp": "^__match$"
                              }
                          }
                      }
                  }
              ]
        },
        "thenItems": {}
      }
      `;

      const validIfThenMatchesSpec = `
      {
        "items": {
          "item1": "matchedValue",
          "matchedKey": "item2"
        },
        "thenItems": {
              "byValue": "matchedValue",
              "byKey": "matchedKey"
          }
      }
      `;

      const invalidIfThenMatchesSpec = `
      {
        "items": {
          "item1": "matchedValue",
          "matchedKey": "item2"
        },
        "thenItems": {}
      }
      `;

      expect(validateJson(validIfThenMatchesSpec, ifThenMatchesTemplate)).toMatchObject({ valid: true, messages: [] });
      expect(validateJson(invalidIfThenMatchesSpec, ifThenMatchesTemplate)).toMatchObject({
        valid: false,
        messages: [missingParamMessage('thenItems.byValue'), conditionNotMetMessage('items.matchedKey', 'matchedKey')],
      });

      const anyTemplate = `
      {
        "items": {
          "__objectItem": {
            "__keyRegexp": ".*"
          },
          "__conditions": [
            {
              "__if": {
                "__this_name": "^anyExample$"
              },
              "__rootThen": {
                "thenItems": {
                  "__any": {
                    "valid": {}
                  }
                }
              }
            }
          ]
        },
        "thenItems": {
          "item1": {},
          "item2": {},
          "item3": {}
        }
      }
      `;

      const validAnySpec = `
      {
        "items": {
          "anyExample": {}
        },
        "thenItems": {
          "item1": {},
          "item2": {
            "valid": "true"
          },
          "item3": {}
        }
      }
      `;

      const invalidAnySpec = `
        {
          "items": {
            "anyExample": {}
          },
          "thenItems": {
                "item1": {},
                "item2": {},
                "item3": {}
          }
        }
      `;

      expect(validateJson(validAnySpec, anyTemplate)).toMatchObject({ valid: true, messages: [] });
      expect(validateJson(invalidAnySpec, anyTemplate)).toMatchObject({
        valid: false,
        messages: [conditionNotMetMessage('items.anyExample', 'anyExample')],
      });

      const optionalLevelTemplate = `
      {
        "levelExample": {
          "__regexp": "^true$",
          "__level": "error"
        },
          "__optional": {
            "optionalExample": {}
          }
      }
      `;

      const validOptionalLevelSpec = `
      {
        "levelExample": "true"
      }
      `;

      const invalidOptionalLevelSpec = `
      {
        "levelExample": "false",
        "optionalExample": {}
      }
      `;

      expect(validateJson(validOptionalLevelSpec, optionalLevelTemplate)).toMatchObject({ valid: true, messages: [] });
      expect(validateJson(invalidOptionalLevelSpec, optionalLevelTemplate)).toMatchObject({
        valid: false,
        messages: [formattingMessage('levelExample', true)],
      });
    });
  });
});
