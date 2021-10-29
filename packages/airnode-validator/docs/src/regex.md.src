# Regular expressions

Content of string values in specification can be controlled with [regular expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions). Value of key `__regexp` in template, will be interpreted as regular expression and checked with value of specification parameter it is nested in. Regular expressions are very useful in combination with `__objectItem`, by using `__keyRegexp` contents of keys in specification can be regulated as well.

Regular expressions in templates are stored as a string, this means when validator reads the regular expression one escape character gets consumed before executing the regular expression, that's why **all backslashes must be doubled in regular expressions**.

### Template

<snippet id='regex-template'/>

---
### Valid specification

<snippet id='regex-valid-specs'/>

---
### Invalid specification

<snippet id='regex-invalid-specs'/>

### Expected output

<snippet id='regex-invalid-out'/>

---

## Useful regular expressions

`^(one|two)$` - all the valid strings are `one` and `two`

`(?<={)[^\/{}]+(?=})` - anything thats between `{` and `}` (usage example at parameters in paths)

`^[^\s'"\\]+$` - any string with at least 1 character and not containing any whitespaces, `'`, `"` or `\\`