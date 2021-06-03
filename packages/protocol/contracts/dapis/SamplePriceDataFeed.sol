// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./RrpDapiServer.sol";
import "./Api3Adminship.sol";

// A sample price data feed implemented as a dAPI client
contract SamplePriceDataFeed is Api3Adminship {
  RrpDapiServer public rrpDapiServer;

  bytes16 public latestDapiId;
  int256 public latestAnswer;

  uint256 public cooldownTime = 1 weeks;
  mapping(address => uint64) public adminToDapiLastUpdated;

  /// @dev Reverts if the caller tries to update a dAPI again before the cooldown period has elapsed
  modifier cooldownTimeEnded() {
    require(
      adminToDapiLastUpdated[msg.sender] == 0 || // first time updating will not have a last updated value
        block.timestamp >= (adminToDapiLastUpdated[msg.sender] + cooldownTime),
      "Cooldown period has not finished"
    );
    _;
  }

  event DapiUpdated(bytes16 dapiId);

  constructor(address _rrpDapiServer, address _metaAdmin) Api3Adminship(_metaAdmin) {
    require(_rrpDapiServer != address(0), "Zero address");
    rrpDapiServer = RrpDapiServer(_rrpDapiServer);
    // TODO: should we set superadmin status to technical team deploying the contract?
    // this.setAdminStatus(msg.sender, AdminStatus.SuperAdmin);
  }

  function _setDapiId(bytes16 _dapiId) internal {
    adminToDapiLastUpdated[msg.sender] = uint64(block.timestamp);
    latestDapiId = _dapiId;
    emit DapiUpdated(_dapiId);
  }

  function setDapi(bytes16 _dapiId) external onlyAdminOrMetaAdmin cooldownTimeEnded {
    _setDapiId(_dapiId);
  }

  function updateDapi(
    bytes16 _dapiId,
    bytes32[] calldata _templateIds,
    address[] calldata _designatedWallets
  ) external onlyAdminOrMetaAdmin cooldownTimeEnded {
    // Fetches current dAPI parameters from RrpDapiServer
    (
      uint256 noResponsesToReduce,
      uint256 toleranceInPercentages,
      uint256 requesterIndex,
      bytes32[] memory templateIds,
      address[] memory designatedWallets,
      address reduceAddress,
      bytes4 reduceFunctionId,
      address requestIndexResetter
    ) = rrpDapiServer.getDapi(_dapiId);
    // TODO: check dAPI was found?

    // Check templateIds and/or designatedWallets are different
    require(
      keccak256(abi.encodePacked(templateIds, designatedWallets)) !=
        keccak256(abi.encodePacked(_templateIds, _designatedWallets)),
      "templateIds or designatedWallets must be different"
    );

    // Calls RrpDapiServer to create the new dAPI
    bytes16 newDapiId =
      rrpDapiServer.registerDapi(
        _templateIds,
        _designatedWallets,
        noResponsesToReduce,
        toleranceInPercentages,
        requesterIndex,
        reduceAddress,
        reduceFunctionId,
        requestIndexResetter
      );

    _setDapiId(newDapiId);
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
