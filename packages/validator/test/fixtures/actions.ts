export const copyTemplate =
  // >> actions-copy-template
    {
      "company": {},
      "inventory": {
        "__arrayItem": {
          "name": {},
          "quantity": {}
        },
        "__actions": [
          {
            "__copy": {
              "__target": "[ 'backups', '[[ \\'/\\', \\'company\\' ]]' ]"
            }
          }
        ]
      }
    }
  // << actions-copy-template
;

export const copySpecs =
  // >> actions-copy-specs
    {
      "company": "anon",
      "inventory": [
        {
          "name": "item1",
          "quantity": 10
        },
        {
          "name": "item2",
          "quantity": 3
        }
      ]
    }
  // << actions-copy-specs
;

export const copyOut =
  // >> actions-copy-out
    {
      "valid": true,
      "messages": [],
      "output": {
        "backups": {
          "anon": [
            {
              "name": "item1",
              "quantity": 10
            },
            {
              "name": "item2",
              "quantity": 3
            }
          ]
        }
      }
    }
  // << actions-copy-out
;

export const insertTemplate =
  // >> actions-insert-template
    {
      "original": {},
      "__actions": [
        {
          "__insert": {
            "__target": "[ 'example1' ]",
            "__value": "inserted"
          }
        },
        {
          "__insert": {
            "__target": "[ 'example2' ]",
            "__value": {
              "obj": {
                "value": "inserted"
              }
            }
          }
        }
      ]
    }
  // << actions-insert-template
;

export const insertSpecs =
  // >> actions-insert-specs
    {
      "original": {}
    }
  // << actions-insert-specs
;

export const insertOut =
  // >> actions-insert-out
    {
      "valid": true,
      "messages": [],
      "output": {
        "example1": "inserted",
        "example2": {
          "obj": {
            "value": "inserted"
          }
        }
      }
    }
  // << actions-insert-out
;

export const arraysTemplate =
  // >> actions-arrays-template
    {
      "__objectItem": {
        "__objectItem": {
          "location": {},
          "__actions": [
            {
              "__copy": {
                "__target": "[ 'vehicles[]' ]"
              }
            },
            {
              "__insert": {
                "__target": "[ 'vehicles[_]' ]",
                "__value": {
                  "type": "{{0}}",
                  "name": "{{1}}"
                }
              }
            }
          ]
        }
      }
    }
  // << actions-arrays-template
;

export const arraysSpecs =
  // >> actions-arrays-specs
    {
      "bus": {
        "small_bus": {
          "location": "Portugal"
        },
        "long_bus": {
          "location": "Slovenia"
        }
      },
      "plane": {
        "jet": {
          "location": "Turkey"
        }
      }
    }
  // << actions-arrays-specs
;

export const arraysOut =
  // >> actions-arrays-out
    {
      "valid": true,
      "messages": [],
      "output": {
        "vehicles": [
          {
            "location": "Portugal",
            "type": "bus",
            "name": "small_bus"
          },
          {
            "location": "Slovenia",
            "type": "bus",
            "name": "long_bus"
          },
          {
            "location": "Turkey",
            "type": "plane",
            "name": "jet"
          }
        ]
      }
    }
  // << actions-arrays-out
;

export const allTemplate =
  // >> actions-all-template
    {
      "__actions": [
        {
          "__copy": {
            "__target": "[]"
          }
        },
        {
          "__insert": {
            "__target": "[ 'allArray', '__all', 'inserted' ]",
            "__value": "inserted"
          }
        },
        {
          "__insert": {
            "__target": "[ 'allObject', '__all', 'inserted' ]",
            "__value": "inserted"
          }
        }
      ],
      "allArray": {
        "__arrayItem": {
          "name": {}
        }
      },
      "allObject": {
        "__objectItem": {}
      }
    }
  // << actions-all-template
;

export const allSpecs =
  // >> actions-all-specs
    {
      "allArray": [
        {
          "name": "item1"
        },
        {
          "name": "item2"
        }
      ],
      "allObject": {
        "item3": {},
        "item4": {}
      }
    }
  // << actions-all-specs
;

export const allOut =
  // >> actions-all-out
    {
      "valid": true,
      "messages": [],
      "output": {
        "allArray": [
          {
            "name": "item1",
            "inserted": "inserted"
          },
          {
            "name": "item2",
            "inserted": "inserted"
          }
        ],
        "allObject": {
          "item3": {
            "inserted": "inserted"
          },
          "item4": {
            "inserted": "inserted"
          }
        }
      }
    }
  // << actions-all-out
;
