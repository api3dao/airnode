// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./RrpDapiServer.sol";
import "./Api3Adminship.sol";

import "hardhat/console.sol";

// A sample price data feed implemented as a dAPI client
contract SamplePriceDataFeed is Api3Adminship {
  RrpDapiServer public rrpDapiServer;

  bytes16 public latestDapiId;
  int256 public latestAnswer;

  uint256 public cooldownTime = 1 days; // TODO: is this the right value?
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

  function addTemplate(
    bytes16 _dapiId,
    bytes32 _templateId,
    address _designatedWallet
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

    // Adds templateId to dAPI.templateIds (iterating over because array push() is only available in storage arrays)
    // Also add _designatedWallet to dAPI.designatedWallets
    bytes32[] memory newTemplateIds = new bytes32[](templateIds.length + 1);
    address[] memory newDesignatedWallets = new address[](designatedWallets.length + 1);
    for (uint256 i; i < templateIds.length; i++) {
      newTemplateIds[i] = templateIds[i];
      newDesignatedWallets[i] = designatedWallets[i];
    }
    newTemplateIds[newTemplateIds.length - 1] = _templateId;
    newDesignatedWallets[newDesignatedWallets.length - 1] = _designatedWallet;

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

    _setDapiId(newDapiId);
  }

  function removeTemplate(bytes16 _dapiId, bytes32 _templateId) external onlyAdminOrMetaAdmin cooldownTimeEnded {
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

    // Removes templateId from dAPI.templateIds
    // Also removes designatedWallet from dAPI.designatedWallets
    // bool found = false;
    // bytes32[] memory newTemplateIds = new bytes32[](templateIds.length - 1);
    // address[] memory newDesignatedWallets = new address[](designatedWallets.length - 1);
    // for (uint256 i; i < templateIds.length; i++) {
    //   // copy array without _templateId
    //   if (templateIds[i] == _templateId) {
    //     found = true;
    //   }
    //   uint256 j = found ? i + 1 : i;
    //   if (i != templateIds.length - 1) {
    //     newTemplateIds[i] = templateIds[j];
    //     newDesignatedWallets[i] = designatedWallets[j];
    //   }
    // }
    (uint256 index, bool found) = rrpDapiServer.getTemplateIdIndex(_dapiId, _templateId);
    if (!found) {
      revert("TemplateId was not found");
    }
    // Memory arrays cannot be resized anymore so we just set it's value to default at index
    delete templateIds[index];
    delete designatedWallets[index];

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

    _setDapiId(newDapiId);
  }

  function updateTemplate(
    bytes16 _dapiId,
    bytes32 _templateId1,
    bytes32 _templateId2,
    address _designatedWallet
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

    // Updates templateId1 with templateId2 in dAPI.templateIds
    // Also updates templatedId1 associated designatedWallet in dAPI.designatedWallets
    // bool found = false;
    // for (uint256 i; i < templateIds.length; i++) {
    //   // update_templateId1 with _templateId2
    //   if (templateIds[i] == _templateId1) {
    //     templateIds[i] = _templateId2;
    //     designatedWallets[i] = _designatedWallet;
    //     found = true;
    //     break;
    //   }
    // }
    (uint256 index, bool found) = rrpDapiServer.getTemplateIdIndex(_dapiId, _templateId1);
    // console.log("index: %d", index);
    if (!found) {
      revert("TemplateId was not found");
    }
    templateIds[index] = _templateId2;
    designatedWallets[index] = _designatedWallet;

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
