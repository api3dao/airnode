export const template =
  // >> template-template
    {
      "path": {
        "__regexp": "^docs\\/template\\.json$",
        "__catch": {
          "__level": "error",
          "__message": "Error in root template"
        }
      },
      "nested": {
        "__template": "nested/template.json"
      }
    }
  // << template-template
;

export const templateNested =
  // >> template-template-nested
    {
      "path": {
        "__regexp": "^docs\\/nested\\/template\\.json$",
        "__catch": {
          "__level": "error",
          "__message": "Error in template nested in __prefix"
        }
      }
    }
  // << template-template-nested
;

export const validSpecs =
  // >> template-valid-specs
    {
      "path": "docs/template.json",
      "nested": {
        "path": "docs/nested/template.json"
      }
    }
  // << template-valid-specs
;

export const invalidSpecs =
  // >> template-invalid-specs
    {
      "path": "docs/nested/template.json",
      "nested": {
        "path": "docs/template.json"
      }
    }
  // << template-invalid-specs
;

export const invalidOut =
  // >> template-invalid-out
    {
      "valid": false,
      "messages": [
        { "level": "error", "message": "Error in root template" },
        { "level": "error", "message": "Error in template nested in nested" }
      ]
    }
  // << template-invalid-out
;
