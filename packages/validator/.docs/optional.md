
# Optional

By default, parameters in the specification are required. However, it is possible to create optional parameters, in case certain parameters are present but not required. For this purpose, `__optional` is used.

If parameters are specified inside an `__optional` key in the template -- but are not present in the specification -- this will not cause any extra parameter messages or missing parameter messages to show.

### Template

<snippet id='optional-template'/>

---
### Valid specification

<snippet id='optional-valid-specs'/>

---
### Invalid specification

<snippet id='optional-invalid-specs'/>

### Expected output

<snippet id='optional-invalid-out'/>

---
