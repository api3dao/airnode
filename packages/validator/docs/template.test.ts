import fs from 'fs';
import * as validator from '../src/validator';

it('nested templates (docs)', () => {
  const template = JSON.parse(fs.readFileSync('docs/template.json', 'utf-8'));
  const validSpecs = {
    path: 'docs/template.json',
    nested: {
      path: 'docs/nested/template.json',
    },
  };

  const invalidSpecs = {
    path: 'docs/nested/template.json',
    nested: {
      path: 'docs/template.json',
    },
  };

  expect(validator.validateJson(validSpecs, template, 'docs/')).toMatchObject({ valid: true, messages: [] });
  expect(validator.validateJson(invalidSpecs, template, 'docs/')).toMatchObject({
    valid: false,
    messages: [
      { level: 'error', message: 'Error in root template' },
      { level: 'error', message: 'Error in template nested in nested' },
    ],
  });
});
