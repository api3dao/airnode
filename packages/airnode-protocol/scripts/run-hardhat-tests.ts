// NOTE: Hardhat tests are terribly slow when there are large number of tests present
// The only workaround for now is running hardhat tests with each test file separately
// as that reduces the number of tests that hardhat has to execute.
//
// See: https://github.com/nomiclabs/hardhat/issues/2076
import { spawnSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

async function walk(directory: string) {
  let fileList: string[] = [];

  const files = await fs.readdir(directory);
  for (const file of files) {
    const p = path.join(directory, file);
    if ((await fs.stat(p)).isDirectory()) {
      fileList = [...fileList, ...(await walk(p))];
    } else {
      fileList.push(p);
    }
  }

  return fileList;
}

async function main() {
  // NOTE: Hardhat tests are extremely slow when there are too many of them

  const files = await walk('test');
  files.forEach((file) => {
    const command = `hardhat test ${file}`;
    spawnSync(command, {
      shell: true,
      stdio: 'inherit',
    });
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
