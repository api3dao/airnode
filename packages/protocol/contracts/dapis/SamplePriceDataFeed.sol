// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./interfaces/IRrpDapiServer.sol";
import "./Api3Adminship.sol";

/// @title A sample price data feed implemented as a dAPI client
contract SamplePriceDataFeed is Api3Adminship {
  IRrpDapiServer public rrpDapiServer;

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

  event DapiChanged(bytes16 dapiId);

  /**  @dev Deployer should deploy the contract using their personal wallet, setting himself as the meta admin.
   Then he would give the multisig adminship, then he would transfer the meta adminship to the DAO.
   Then it's verified that it's set up correctly and then it starts being used.
   */
  constructor(address _rrpDapiServer, address _metaAdmin) Api3Adminship(_metaAdmin) {
    require(_rrpDapiServer != address(0), "Zero address");
    rrpDapiServer = IRrpDapiServer(_rrpDapiServer);
  }

  /**
  @notice Stores dAPI id
  @dev Sets dAPI id to the latestDapiId state var and also adds current block timestamp to the adminToDapiLastUpdated mapping
  @param _dapiId the dAPI id
 */
  function setDapiId(bytes16 _dapiId) public onlyAdminOrMetaAdmin cooldownTimeEnded {
    latestDapiId = _dapiId;
    adminToDapiLastUpdated[msg.sender] = uint64(block.timestamp);
    emit DapiChanged(_dapiId);
  }

  /**
  @notice Updates the templateIds
  @dev A new dAPI is registered in the RrpDapiServer using same values of the dAPI fetched by id
  but with new values coming in as args for the templateIds and designatedWallets arrays 
  @param _dapiId dAPI id
  @param _templateIds modified list of templateIds
  @param _dapiId modified list of designatedWallet addresses
 */
  function updateDapiTemplateIds(
    bytes16 _dapiId,
    bytes32[] calldata _templateIds,
    address[] calldata _designatedWallets
  ) external onlyAdminOrMetaAdmin cooldownTimeEnded {
    // Fetches current dAPI parameters from RrpDapiServer
    (
      bytes32[] memory templateIds,
      address[] memory designatedWallets,
      uint256 noResponsesToReduce,
      uint256 toleranceInPercentages,
      uint256 requesterIndex,
      address reduceAddress,
      bytes4 reduceFunctionId,
      address requestIndexResetter
    ) = rrpDapiServer.getDapi(_dapiId);

    // Check templateIds and/or designatedWallets are different
    require(
      keccak256(abi.encodePacked(templateIds, designatedWallets)) !=
        keccak256(abi.encodePacked(_templateIds, _designatedWallets)),
      "templateIds and/or designatedWallets must be different"
    );

    // Calls RrpDapiServer to add a new dAPI
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

    setDapiId(newDapiId);
  }

  function makeDapiRequest() external onlyAdminOrMetaAdmin {
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
