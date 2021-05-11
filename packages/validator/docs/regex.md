# Regular expressions

To ensure parameters are in correct format, regular expressions are used. Token `__regexp` means, that value of the parameter, has to match the provided regular expression. Similarly `__keyRegexp`, is checking if the key of parameter matches the regular expression.

#### Template
```json
{
  "__keyRegexp": "^server$",
  "__objectItem": {
    "__regexp": "^(https?|ftp)://[^\\s/$.?#].[^\\s]*$"
  }
}
```
---
#### Valid specification
```json
{
  "server": "https://www.google.com/"
}
```
---
#### Invalid specification
```json
{
  "invalid": "google"
}
```
#### Expected output
```json
{
  "valid": false,
  "messages": [
    { "level": "error", "message": "Key invalid in invalid is formatted incorrectly" },
    { "level": "warning", "message": "invalid is not formatted correctly" }
  ]
}
```
---

Notice `__keyRegexp` is nested on the same level as key of the parameter it is validating, whereas `__regexp` is nested in the object, which value it is validating.

### Useful regular expressions

`^(one|two)$` - all the valid strings are `one` and `two`

`(?<={)[^\/{}]+(?=})` - anything thats between `{` and `}` (usage example at parameters in paths)

`^[^\s'"\\]+$` - any string with at least 1 character and not containing any whitespaces, `'`, `"` or `\\`