usePlugin("@nomiclabs/buidler-waffle");
usePlugin('buidler-deploy');
usePlugin('solidity-coverage');

const fs = require('fs')
let credentials = require("./credentials.example.json");
if (fs.existsSync("./credentials.json")) {
  credentials = require("./credentials.json");
}

module.exports = {
  networks: {
    buidlerevm: {
    },
    mainnet: {
      url: credentials.mainnet.providerUrl || "",
      accounts: {mnemonic: credentials.mainnet.mnemonic || ""}
    },
    rinkeby: {
      url: credentials.rinkeby.providerUrl || "",
      accounts: {mnemonic: credentials.rinkeby.mnemonic || ""}
    },
    ropsten: {
      url: credentials.ropsten.providerUrl || "",
      accounts: {mnemonic: credentials.ropsten.mnemonic || ""}
    }
  },
  namedAccounts: {
    deployer: {
      default: 0,
      1: 0,
      3: '0x1Da10cDEc44538E1854791b8e71FA4Ef05b4b238',
      4: '0x1Da10cDEc44538E1854791b8e71FA4Ef05b4b238',
    },
  },
  solc: {
    version: "0.6.12",
  },
};
