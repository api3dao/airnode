# Catch

Validator has default error messages, that are returned in case specification is not matching template. Contents of these messages can be modified with `__catch`, to better explain why and where an error occurred and maybe even suggest a fix for this error. `__catch` will prevent all errors that occur on the same level or in parameters nested deeper in the same object from displaying and replaces them with provided message.

### Specification used in following templates

<snippet id='catch-specs'/>

---

### Template without `__catch`

<snippet id='catch-no-catch-template'/>

### Expected output

<snippet id='catch-no-catch-out'/>

---

## Basic `__catch`

### Template

<snippet id='catch-basic-template'/>

### Expected output

<snippet id='catch-basic-out'/>

---

## Modifying message level

In case `__catch` contains only `__level`, messages will not be replaced but their level will be set to value of `__level`.

### Template

<snippet id='catch-level-template'/>

### Expected output

<snippet id='catch-level-out'/>

---

## Ignoring messages

Messages can be also completely ignored by providing `__catch` without both `__level` and `__message`.

### Template

<snippet id='catch-ignore-template'/>

### Expected output

<snippet id='catch-ignore-out'/>

---

## Special keywords

Some keywords in `__message` will be replaced with certain values:

- `__value` - if containing parameter is string in specification, `__value` will be replaced with its value
- `__path` - path of the parameter in the current specification
- `__prefix` - path to root parameter of the current template in case it is nested inside another template
- `__fullPath` - combination of `__prefix` and `__path`

### Template

<snippet id='catch-keywords-template'/>

### Expected output

<snippet id='catch-keywords-out'/>

---
