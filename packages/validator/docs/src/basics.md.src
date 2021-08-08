# Basics

## Terminology

In the whole documentation unified terminology will be used, here is the definition of some important keywords:

- **specification** - json structure, that will be checked for compliance with well-defined format
- **template** - json structure, which defines format of valid specification
- **parameter** - combination of key and value assigned to it, located somewhere in the json structure
- **parameter path** - string of keys separated with `.`, contains all keys needed to access a parameter in the json structure from the most outer one to key of the parameter itself
- **root** - refers to the most outer json structure, parameter path of root is empty
- other json related keywords like **json structure**, **key**, **object**, **array**, etc... Will stick to the standard [JSON terminology](https://www.json.org/json-en.html)

---

Most basic validator template can simply include keys of all required parameters with `{}` as value, which will result in validator accepting any specification that has exactly these keys with any primitive values. As validator does not take order of the parameters into consideration, parameters in the specification can be in any order, and it won't change output of the validator.

### Template

<snippet id='basics-template'/>

---
### Valid specification

<snippet id='basics-valid-specs'/>

### Expected output

<snippet id='basics-valid-out'/>

---
### Invalid specification

<snippet id='basics-invalid-specs'/>

### Expected output

<snippet id='basics-invalid-out'/>

After closer examination of error messages it might seem that there is no error message about missing parameters `component.securityScheme.in`, `component.securityScheme.name` and `component.securityScheme.type`. This is caused by missing `component.securityScheme`, which contains these parameters. If parameter is not present in specification, children of this parameter will not be checked and no error message will be returned for them.

---

# Object item

In some instances specification might contain key that is not predefined, to allow any string as a key `__objectItem` in template is used. In place of `__objectItem` specification can contain any key, but structure inside it will be still checked with template.

### Template

<snippet id='basics-obj-template'/>

---
### Valid specification

<snippet id='basics-obj-valid-specs'/>

---
### Invalid specification

<snippet id='basics-obj-invalid-specs'/>

### Expected output

<snippet id='basics-obj-invalid-out'/>

# Array item

Contents of `__arrayItem` define structure of items that are inside the array, which implies parameter containing `__arrayItem` must be an array in specification.

`__maxSize` is an array specific token, which can be used to set maximal count of elements in the array.

### Template

<snippet id='basics-array-template'/>

---

### Valid specification

<snippet id='basics-array-valid-specs'/>

---

### Invalid specification

<snippet id='basics-array-invalid-specs'/>

### Expected output

<snippet id='basics-array-invalid-out'/>

---
