# Regular expressions

Content of string values in specification can be controlled with [regular expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions). Value of key `__regexp` in template, will be interpreted as regular expression and checked with value of specification parameter it is nested in. Regular expressions are very useful in combination with `__objectItem`, by using `__keyRegexp` contents of keys in specification can be regulated as well.

Regular expressions in templates are stored as a string, this means when validator reads the regular expression one escape character gets consumed before executing the regular expression, that's why **all backslashes must be doubled in regular expressions**.

### Template

```json
{
  "string": {
    "__regexp": "^(string|char)$"
  },
  "numbers": {
    "__keyRegexp": "^[0-9]+$",
    "__objectItem": {
      "__regexp": "^\\\\[a-z]+\\s$"
    }
  }
}
```

---
### Valid specification

```json
{
  "string": "string",
  "numbers": {
    "3": "\\three ",
    "10": "\\ten ",
    "42": "\\yes "
  }
}
```

---
### Invalid specification

```json
{
  "string": "boolean",
  "numbers": {
    "string": "\\NaN ",
    "5": "five ",
    "1": "\\one"
  }
}
```

### Expected output

```json
{
  "valid": false,
  "messages": [
    { "level": "warning", "message": "string is not formatted correctly" },
    { "level": "error", "message": "Key string in numbers.string is formatted incorrectly" },
    { "level": "warning", "message": "numbers.1 is not formatted correctly" },
    { "level": "warning", "message": "numbers.5 is not formatted correctly" },
    { "level": "warning", "message": "numbers.string is not formatted correctly" }
  ]
}
```

---

## Useful regular expressions

`^(one|two)$` - all the valid strings are `one` and `two`

`(?<={)[^\/{}]+(?=})` - anything thats between `{` and `}` (usage example at parameters in paths)

`^[^\s'"\\]+$` - any string with at least 1 character and not containing any whitespaces, `'`, `"` or `\\`