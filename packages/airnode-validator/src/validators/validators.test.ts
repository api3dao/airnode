import fs from 'fs';
import * as validator from '../validator';
import {
  extraFieldMessage,
  formattingMessage,
  keyFormattingMessage,
  missingParamMessage,
  sizeExceededMessage,
} from '../utils/messages';
import { error } from '../utils/logger';
import { getPath } from '../commands/utils';
import { Log } from '../types';

const messages: Log[] = [];
const apiPath = getPath('apiSpecifications.json', messages, '1.0');
let apiTemplate: object;

if (apiPath) {
  apiTemplate = JSON.parse(fs.readFileSync(apiPath, 'utf8'));
}

describe('validators integration test', () => {
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
    expect(validator.validateJson(JSON.parse(validAPISpecification1), apiTemplate)).toEqual({
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
    expect(validator.validateJson(JSON.parse(validAPISpecification2), apiTemplate)).toEqual({
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
    expect(validator.validateJson(JSON.parse(validAPISpecification3), apiTemplate)).toEqual({
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
    expect(validator.validateJson(JSON.parse(validAPISpecification4), apiTemplate)).toEqual({
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
    expect(validator.validateJson(JSON.parse(invalidUrlAPISpec), apiTemplate)).toEqual({
      valid: true,
      messages: [formattingMessage(['servers', '[0]', 'url'])],
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
    expect(validator.validateJson(JSON.parse(invalidFormattingAPISpec), apiTemplate)).toEqual({
      valid: false,
      messages: [
        keyFormattingMessage('myPath', ['paths', 'myPath']),
        error('paths.myPath.get : allowed methods are only "get" or "post" not "get "'),
        error("Allowed values in paths.myPath.get .parameters.[0].in are: 'path', 'query', 'header' or 'cookie'"),
        error('components.securitySchemes.mySecurityScheme .in: Allowed values are "query", "header" or "cookie"'),
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
              "scheme": "basic"
            }
          }
      },
      "security": {
        "mySecurityScheme": [],
        "mySecurityScheme2": []
      }
    }`;
    expect(validator.validateJson(JSON.parse(validArraySizesAPISpec), apiTemplate)).toEqual({
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
    expect(validator.validateJson(JSON.parse(exceededArraySizeAPISpec), apiTemplate)).toEqual({
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
    expect(validator.validateJson(JSON.parse(missingParametersAPISpec1), apiTemplate)).toEqual({
      valid: false,
      messages: [
        missingParamMessage(['servers']),
        missingParamMessage(['paths', '/myPath', 'post', 'parameters']),
        missingParamMessage(['components', 'securitySchemes', 'mySecurityScheme', 'type']),
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
    expect(validator.validateJson(JSON.parse(missingParametersAPISpec2), apiTemplate)).toEqual({
      valid: false,
      messages: [
        missingParamMessage(['paths', '/myPath', 'get', 'parameters', '[0]', 'name']),
        missingParamMessage(['paths', '/myPath', 'get', 'parameters', '[0]', 'in']),
        missingParamMessage(['paths', '/myPath2', 'post', 'parameters', '[0]', 'name']),
        missingParamMessage(['paths', '/myPath2', 'post', 'parameters', '[2]', 'in']),
        missingParamMessage(['components', 'securitySchemes', 'mySecurityScheme', 'type']),
      ],
    });

    const emptyJSON = `{}`;
    expect(validator.validateJson(JSON.parse(emptyJSON), apiTemplate)).toEqual({
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
    expect(validator.validateJson(JSON.parse(extraFieldsAPISpec), apiTemplate)).toEqual({
      valid: true,
      messages: [
        extraFieldMessage(['extra']),
        extraFieldMessage(['servers', '[0]', 'extra']),
        extraFieldMessage(['paths', '/myPath', 'get', 'parameters', '[0]', 'extra']),
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
              "type": "invalid"
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
    expect(validator.validateJson(JSON.parse(invalidSecuritySchemesAPISpec), apiTemplate)).toEqual({
      valid: false,
      messages: [
        error(
          'components.securitySchemes.mySecurityScheme.type: Allowed values are "apiKey", "http", "relayChainId", "relayChainType", "relayRequesterAddress", "relaySponsorAddress", or "relaySponsorWalletAddress"'
        ),
        error(
          'components.securitySchemes.mySecurityScheme2 must contain "name" and "in" since value of "type" is "apiKey"'
        ),
        error(
          'components.securitySchemes.mySecurityScheme3 must contain "name" and "in" since value of "type" is "apiKey"'
        ),
        extraFieldMessage(['components', 'securitySchemes', 'mySecurityScheme3', 'scheme']),
        error('components.securitySchemes.mySecurityScheme3.scheme: Allowed values are "basic" or "bearer"'),
        error('components.securitySchemes.mySecurityScheme4.scheme: Allowed values are "basic" or "bearer"'),
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
    expect(validator.validateJson(JSON.parse(invalidPathsAPISpec), apiTemplate)).toEqual({
      valid: false,
      messages: [
        error(
          "Parameter myParam from paths./myPath/{myParam} must be in parameters of path /myPath/{myParam} and value of 'in' must be 'path'"
        ),
        error(
          "Parameter myParam from paths./{myParam}/{myParam2} must be in parameters of path /{myParam}/{myParam2} and value of 'in' must be 'path'"
        ),
        error(
          "Parameter myParam2 from paths./{myParam}/{myParam2} must be in parameters of path /{myParam}/{myParam2} and value of 'in' must be 'path'"
        ),
        error(
          "Parameter myParam from paths./{myParam} must be in parameters of path /{myParam} and value of 'in' must be 'path'"
        ),
        error(
          "Parameter myParam from paths./{myParam}/myPath/{myParam2}/subPath must be in parameters of path /{myParam}/myPath/{myParam2}/subPath and value of 'in' must be 'path'"
        ),
        error(
          "Parameter myParam2 from paths./{myParam}/myPath/{myParam2}/subPath must be in parameters of path /{myParam}/myPath/{myParam2}/subPath and value of 'in' must be 'path'"
        ),
        error(
          "Parameter myParam from paths./{myParam}/myPath/{myParam2} must be in parameters of path /{myParam}/myPath/{myParam2} and value of 'in' must be 'path'"
        ),
        error(
          "Parameter myParam2 from paths./{myParam}/myPath/{myParam2} must be in parameters of path /{myParam}/myPath/{myParam2} and value of 'in' must be 'path'"
        ),
        error(
          "Parameter myParam from paths./{myParam}/{myParam2}/{myParam3} must be in parameters of path /{myParam}/{myParam2}/{myParam3} and value of 'in' must be 'path'"
        ),
        error(
          "Parameter myParam2 from paths./{myParam}/{myParam2}/{myParam3} must be in parameters of path /{myParam}/{myParam2}/{myParam3} and value of 'in' must be 'path'"
        ),
        error(
          "Parameter myParam3 from paths./{myParam}/{myParam2}/{myParam3} must be in parameters of path /{myParam}/{myParam2}/{myParam3} and value of 'in' must be 'path'"
        ),
      ],
    });
  });
});
