export const template =
  // >> basics-template
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
  // << basics-template
;

export const validSpecs =
  // >> basics-valid-specs
    {
      "component": {
        "securityScheme": {
          "in": "query",
          "name": "example",
          "type": {}
        }
      },
      "server": {
        "url": "https://just.example.com"
      }
    }
  // << basics-valid-specs
;

export const validOut =
  // >> basics-valid-out
    {
      "valid": true,
      "messages": []
    }
  // << basics-valid-out
;

export const invalidSpecs =
  // >> basics-invalid-specs
    {
      "server": {
        "extra": {}
      },
      "component": {}
    }
  // << basics-invalid-specs
;

export const invalidOut =
  // >> basics-invalid-out
    {
      "valid": false,
      "messages": [
        { "level": "error", "message": "Missing parameter server.url" },
        { "level": "error", "message": "Missing parameter component.securityScheme" },
        { "level": "warning", "message": "Extra field: server.extra" }
      ]
    }
  // << basics-invalid-out
;

export const objTemplate =
  // >> basics-obj-template
    {
      "__objectItem": {
        "name": {}
      }
    }
  // << basics-obj-template
;

export const objValidSpecs =
  // >> basics-obj-valid-specs
    {
      "any": {
        "name": "val"
      },
      "key": {
        "name": "val"
      }
    }
  // << basics-obj-valid-specs
;

export const objInvalidSpecs =
  // >> basics-obj-invalid-specs
    {
      "invalid": {
        "value": "val"
      },
      "specification": {}
    }
  // << basics-obj-invalid-specs
;

export const objInvalidOut =
  // >> basics-obj-invalid-out
    {
      "valid": false,
      "messages": [
        { "level": "error", "message": "Missing parameter invalid.name" },
        { "level": "error", "message": "Missing parameter specification.name" },
        { "level": "warning", "message": "Extra field: invalid.value" }
      ]
    }
  // << basics-obj-invalid-out
;

export const arrayTemplate =
  // >> basics-array-template
    {
      "arrayParameter": {
        "__maxSize": 2,
        "__arrayItem": {
          "outer": {
            "inner": {}
          }
        }
      },
      "moreArrays": {
        "__objectItem": {
          "__arrayItem": {
            "value": {}
          }
        }
      }
    }
  // << basics-array-template
;

export const arrayValidSpecs =
  // >> basics-array-valid-specs
    {
      "arrayParameter": [
        {
          "outer": {
            "inner": "value1"
          }
        },
        {
          "outer": {
            "inner": "value2"
          }
        }
      ],
      "moreArrays": {
        "array1": [
          {
            "value": "value"
          }
        ],
        "array2": []
      }
    }
  // << basics-array-valid-specs
;

export const arrayInvalidSpecs =
  // >> basics-array-invalid-specs
    {
      "arrayParameter": [
        {
          "outer": {
            "inner": "value1"
          }
        },
        {
          "outer": {
            "inner": "value2"
          }
        },
        {
          "outer": {}
        }
      ],
      "moreArrays": {
        "array1": [
          {
            "invalid": "value"
          }
        ]
      }
    }
  // << basics-array-invalid-specs
;

export const arrayInvalidOut =
  // >> basics-array-invalid-out
    {
      "valid": false,
      "messages": [
        { "level": "error", "message": "arrayParameter must contain 2 or less items" },
        { "level": "error", "message": "Missing parameter arrayParameter[2].outer.inner" },
        { "level": "error", "message": "Missing parameter moreArrays.array1[0].value" },
        { "level": "warning", "message": "Extra field: moreArrays.array1[0].invalid" }
      ]
    }
  // << basics-array-invalid-out
;