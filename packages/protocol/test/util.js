/* global waffle */
const { expect, use } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

async function getParsedLogs(contract, tx) {
  const logs = (
    await waffle.provider.getLogs({ address: contract.address })
  ).filter((log) => log.transactionHash === tx.hash);
  return logs.map((log) => contract.interface.parseLog(log));
}

async function matchParsedLogs(
  parsedLogs,
  expectedSignature,
  expectedParameters
) {
  let matchingIndex = 0;
  parsedLogs.forEach(function (parsedLog, index) {
    let allFieldsMatch = parsedLog.signature == expectedSignature;
    for (const parameterName of Object.keys(expectedParameters)) {
      if (parameterName in parsedLog.args) {
        allFieldsMatch =
          allFieldsMatch &&
          parsedLog.args[parameterName].toString() ==
            expectedParameters[parameterName].toString();
      } else {
        allFieldsMatch = false;
      }
    }
    if (allFieldsMatch) {
      matchingIndex = index;
    }
  });
  expect(parsedLogs[matchingIndex].signature).to.equal(expectedSignature);
  for (const parameterName of Object.keys(expectedParameters)) {
    expect(parsedLogs[matchingIndex].args[parameterName]).to.equal(
      expectedParameters[parameterName]
    );
  }
  return parsedLogs[matchingIndex];
}

module.exports = {
  verifyLog: async function (
    contract,
    tx,
    expectedSignature,
    expectedParameters
  ) {
    const parsedLogs = await getParsedLogs(contract, tx);
    return matchParsedLogs(parsedLogs, expectedSignature, expectedParameters);
  },
};
