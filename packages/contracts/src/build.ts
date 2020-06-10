const fs = require('fs');
const path = require('path');
const solc = require('solc');

function findInDir(dir, filter, fileList: string[] = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const fileStat = fs.lstatSync(filePath);

    if (fileStat.isDirectory()) {
      findInDir(filePath, filter, fileList);
    } else if (filter.test(filePath)) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const build = (sourcePath, destPath) => {
  const sourceFiles = findInDir(sourcePath, /\.sol$/);
  const sourceFilesWithContents = {};
  sourceFiles.forEach((sourceFile) => {
    sourceFilesWithContents[sourceFile.replace(sourcePath, '.')] = {
      content: fs.readFileSync(sourceFile, { encoding: 'utf8' }),
    };
  });

  const input = {
    sources: sourceFilesWithContents,
    language: 'Solidity',
    settings: {
      outputSelection: {
        '*': {
          '*': ['*'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  output.errors.forEach((error) => {
    console.log(error.formattedMessage);
  });
  if (output.errors.filter((error) => error.severity === 'error').length) {
    throw new Error('Solidity compilation error, see above.');
  }

  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath);
  }
  for (const contractKey in output.contracts) {
    const contract = output.contracts[contractKey];
    const destFile = `${destPath}/${Object.keys(contract)[0]}.json`;
    fs.writeFileSync(destFile, JSON.stringify(contract[Object.keys(contract)[0]], null, 2));
  }
};

build(process.argv[2], process.argv[3]);
