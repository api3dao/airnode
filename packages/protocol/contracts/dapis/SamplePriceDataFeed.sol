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
  mapping(address => uint64) public adminToDapiLastUpdated;

  /// @dev Reverts if the caller tries to update a dapi again before the cooldown period has elapsed
  modifier cooldownTimeEnded() {
    require(
      adminToDapiLastUpdated[msg.sender] == 0 || // first time updating will not have a last updated value
        block.timestamp >= (adminToDapiLastUpdated[msg.sender] + cooldownTime),
      "Cooldown period has not finished"
    );
    _;
  }

  constructor(address _rrpDapiServer, address _metaAdmin) Api3Adminship(_metaAdmin) {
    require(_rrpDapiServer != address(0), ERROR_ZERO_ADDRESS);
    rrpDapiServer = RrpDapiServer(_rrpDapiServer);
    // TODO: should we set superadmin status to technical team deploying the contract?
    // this.setAdminStatus(msg.sender, AdminStatus.SuperAdmin);
  }

  function setDapi(
    bytes16 dapiId // onlyOwner
  ) external {
    latestDapiId = dapiId;
  }

  function addTemplate(bytes16 _dapiId, bytes32 _templateId) external onlyAdminOrMetaAdmin cooldownTimeEnded {
    // PriceDataFeed fetches the current dAPI parameters from RrpDapiServer
    // Dapi dapi = this.rrpDapiServer.dapis[_dapiId]; // TODO: this doesn't work
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
    // TODO: check dapi was found?

    // Adds templateId to Dapi.templateIds (iterating over because array push() is only available in storage arrays)
    bytes32[] memory newTemplateIds = new bytes32[](templateIds.length + 1);
    for (uint256 i = 0; i < templateIds.length; i++) {
      newTemplateIds[i] = templateIds[i];
    }
    newTemplateIds[newTemplateIds.length - 1] = _templateId;

    // TODO: should we also receive a designatedWallet address as param?
    address[] memory newDesignatedWallets = new address[](designatedWallets.length + 1);
    for (uint256 i = 0; i < designatedWallets.length; i++) {
      newDesignatedWallets[i] = designatedWallets[i];
    }
    newDesignatedWallets[newDesignatedWallets.length - 1] = designatedWallets[designatedWallets.length - 1]; // TODO: param?

    // Calls RrpDapiServer to create the new dAPI
    bytes16 newDapiId =
      rrpDapiServer.registerDapi(
        noResponsesToReduce,
        toleranceInPercentages,
        requesterIndex,
        newTemplateIds,
        newDesignatedWallets,
        reduceAddress,
        reduceFunctionId,
        requestIndexResetter
      );

    // Update dapiLastUpdated timestamp
    adminToDapiLastUpdated[msg.sender] = uint64(block.timestamp);

    // Record the returned dapiId
    latestDapiId = newDapiId;

    // TODO: publish TemplateAdded event?
  }

  function removeTemplate(bytes16 _dapiId, bytes32 _templateId) external onlyAdminOrMetaAdmin cooldownTimeEnded {
    // PriceDataFeed fetches the current dAPI parameters from RrpDapiServer
    // Dapi dapi = this.rrpDapiServer.dapis[_dapiId]; // TODO: this doesn't work
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
    // TODO: check dapi was found?

    // Removes templateId from Dapi.templateIds (iterating over because array pop() is only available in storage arrays)
    bool found = false;
    bytes32[] memory newTemplateIds = new bytes32[](templateIds.length - 1);
    address[] memory newDesignatedWallets = new address[](designatedWallets.length - 1);
    for (uint256 i = 0; i < templateIds.length; i++) {
      // copy array without _templateId
      if (templateIds[i] == _templateId) {
        found = true;
      }
      uint256 j = found ? i + 1 : i;
      if (i != templateIds.length - 1) {
        newTemplateIds[i] = templateIds[j];
        newDesignatedWallets[i] = designatedWallets[j];
      }
    }
    if (!found) {
      revert("TemplateId was not found");
    }

    // Calls RrpDapiServer to create the new dAPI
    bytes16 newDapiId =
      rrpDapiServer.registerDapi(
        noResponsesToReduce,
        toleranceInPercentages,
        requesterIndex,
        newTemplateIds,
        newDesignatedWallets,
        reduceAddress,
        reduceFunctionId,
        requestIndexResetter
      );

    // Update dapiLastUpdated timestamp
    adminToDapiLastUpdated[msg.sender] = uint64(block.timestamp);

    // Record the returned dapiId
    latestDapiId = newDapiId;

    // TODO: publish TemplateRemoved event?
  }

  function updateTemplate(
    bytes16 _dapiId,
    bytes32 _templateId1,
    bytes32 _templateId2
  ) external onlyAdminOrMetaAdmin cooldownTimeEnded {
    // PriceDataFeed fetches the current dAPI parameters from RrpDapiServer
    // Dapi dapi = this.rrpDapiServer.dapis[_dapiId]; // TODO: this doesn't work
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
    // TODO: check dapi was found?

    // updates templateId1 with templateId2 in Dapi.templateIds
    bool found = false;
    for (uint256 i = 0; i < templateIds.length; i++) {
      // update_templateId1 with _templateId2
      if (templateIds[i] == _templateId1) {
        templateIds[i] = _templateId2;
        found = true;
        break;
      }
    }
    if (!found) {
      revert("TemplateId was not found");
    }

    // Calls RrpDapiServer to create the new dAPI
    bytes16 newDapiId =
      rrpDapiServer.registerDapi(
        noResponsesToReduce,
        toleranceInPercentages,
        requesterIndex,
        templateIds,
        designatedWallets,
        reduceAddress,
        reduceFunctionId,
        requestIndexResetter
      );

    // Update dapiLastUpdated timestamp
    adminToDapiLastUpdated[msg.sender] = uint64(block.timestamp);

    // Record the returned dapiId
    latestDapiId = newDapiId;

    // TODO: publish TemplateUpdated event?
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
