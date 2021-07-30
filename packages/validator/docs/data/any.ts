export const template =
  // >> any-template
    {
      "vehicles": {
        "__arrayItem": {
          "name": {},
          "location": {}
        },
        "__any": {
          "name": {
            "__regexp": "plane"
          }
        }
      },
      "buildings": {
        "__objectItem": {
          "name": {},
          "location": {}
        },
        "__any": {
          "location": {
            "__regexp": "Malta"
          }
        }
      }
    }
  // << any-template
;

export const validSpecs =
  // >> any-valid-specs
    {
      "vehicles": [
        {
          "name": "bus",
          "location": "Albania"
        },
        {
          "name": "plane",
          "location": "Liechtenstein"
        },
        {
          "name": "plane",
          "location": "Estonia"
        }
      ],
      "buildings": {
        "cabin": {
          "name": "woodland",
          "location": "woods"
        },
        "hotel": {
          "name": "five star",
          "location": "Malta"
        }
      }
    }
  // << any-valid-specs
;

export const invalidSpecs =
  // >> any-invalid-specs
    {
      "vehicles": [
        {
          "name": "bus",
          "location": "Albania"
        },
        {
          "name": "boat",
          "location": "Liechtenstein"
        }
      ],
      "buildings": {
        "cabin": {
          "name": "woodland",
          "location": "woods"
        },
        "hotel": {
          "name": "five star",
          "location": "Cyprus"
        }
      }
    }
  // << any-invalid-specs
;

export const invalidOut =
  // >> any-invalid-out
    {
      "valid": false,
      "messages": [
        { "level": "error", "message": "Required conditions not met in vehicles" },
        { "level": "error", "message": "Required conditions not met in buildings" }
      ]
    }
  // << any-invalid-out
;

export const conditionTemplate =
  // >> any-condition-template
    {
      "vehicles": {
        "__arrayItem": {
          "name": {},
          "location": {},
          "__conditions": [
            {
              "__if": {
                "location": ".*"
              },
              "__rootThen": {
                "buildings": {
                  "__any": {
                    "name": {
                      "__regexp": "^__match$"
                    }
                  }
                }
              }
            }
          ]
        }
      },
      "buildings": {
        "__objectItem": {
          "name": {},
          "location": {}
        }
      }
    }
  // << any-condition-template
;

export const conditionValidSpecs =
  // >> any-condition-valid-specs
    {
      "vehicles": [
        {
          "name": "bus",
          "location": "woodland"
        },
        {
          "name": "plane",
          "location": "five star"
        }
      ],
      "buildings": {
        "cabin": {
          "name": "woodland",
          "location": "woods"
        },
        "hotel": {
          "name": "five star",
          "location": "Malta"
        }
      }
    }
  // << any-condition-valid-specs
;

export const conditionInvalidSpecs =
  // >> any-condition-invalid-specs
    {
      "vehicles": [
        {
          "name": "bus",
          "location": "woodland"
        },
        {
          "name": "plane",
          "location": "Malta"
        }
      ],
      "buildings": {
        "cabin": {
          "name": "woodland",
          "location": "woods"
        },
        "hotel": {
          "name": "five star",
          "location": "Malta"
        }
      }
    }
  // << any-condition-invalid-specs
;

export const conditionInvalidOut =
  // >> any-condition-invalid-out
    {
      "valid": false,
      "messages": [
        { "level": "error", "message": "Condition in vehicles[1].location is not met with location" }
      ]
    }
  // << any-condition-invalid-out
;
