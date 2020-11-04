const { verifyLog } = require('../util');

async function createRequester(airnode, requesterAdminRole) {
  const tx = await airnode.connect(requesterAdminRole).createRequester(requesterAdminRole._address);
  const log = await verifyLog(airnode, tx, 'RequesterCreated(uint256,address)', {
    admin: requesterAdminRole._address,
  });
  return log.args.requesterInd;
}

module.exports = {
  createRequester: createRequester,
};
