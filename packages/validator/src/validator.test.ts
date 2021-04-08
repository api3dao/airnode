import * as validator from './validator';
import {
  conditionNotMetMessage,
  extraFieldMessage,
  formattingMessage,
  keyFormattingMessage,
  missingParamMessage,
  requiredConditionNotMetMessage,
  sizeExceededMessage,
} from './utils/messages';

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

const validConfigSpecification = `
{
  "id": "abc123",
  "ois": [ ${validOISSpecification} ],
  "triggers": {
    "request": [
      {
        "endpointId": "0x1Da10cDEc44538E1854791b8e71FA4Ef05b4b238",
        "oisTitle": "...",
        "endpointName": "..."
      }
    ]
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
        "providerAdminForRecordCreation": "0x1Da10cDEc44538E1854791b8e71FA4Ef05b4b238",
        "id": 1,
        "type": "evm",
        "providers": [
          {
            "name": "infura-mainnet",
            "url": "https://mainnet.infura.io/v3/your_key",
            "blockHistoryLimit": 600,
            "minConfirmations": 6
          }
        ],
        "contracts": {
          "Airnode": "0x1Da10cDEc44538E1854791b8e71FA4Ef05b4b238",
          "Convenience": "0x1Da10cDEc44538E1854791b8e71FA4Ef05b4b238"
        }
      },
      {
        "providerAdminForRecordCreation": "0x1Da10cDEc44538E1854791b8e71FA4Ef05b4b238",
        "id": 3,
        "type": "evm",
        "providers": [
          {
            "name": "infura-ropsten",
            "url": "https://ropsten.infura.io/v3/your_key"
          }
        ],
        "contracts": {
          "Airnode": "0x1Da10cDEc44538E1854791b8e71FA4Ef05b4b238",
          "Convenience": "0x1Da10cDEc44538E1854791b8e71FA4Ef05b4b238"
        }
      }
    ]
  }
}
`;

const invalidConfigSpecification = `
{
  "id": "abc123",
  "ois": [ ${invalidOISSpecification} ],
  "triggers": {},
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
        "providerAdminForRecordCreation": "0x1Da10cDEc44538E1854791b8e71FA4Ef05b4b238",
        "id": 3,
        "type": "evm",
        "providers": [
          {
            "name": "infura-ropsten",
            "url": "https://ropsten.infura.io/v3/your_key"
          }
        ],
        "contracts": {
          "Airnod": "0x1Da10cDEc44538E1854791b8e71FA4Ef05b4b238",
          "Convenience": "0x1Da10cDEc44538E1854791b8e71FA4Ef05b4b238"
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
        missingParamMessage('[1].reservedParameters'),
        missingParamMessage('[1].parameters'),
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
        conditionNotMetMessage('apiSpecifications.paths./myPath2', '/myPath2'),
        requiredConditionNotMetMessage('endpoints'),
        requiredConditionNotMetMessage('endpoints'),
        missingParamMessage('endpoints[0].fixedOperationParameters'),
        missingParamMessage('endpoints[1].reservedParameters'),
        missingParamMessage('apiSpecifications.paths./notMyPath'),
        missingParamMessage('apiSpecifications.paths./notMyPath'),
      ],
    });
  });

  it('config & security specs', () => {
    expect(validator.isConfigValid(validConfigSpecification)).toMatchObject({
      valid: true,
      messages: [],
    });

    expect(validator.isConfigValid(invalidConfigSpecification)).toMatchObject({
      valid: false,
      messages: [
        formattingMessage('config.ois[0].oisFormat'),
        formattingMessage('config.ois[0].version'),
        conditionNotMetMessage('config.ois[0].apiSpecifications.paths./myPath2', '/myPath2'),
        requiredConditionNotMetMessage('config.ois[0].endpoints'),
        requiredConditionNotMetMessage('config.ois[0].endpoints'),
        missingParamMessage('config.ois[0].endpoints[0].fixedOperationParameters'),
        missingParamMessage('config.ois[0].endpoints[1].reservedParameters'),
        missingParamMessage('config.ois[0].apiSpecifications.paths./notMyPath'),
        missingParamMessage('config.ois[0].apiSpecifications.paths./notMyPath'),
        formattingMessage('config.nodeSettings.providerIdShort'),
        formattingMessage('config.nodeSettings.cloudProvider'),
        formattingMessage('config.nodeSettings.logFormat'),
        missingParamMessage('config.nodeSettings.chains[0].contracts'),
        formattingMessage('config.nodeSettings.chains[0].providerAdminForRecordCreation'),
        missingParamMessage('config.nodeSettings.chains[1].contracts.Airnode'),
        formattingMessage('security.id', true),
        extraFieldMessage('config.nodeSettings.chains[1].contracts.Airnod'),
      ],
    });
  });
});
