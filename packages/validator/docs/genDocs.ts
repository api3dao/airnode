import * as fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const docs = fs
  .readdirSync(path.resolve(__dirname, '../.docs'), { withFileTypes: true })
  .filter((dirent: { isDirectory: () => any }) => !dirent.isDirectory())
  .map((dirent: { name: any }) => dirent.name);

for (const md of docs) {
  fs.copyFileSync(path.resolve(__dirname, `../.docs/${md}`), path.resolve(__dirname, md));
}

exec('mdinject --root="data" --docsroot="./" --sourceext=".ts" --targetext=".md" --snippettitles="json"', {
  cwd: path.resolve(__dirname),
});
