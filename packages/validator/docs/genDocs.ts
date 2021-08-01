import * as fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { templateNested } from './data/template';

const docs = fs
  .readdirSync(path.resolve(__dirname, '../.docs'), { withFileTypes: true })
  .map((dirent: { name: any }) => dirent.name);

for (const md of docs) {
  fs.copyFileSync(path.resolve(__dirname, `../.docs/${md}`), path.resolve(__dirname, md));
}

exec('mdinject --root="data" --docsroot="./" --sourceext=".ts" --targetext=".md" --snippettitles="json"', {
  cwd: path.resolve(__dirname),
});

if (!fs.existsSync(path.resolve(__dirname, 'nested'))) {
  fs.mkdirSync(path.resolve(__dirname, 'nested'));
}

fs.writeFileSync(path.resolve(__dirname, 'nested/template.json'), JSON.stringify(templateNested, null, 2));
