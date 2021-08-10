# Actions

If any action is specified in template, object `output` will be returned when processing a specification. This object is at first empty. By inserting or copying parameters from the given specification, it can construct the desired specification.

## Copy action

`__copy` object located inside `__actions` array of some parameter will copy the value of parameter it is nested in into provided `__target`, which is evaluated as an absolute path.

### Template

<snippet id='actions-copy-template'/>

---
### Input

<snippet id='actions-copy-specs'/>

### Expected output

<snippet id='actions-copy-out'/>

---

## Insert action

Keyword `__insert` works similarly to `__copy`, except it doesn't copy a value of parameter, but inserts value provided in `__value`

### Template

<snippet id='actions-insert-template'/>

---
### Input

<snippet id='actions-insert-specs'/>

### Expected output

<snippet id='actions-insert-out'/>

---

## Arrays in `__target`

Arrays in `__target` can be accessed as regular items in arrays with `[x]`, where `x` is index of the item that will be accessed. However, in arrays inside `__target` last item of the array can be accessed with `[_]` and new item can be inserted into array with `[]`.

Actions are the only concept of validator templates in which ordering matters. Actions are performed sequentially from top to bottom, this means action at the very top of the template will be performed before all actions underneath. This is important to keep in mind when working with arrays. At first an item should be inserted into an array with `[]`, after that the item can be filled with desired data by accessing the last item with `[_]`.

### Template

<snippet id='actions-arrays-template'/>

---
### Input

<snippet id='actions-arrays-specs'/>

### Expected output

<snippet id='actions-arrays-out'/>

---

## All

Action can be also performed on every parameter somewhere in the parameter path, this is achieved by using `__all`.

### Template

<snippet id='actions-all-template'/>

---
### Input

<snippet id='actions-all-specs'/>

### Expected output

<snippet id='actions-all-out'/>

---