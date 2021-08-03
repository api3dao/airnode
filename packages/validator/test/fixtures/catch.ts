export const specs =
  // >> catch-specs
    {
      "test1": {
        "title": "Test 1",
        "value": "1"
      },
      "test2": {
        "name": "Test 2",
        "value": "two"
      },
      "example3": {
        "name": "Test 3",
        "value": "3"
      }
    }
  // << catch-specs
;

export const noCatchTemplate =
  // >> catch-no-catch-template
    {
      "__keyRegexp": "^test",
      "__objectItem": {
        "name": {},
        "value": {
          "__regexp": "^[0-9]$"
        }
      }
    }
  // << catch-no-catch-template
;

export const noCatchOut =
  // >> catch-no-catch-out
    {
      "valid": false,
      "messages": [
        { "level": "error", "message": "Key example3 in example3 is formatted incorrectly" },
        { "level": "error", "message": "Missing parameter test1.name" },
        { "level": "warning", "message": "test2.value is not formatted correctly" },
        { "level": "warning", "message": "Extra field: test1.title" }
      ]
    }
  // << catch-no-catch-out
;

export const basicTemplate =
  // >> catch-basic-template
    {
      "__keyRegexp": "^test",
      "__catch": {
        "__level": "error",
        "__message": "Please write better specification"
      },
      "__objectItem": {
        "name": {},
        "value": {
          "__regexp": "^[0-9]$"
        }
      }
    }
  // << catch-basic-template
;

export const basicOut =
  // >> catch-basic-out
    {
      "valid": false,
      "messages": [
        { "level": "error", "message": "Please write better specification" }
      ]
    }
  // << catch-basic-out
;

export const levelTemplate =
  // >> catch-level-template
    {
      "__keyRegexp": "^test",
      "__catch": {
        "__level": "warning"
      },
      "__objectItem": {
        "name": {},
        "value": {
          "__regexp": "^[0-9]$"
        }
      }
    }
  // << catch-level-template
;

export const levelOut =
  // >> catch-level-out
    {
      "valid": true,
      "messages": [
        { "level": "warning", "message": "Key example3 in example3 is formatted incorrectly" },
        { "level": "warning", "message": "Missing parameter test1.name" },
        { "level": "warning", "message": "test2.value is not formatted correctly" },
        { "level": "warning", "message": "Extra field: test1.title" }
      ]
    }
  // << catch-level-out
;

export const ignoreTemplate =
  // >> catch-ignore-template
    {
      "__keyRegexp": "^test",
      "__catch": {},
      "__objectItem": {
        "name": {},
        "value": {
          "__regexp": "^[0-9]$"
        }
      }
    }
  // << catch-ignore-template
;

export const ignoreOut =
  // >> catch-ignore-out
    {
      "valid": true,
      "messages": []
    }
  // << catch-ignore-out
;

export const keywordsTemplate =
  // >> catch-keywords-template
    {
      "__keyRegexp": "^test",
      "__objectItem": {
        "name": {},
        "value": {
          "__regexp": "^[0-9]$",
          "__catch": {
            "__level": "error",
            "__message": "__fullPath: Invalid value '__value'"
          }
        }
      }
    }
  // << catch-keywords-template
;

export const keywordsOut =
  // >> catch-keywords-out
    {
      "valid": false,
      "messages": [
        { "level": "error", "message": "Key example3 in example3 is formatted incorrectly" },
        { "level": "error", "message": "Missing parameter test1.name" },
        { "level": "error", "message": "test2.value: Invalid value 'two'" },
        { "level": "warning", "message": "Extra field: test1.title" }
      ]
    }
  // << catch-keywords-out
;