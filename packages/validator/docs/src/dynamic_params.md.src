# Dynamic keys and values

The validator can access both keys from the parameter path and values from the specification. These dynamic parameters consist of placeholders that are on evaluation replaced with strings contained in other parts of the specification.

## Retrieving key from parameter path

Any key or value can contain a number surrounded by {{}}, that is: `{{x}}` where `x` is an integer. This indicates that `{{x}}` will be replaced by the key located on the `x`-th index in the parameter path. For example `{{0}}` located in value with parameter path `outer.arr[2].inner` will be replaced with `outer`, similarly `{{1}}` will be replaced with `arr[2]` and so on.

### Template

<snippet id='dynamic-key-template'/>

---
### Valid specification

<snippet id='dynamic-key-valid-specs'/>

---
### Invalid specification

<snippet id='dynamic-key-invalid-specs'/>

### Expected output

<snippet id='dynamic-key-invalid-out'/>

---

## Retrieving value of any parameter in specification

Value of any parameter in the specification can be accessed by providing relative or absolute path to the parameter. Value of parameter is read by providing parameter path as a standard typescript array, in which each item is a key of parameter path. This array is then surrounded with `[]`. Parameter path will be evaluated relative to current position in the specification, however parameter path can be evaluated from the root of current template (absolute evaluation), by inserting `/` as the very first item of the array. Also if value is being retrieved inside a condition, relative path will be in the same position as condition and will not change even in nested parameters inside `__then`/`__rootThen` objects.

### Template

<snippet id='dynamic-value-template'/>

---
### Valid specification

<snippet id='dynamic-value-valid-specs'/>

---
### Invalid specification

<snippet id='dynamic-value-invalid-specs'/>

### Expected output

<snippet id='dynamic-value-invalid-out'/>

---
