# Catch

Validator has default error messages, that are returned in case specification is not matching template. Contents of these messages can be modified with `__catch`, to better explain why and where an error occurred and maybe even suggest a fix for this error. `__catch` will prevent all errors that occur on the same level or in parameters nested deeper in the same object from displaying and replaces them with provided message.

### Specification used in following templates

```json
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
```

---

### Template without `__catch`

```json
{
  "__keyRegexp": "^test",
  "__objectItem": {
    "name": {},
    "value": {
      "__regexp": "^[0-9]$"
    }
  }
}
```

### Expected output

```json
{
  "valid": false,
  "messages": [
    { "level": "error", "message": "Key example3 in example3 is formatted incorrectly" },
    { "level": "error", "message": "Missing parameter test1.name" },
    { "level": "warning", "message": "test2.value is not formatted correctly" },
    { "level": "warning", "message": "Extra field: test1.title" }
  ]
}
```
---

## Basic `__catch`

### Template

```json
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
```


### Expected output

```json
{
  "valid": false,
  "messages": [
    { "level": "error", "message": "Please write better specification" }
  ]
}
```

---

## Modifying message level

In case `__catch` contains only `__level`, messages will not be replaced but their level will be set to value of `__level`.

### Template

```json
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
```

### Expected output

```json
{
  "valid": true,
  "messages": [
    { "level": "warning", "message": "Key example3 in example3 is formatted incorrectly" },
    { "level": "warning", "message": "Missing parameter test1.name" },
    { "level": "warning", "message": "test2.value is not formatted correctly" },
    { "level": "warning", "message": "Extra field: test1.title" }
  ]
}
```
---

## Ignoring messages

Messages can be also completely ignored by not providing `__catch` with `__level` nor `__message`.

### Template

```json
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
```

### Expected output

```json
{
  "valid": true,
  "messages": []
}
```
---

## Special keywords

Some keywords in `__message` will be replaced with certain values:

- `__value` - if containing parameter is string in specification, `__value` will be replaced with its value
- `__path` - path of the parameter in the current specification
- `__prefix` - path to root parameter of the current template in case it is nested inside another template
- `__path` - combination of `__prefix` and `__path`

### Template

```json
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
```


### Expected output

```json
{
  "valid": false,
  "messages": [
    { "level": "error", "message": "Key example3 in example3 is formatted incorrectly" },
    { "level": "error", "message": "Missing parameter test1.name" },
    { "level": "error", "message": "test2.value: Invalid value 'two'" },
    { "level": "warning", "message": "Extra field: test1.title" }
  ]
}
```

---