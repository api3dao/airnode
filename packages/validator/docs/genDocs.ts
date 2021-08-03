import * as fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { templateNested } from '../test/fixtures/template';

const docs = fs
  .readdirSync(path.resolve(__dirname, './src'), { withFileTypes: true })
  .map((dirent: { name: any }) => dirent.name);

for (const md of docs) {
  fs.copyFileSync(path.resolve(__dirname, `./src/${md}`), path.resolve(__dirname, md.replace(/\.src$/, '')));
}

exec('mdinject --root="../test/fixtures" --docsroot="./" --sourceext=".ts" --targetext=".md" --snippettitles="json"', {
  cwd: path.resolve(__dirname),
});

if (!fs.existsSync(path.resolve(__dirname, '../test/nested'))) {
  fs.mkdirSync(path.resolve(__dirname, '../test/nested'));
}

fs.writeFileSync(path.resolve(__dirname, '../test/nested/template.json'), JSON.stringify(templateNested, null, 2));
