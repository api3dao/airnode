const { verifyLog } = require('../util');

async function createRequester(airnode, requesterAdminRole) {
  const tx = await airnode.connect(requesterAdminRole).createRequester(requesterAdminRole.address);
  const log = await verifyLog(airnode, tx, 'RequesterCreated(uint256,address)', {
    admin: requesterAdminRole.address,
  });
  return log.args.requesterIndex;
}

module.exports = {
  createRequester: createRequester,
};
