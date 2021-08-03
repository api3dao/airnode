export const basicTemplate =
  // >> conditions-basic-template
    {
      "numbers": {
        "__arrayItem": {
          "value": {},
          "description": {},
          "__conditions": [
            {
              "__if": {
                "value": "^one$"
              },
              "__then": {
                "description": {
                  "__regexp": "^This is required by one$",
                  "__catch": {
                    "__level": "error"
                  }
                }
              }
            },
            {
              "__if": {
                "value": "^two$"
              },
              "__then": {
                "description": {
                  "__regexp": "^This is required by two$",
                  "__catch": {
                    "__level": "error"
                  }
                }
              }
            }
          ]
        }
      }
    }
  // << conditions-basic-template
;

export const basicValidSpecs =
  // >> conditions-basic-valid-specs
    {
      "numbers": [
        {
          "value": "one",
          "description": "This is required by one"
        },
        {
          "value": "two",
          "description": "This is required by two"
        },
        {
          "value": "three",
          "description": "No requirement for three"
        }
      ]
    }
  // << conditions-basic-valid-specs
;

export const basicInvalidSpecs =
  // >> conditions-basic-invalid-specs
    {
      "numbers": [
        {
          "value": "one",
          "description": "No requirement for one"
        },
        {
          "value": "two",
          "description": "This is required by one"
        }
      ]
    }
  // << conditions-basic-invalid-specs
;

export const basicInvalidOut =
  // >> conditions-basic-invalid-out
    {
      "valid": false,
      "messages": [
        { "level": "error", "message": "Condition in numbers[0].value is not met with value" },
        { "level": "error", "message": "Condition in numbers[1].value is not met with value" }
      ]
    }
  // << conditions-basic-invalid-out
;

export const matchTemplate =
  // >> conditions-match-template
    {
      "numbers": {
        "__arrayItem": {
          "value": {},
          "description": {
            "__objectItem": {}
          },
          "__conditions": [
            {
              "__if": {
                "value": ".*"
              },
              "__then": {
                "description": {
                  "__match": {
                    "__regexp": "^This is required by __match$",
                    "__catch": {
                      "__level": "error"
                    }
                  }
                }
              }
            }
          ]
        }
      }
    }
  // << conditions-match-template
;

export const matchValidSpecs =
  // >> conditions-match-valid-specs
    {
      "numbers": [
        {
          "value": "one",
          "description": {
            "one": "This is required by one"
          }
        },
        {
          "value": "two",
          "description": {
            "two": "This is required by two"
          }
        }
      ]
    }
  // << conditions-match-valid-specs
;

export const matchInvalidSpecs =
  // >> conditions-match-invalid-specs
    {
      "numbers": [
        {
          "value": "one",
          "description": {
            "one": "This is required by two"
          }
        },
        {
          "value": "two",
          "description": {
            "two": "This is required by three"
          }
        }
      ]
    }
  // << conditions-match-invalid-specs
;

export const matchInvalidOut =
  // >> conditions-match-invalid-out
    {
      "valid": false,
      "messages": [
        { "level": "error", "message": "Condition in numbers[0].value is not met with value" },
        { "level": "error", "message": "Condition in numbers[1].value is not met with value" }
      ]
    }
  // << conditions-match-invalid-out
;

export const catchTemplate =
  // >> conditions-catch-template
    {
      "numbers": {
        "__arrayItem": {
          "value": {},
          "description": {},
          "__conditions": [
            {
              "__if": {
                "value": "^one$"
              },
              "__then": {
                "description": {
                  "__regexp": "^This is required by one$",
                  "__catch": {
                    "__level": "error"
                  }
                }
              },
              "__catch": {
                "__message": "__fullPath only allowed value is: 'This is required by one'"
              }
            },
            {
              "__if": {
                "value": "^two$"
              },
              "__then": {
                "description": {
                  "__regexp": "^This is required by two$",
                  "__catch": {
                    "__level": "error"
                  }
                }
              },
              "__catch": {
                "__message": "__fullPath only allowed value is: 'This is required by two'"
              }
            }
          ]
        }
      }
    }
  // << conditions-catch-template
