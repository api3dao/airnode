// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./RrpDapiServer.sol";
import "./Api3Adminship.sol";

// A sample price data feed implemented as a dAPI client
contract SamplePriceDataFeed is Api3Adminship {
  RrpDapiServer public rrpDapiServer;

  bytes16 public latestDapiId;
  int256 public latestAnswer;

  uint256 public cooldownTime = 1 days; // TODO: is this the right value?
  mapping(address => uint64) adminToDapiLastUpdated;

  constructor(address _rrpDapiServer, address _metaAdmin) Api3Adminship(_metaAdmin) {
    rrpDapiServer = RrpDapiServer(_rrpDapiServer);
    // TODO: should we set superadmin status to technical team deploying the contract?
    // this.setAdminStatus(msg.sender, AdminStatus.SuperAdmin);
  }

  function setDapi(
    bytes16 dapiId // onlyOwner
  ) external {
    latestDapiId = dapiId;
  }

  // multisig calls PriceDataFeed with update parameters
  function updateDapi(
    bytes16 _dapiId /* ", new params?... */
  ) external {
    // Check admin status
    // TODO: should this be in a modifier inside Api3Adminship contract?
    require(adminStatuses[msg.sender] >= AdminStatus.Admin || msg.sender == metaAdmin, ERROR_UNAUTHORIZED);
    // Check cooldown period
    require(
      adminToDapiLastUpdated[msg.sender] == 0 || // first time updating will not have a last updated value
        block.timestamp >= (adminToDapiLastUpdated[msg.sender] + cooldownTime),
      "need to wait for cooldown time to elapse"
    );

    // PriceDataFeed fetches the current dAPI parameters from RrpDapiServer
    // Dapi dapi = this.rrpDapiServer.dapis[_dapiId]; // TODO: do I need to create a getter that returns multiple values instead of struct?

    // Applies the update (if valid, reverts otherwise)
    // TODO: diff???

    // Calls RrpDapiServer to create the new dAPI
    // bytes16 newDapiId = this.rrpDapiServer.registerDapi(noResponsesToReduce, toleranceInPercentages, requesterIndex, templateIds, designatedWallets, reduceAddress, reduceFunctionId, requestIndexResetter);

    // Update dapiLastUpdated timestamp
    adminToDapiLastUpdated[msg.sender] = uint64(block.timestamp);

    // Record the returned dapiId
    // latestDapiId = newDapiId;
  }

  function makeDapiRequest() external // onlyOwner
  {
    rrpDapiServer.resetDapiRequestIndex(latestDapiId);
    rrpDapiServer.makeDapiRequest(latestDapiId, "");
    // We don't need to get the dAPI request index because we know
    // it will be 1, we just have reset it
  }

  function reduce(
    bytes16 dapiId,
    uint64 dapiRequestIndex,
    int256 reducedValue
  ) external {
    require(msg.sender == address(rrpDapiServer), "Caller not RRP dAPI server");
    require(dapiId == latestDapiId, "dAPI stale");
    require(dapiRequestIndex == 1, "Request stale");
    latestAnswer = reducedValue;
  }
}
