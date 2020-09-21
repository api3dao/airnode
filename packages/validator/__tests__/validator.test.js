'use strict';

const validator = require('..');

const specs1 = `{
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

const specs2 = `{
"servers": [],
"paths": {},
"components": {
    "securitySchemes": {}
},
"security": {}
}`;

const specs3 = `{
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

const specs4 = `{
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

const specs5 = `{
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

const specs6 = `{
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

const specs7 = `{
"servers": [],
"paths": {},
"components": {
    "securitySchemes": {}
},
"security": {}
}`;

const specs8 = `{
"servers": [],
"paths": {},
"components": {
    "securitySchemes": {}
},
"security": {}`;

const specs9 = `{
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

const specs10 = `{
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

const specs11 = `{
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

const specs12 = `{
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

const specs13 = `{}`;

const specs14 = `{
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

const specs15 = `{
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

const specs16 = `{
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

/* ENDPOINTS SPECS */
const specs17 = `[
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

const specs18 = `[
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

/* OIS SPECS */
const specs19 = `{
"oisFormat": "1.10.0",
"title": "myOisTitle",
"version": "1.2.3",
"apiSpecifications": ${specs1},
"endpoints": ${specs17}
}`;

const specs20 = `{
"oisFormat": "1..0",
"title": "myOisTitle",
"version": "1.0",
"apiSpecifications": ${specs15},
"endpoints": ${specs17}
}`;

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

describe('validator', () => {
  describe('api specs', () => {
    test('valid configuration', () => {
      expect(validator.isApiSpecsValid(specs1)).toMatchObject({ valid: true, messages: [] });
      expect(validator.isApiSpecsValid(specs2)).toMatchObject({ valid: true, messages: [] });
    });

    test('invalid formatting', () => {
      expect(validator.isApiSpecsValid(specs3)).toMatchObject({
        valid: true,
        messages: [formattingMessage('servers[0].url')],
      });
      expect(validator.isApiSpecsValid(specs4)).toMatchObject({
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

    test('multiple array items', () => {
      expect(validator.isApiSpecsValid(specs5)).toMatchObject({ valid: true, messages: [] });
      expect(validator.isApiSpecsValid(specs6)).toMatchObject({
        valid: false,
        messages: [sizeExceededMessage('servers', 1)],
      });
    });

    test('edge cases', () => {
      expect(validator.isApiSpecsValid(specs7)).toMatchObject({ valid: true, messages: [] });
      expect(validator.isApiSpecsValid(specs8)).toMatchObject({
        valid: false,
        messages: [{ level: 'error', message: 'SyntaxError: Unexpected end of JSON input' }],
      });
      expect(validator.isApiSpecsValid(specs9)).toMatchObject({ valid: true, messages: [] });
      expect(validator.isApiSpecsValid(specs10)).toMatchObject({ valid: true, messages: [] });
    });

    test('missing parameters', () => {
      expect(validator.isApiSpecsValid(specs11)).toMatchObject({
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
      expect(validator.isApiSpecsValid(specs12)).toMatchObject({
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
      expect(validator.isApiSpecsValid(specs13)).toMatchObject({
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
      expect(validator.isApiSpecsValid(specs14)).toMatchObject({
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

    test('conditional checks', () => {
      expect(validator.isApiSpecsValid(specs15)).toMatchObject({
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
      expect(validator.isApiSpecsValid(specs16)).toMatchObject({
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
    expect(validator.isEndpointsValid(specs17)).toMatchObject({
      valid: true,
      messages: []
    });

    expect(validator.isEndpointsValid(specs18)).toMatchObject({
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
    expect(validator.isOisValid(specs19)).toMatchObject({
      valid: true,
      messages: []
    });

    expect(validator.isOisValid(specs20)).toMatchObject({
      valid: false,
      messages: [
        formattingMessage('oisFormat'),
        formattingMessage('version'),
        formattingMessage('apiSpecifications.components.securitySchemes.mySecurityScheme.type', true),
        missingParamMessage('apiSpecifications.components.securitySchemes.mySecurityScheme2.name'),
        missingParamMessage('apiSpecifications.components.securitySchemes.mySecurityScheme3.name'),
        formattingMessage('apiSpecifications.components.securitySchemes.mySecurityScheme4.scheme', true),
        missingParamMessage('apiSpecifications.components.securitySchemes.mySecurityScheme5'),
        extraFieldMessage('apiSpecifications.components.securitySchemes.mySecurityScheme3.scheme')
      ]
    });
  });
});
