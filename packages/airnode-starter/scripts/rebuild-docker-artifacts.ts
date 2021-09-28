import { spawnSync } from 'child_process';

async function main() {
  spawnSync(`yarn --cwd ../../ docker:artifacts`, {
    shell: true,
    stdio: 'inherit',
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