;

export const catchInvalidSpecs =
  // >> conditions-catch-invalid-specs
    {
      "numbers": [
        {
          "value": "one",
          "description": "No requirement for one"
        },
        {
          "value": "two",
          "description": "This is required by one"
        }
      ]
    }
  // << conditions-catch-invalid-specs
;

export const catchInvalidOut =
  // >> conditions-catch-invalid-out
    {
      "valid": false,
      "messages": [
        { "level": "error", "message": "numbers[0].value only allowed value is: 'This is required by one'" },
        { "level": "error", "message": "numbers[1].value only allowed value is: 'This is required by two'" }
      ]
    }
  // << conditions-catch-invalid-out
;

export const rootTemplate =
  // >> conditions-root-template
    {
      "itemsList": {
        "__arrayItem": {
          "name": {},
          "__conditions": [
            {
              "__if": {
                "name": ".*"
              },
              "__rootThen": {
                "items": {
                  "__match": {}
                }
              }
            }
          ]
        }
      },
      "items": {
        "__objectItem": {}
      }
    }
  // << conditions-root-template
;

export const rootValidSpecs =
  // >> conditions-root-valid-specs
    {
      "itemsList": [
        {
          "name": "item0"
        },
        {
          "name": "item1"
        }
      ],
      "items": {
        "item0": {},
        "item1": {}
      }
    }
  // << conditions-root-valid-specs
;

export const rootInvalidSpecs =
  // >> conditions-root-invalid-specs
    {
      "itemsList": [
        {
          "name": "item0"
        },
        {
          "name": "item1"
        }
      ],
      "items": {
        "item1": {}
      }
    }
  // << conditions-root-invalid-specs
;

export const rootInvalidOut =
  // >> conditions-root-invalid-out
    {
      "valid": false,
      "messages": [
        { "level": "error", "message": "Condition in itemsList[0].name is not met with name" }
      ]
    }
  // << conditions-root-invalid-out
;

export const thisTemplate =
  // >> conditions-this-template
    {
      "original": {
        "version": {
          "__conditions": [
            {
              "__if": {
                "__this": ".*"
              },
              "__rootThen": {
                "backup": {
                  "version": {
                    "__regexp": "^__match$",
                    "__catch": {
                      "__level": "error"
                    }
                  }
                }
              }
            }
          ]
        },
        "__objectItem": {},
        "__conditions": [
          {
            "__if": {
              "__this_name": ".*"
            },
            "__rootThen": {
              "backup": {
                "__match": {}
              }
            }
          }
        ]
      },
      "backup": {
        "__objectItem": {}
      }
    }
  // << conditions-this-template
;

export const thisValidSpecs =
  // >> conditions-this-valid-specs
    {
      "original": {
        "version": "1.0.2",
        "item0": "abc",
        "item1": "def",
        "item2": "ghi"
      },
      "backup": {
        "version": "1.0.2",
        "item0": "abc",
        "item1": "def",
        "item2": "ghi"
      }
    }
  // << conditions-this-valid-specs
;

export const thisInvalidSpecs =
  // >> conditions-this-invalid-specs
    {
      "original": {
        "version": "1.0.2",
        "item0": "abc",
        "item1": "def",
        "item2": "ghi"
      },
      "backup": {
        "version": "1.0.0",
        "item0": "abc",
        "item1": "456"
      }
    }
  // << conditions-this-invalid-specs
;

export const thisInvalidOut =
  // >> conditions-this-invalid-out
    {
      "valid": false,
      "messages": [
        { "level": "error", "message": "Condition in original.version is not met with version" },
        { "level": "error", "message": "Condition in original.item2 is not met with item2" }
      ]
    }
  // << conditions-this-invalid-out
;