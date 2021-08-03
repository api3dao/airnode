export const keyTemplate =
  // >> dynamic-key-template
    {
      "__objectItem": {
        "__keyRegexp": "^{{0}}[0-9]+$",
        "__objectItem": {
          "name": {
            "__regexp": "^{{1}}$"
          }
        }
      }
    }
  // << dynamic-key-template
;

export const keyValidSpecs =
  // >> dynamic-key-valid-specs
    {
      "bus": {
        "bus1": {
          "name": "bus1"
        },
        "bus2": {
          "name": "bus2"
        }
      },
      "plane": {
        "plane1": {
          "name": "plane1"
        }
      }
    }
  // << dynamic-key-valid-specs
;

export const keyInvalidSpecs =
  // >> dynamic-key-invalid-specs
    {
      "bus": {
        "plane1": {
          "name": "plane1"
        },
        "bus2": {
          "name": "bus1"
        }
      },
      "plane": {
        "plane1": {
          "name": "bus1"
        }
      }
    }
  // << dynamic-key-invalid-specs
;

export const keyInvalidOut =
  // >> dynamic-key-invalid-out
    {
      "valid": false,
      "messages": [
        { "level": "error", "message": "Key plane1 in bus.plane1 is formatted incorrectly" },
        { "level": "warning", "message": "bus.bus2.name is not formatted correctly" },
        { "level": "warning", "message": "plane.plane1.name is not formatted correctly" }
      ]
    }
  // << dynamic-key-invalid-out
;

export const valueTemplate =
  // >> dynamic-value-template
    {
      "bus": {
        "__arrayItem": {
          "details": {
            "doors": {
              "__regexp": "[0-9]+"
            },
            "wheels": {
              "__regexp": "[0-9]+"
            }
          },
          "owner": {
            "__regexp": "^[[ '/', 'company', 'name' ]]$"
          },
          "name": {},
          "__conditions": [
            {
              "__if": {
                "name": ".*"
              },
              "__then": {
                "name": {
                  "__regexp": "[[ 'details', 'wheels' ]]",
                  "__catch": {
                    "__level": "error"
                  }
                }
              }
            }
          ]
        }
      },
      "company": {
        "name": {}
      }
    }
  // << dynamic-value-template
;

export const valueValidSpecs =
  // >> dynamic-value-valid-specs
    {
      "bus": [
        {
          "details": {
            "doors": "3",
            "wheels": "6"
          },
          "name": "6-wheeler",
          "owner": "anon"
        },
        {
          "details": {
            "doors": "4",
            "wheels": "8"
          },
          "name": "8-wheeler",
          "owner": "anon"
        }
      ],
      "company": {
        "name": "anon"
      }
    }
  // << dynamic-value-valid-specs
;

export const valueInvalidSpecs =
  // >> dynamic-value-invalid-specs
    {
      "bus": [
        {
          "details": {
            "doors": "3",
            "wheels": "6"
          },
          "name": "8-wheeler",
          "owner": "anon"
        },
        {
          "details": {
            "doors": "4",
            "wheels": "8"
          },
          "name": "8-wheeler",
          "owner": "anonymous"
        }
      ],
      "company": {
        "name": "anon"
      }
    }
  // << dynamic-value-invalid-specs
;

export const valueInvalidOut =
  // >> dynamic-value-invalid-out
    {
      "valid": false,
      "messages": [
        { "level": "error", "message": "Condition in bus[0].name is not met with name" },
        { "level": "warning", "message": "bus[1].owner is not formatted correctly" }
      ]
    }
  // << dynamic-value-invalid-out
;