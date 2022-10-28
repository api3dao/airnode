import { runCommand } from './utils';

const AIRNODE_REPOSITORY = 'https://github.com/api3dao/airnode.git';

export const config = (section: string, value: string) => runCommand(`git config --global --add ${section} ${value} `);

export const clone = (directory?: string) => runCommand(`git clone ${AIRNODE_REPOSITORY} ${directory ?? ''}`);

export const checkout = (ref: string, directory?: string) =>
  runCommand(`git ${directory ? `-C ${directory}` : ''} checkout ${ref}`);

export const listFiles = (directory?: string) =>
  runCommand(`git ${directory ? `-C ${directory}` : ''} ls-files --exclude-standard -oi --directory`);

export const commit = (message: string) => {
  runCommand(`git commit -m ${message}`);
};

export const push = (branch: string) => {
  runCommand(`git push origin ${branch}`);
};
