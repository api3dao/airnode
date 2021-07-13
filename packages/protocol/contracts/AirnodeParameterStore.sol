// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./RequesterStore.sol";
import "./interfaces/IAirnodeParameterStore.sol";
import "./authorizers/interfaces/IRrpAuthorizer.sol";

/// @title The contract where the Airnode parameters are stored
contract AirnodeParameterStore is Ownable, RequesterStore, IAirnodeParameterStore {
  struct AirnodeParameter {
    address admin;
    string xpub;
    address[] authorizers;
  }

  address[] public defaultAuthorizers;
  mapping(bytes32 => AirnodeParameter) internal airnodeParameters;
  mapping(bytes32 => bytes32) private withdrawalRequestIdToParameters;

  function setDefaultAuthorizers(address[] memory _defaultAuthorizers) external onlyOwner {
    defaultAuthorizers = _defaultAuthorizers;
    emit SetDefaultAuthorizers(_defaultAuthorizers);
  }

  /// @notice Allows the master wallet (m) of the Airnode to set its
  /// parameters on this chain
  /// @dev This method can also be used to update `admin`, `xpub` and/or
  /// `authorizers`.
  /// `admin` is not used in the protocol contracts. It is intended to
  /// potentially be referred to in authorizer contracts.
  /// Note that the Airnode can announce an incorrect `xpub`. However, the
  /// mismatch between it and the airnodeId can be detected off-chain.
  /// This needs to be payable to be callable by
  /// setAirnodeParametersAndForwardFunds().
  /// @param xpub Master public key of the Airnode
  /// @param authorizers Authorizer contract addresses of the Airnode
  /// @return airnodeId Airnode ID
  function setAirnodeParameters(string calldata xpub, address[] calldata authorizers)
    public
    payable
    override
    returns (bytes32 airnodeId)
  {
    airnodeId = keccak256(abi.encode(msg.sender));
    airnodeParameters[airnodeId] = AirnodeParameter({ admin: msg.sender, xpub: xpub, authorizers: authorizers });
    emit AirnodeParametersSet(airnodeId, msg.sender, xpub, authorizers);
  }

  /// @notice Called by the requester admin to create a request for the
  /// Airnode to send the funds kept in their designated wallet to the
  /// destination
  /// @dev We do not need to use the withdrawal request parameters in the
  /// request ID hash to validate them at the node side because all of the
  /// parameters are used during fulfillment and will get validated on-chain
  /// @param airnodeId Airnode ID
  /// @param requesterIndex Requester index from RequesterStore
  /// @param designatedWallet Designated wallet that the withdrawal is
  /// requested from
  /// @param destination Withdrawal destination
  function requestWithdrawal(
    bytes32 airnodeId,
    uint256 requesterIndex,
    address designatedWallet,
    address destination
  ) external override onlyRequesterAdmin(requesterIndex) {
    bytes32 withdrawalRequestId = keccak256(
      abi.encodePacked(requesterIndexToNextWithdrawalRequestIndex[requesterIndex]++, block.chainid, requesterIndex)
    );
    bytes32 withdrawalParameters = keccak256(
      abi.encodePacked(airnodeId, requesterIndex, designatedWallet, destination)
    );
    withdrawalRequestIdToParameters[withdrawalRequestId] = withdrawalParameters;
    emit WithdrawalRequested(airnodeId, requesterIndex, withdrawalRequestId, designatedWallet, destination);
  }

  /// @notice Called by the Airnode using the designated wallet to
  /// fulfill the withdrawal request made by the requester
  /// @dev The Airnode sends the funds through this method to emit an
  /// event that indicates that the withdrawal request has been fulfilled
  /// @param airnodeId Airnode ID
  /// @param requesterIndex Requester index from RequesterStore
  /// @param destination Withdrawal destination
  function fulfillWithdrawal(
    bytes32 withdrawalRequestId,
    bytes32 airnodeId,
    uint256 requesterIndex,
    address destination
  ) external payable override {
    bytes32 withdrawalParameters = keccak256(abi.encodePacked(airnodeId, requesterIndex, msg.sender, destination));
    require(withdrawalRequestIdToParameters[withdrawalRequestId] == withdrawalParameters, "No such withdrawal request");
    delete withdrawalRequestIdToParameters[withdrawalRequestId];
    emit WithdrawalFulfilled(airnodeId, requesterIndex, withdrawalRequestId, msg.sender, destination, msg.value);
    (bool success, ) = destination.call{ value: msg.value }(""); // solhint-disable-line
    require(success, "Transfer failed");
  }

  /// @notice Uses the authorizer contracts of an Airnode to decide if a
  /// request is authorized. Once an Airnode receives a request, it calls
  /// this method to determine if it should respond. Similarly, third parties
  /// can use this method to determine if a particular request would be
  /// authorized.
  /// @dev This method is meant to be called off-chain by the Airnode to
  /// decide if it should respond to a request. The requester can also call
  /// it, yet this function returning true should not be taken as a guarantee
  /// of the subsequent call request being fulfilled (as the Airnode may
  /// update its authorizers in the meantime).
  /// The Airnode authorizers being empty means all requests will be denied,
  /// while any `address(0)` authorizer means all requests will be accepted.
  /// @param airnodeId Airnode ID from AirnodeParameterStore
  /// @param requestId Request ID
  /// @param endpointId Endpoint ID from EndpointStore
  /// @param requesterIndex Requester index from RequesterStore
  /// @param designatedWallet Designated wallet
  /// @param clientAddress Client address
  /// @return status Authorization status of the request
  function checkAuthorizationStatus(
    bytes32 airnodeId,
    bytes32 requestId,
    bytes32 endpointId,
    uint256 requesterIndex,
    address designatedWallet,
    address clientAddress
  ) public view override returns (bool status) {
    address[] memory authorizerAddresses = airnodeParameters[airnodeId].authorizers;
    uint256 noAuthorizers = authorizerAddresses.length;
    if (noAuthorizers == 0) {
      authorizerAddresses = defaultAuthorizers;
      noAuthorizers = defaultAuthorizers.length;
    }
    for (uint256 ind = 0; ind < noAuthorizers; ind++) {
      address authorizerAddress = authorizerAddresses[ind];
      if (authorizerAddress == address(0)) {
        return true;
      }
      IRrpAuthorizer authorizer = IRrpAuthorizer(authorizerAddress);
      if (authorizer.isAuthorized(requestId, airnodeId, endpointId, requesterIndex, designatedWallet, clientAddress)) {
        return true;
      }
    }
    return false;
  }

  /// @notice Retrieves the parameters of the Airnode addressed by the ID
  /// @param airnodeId Airnode ID
  /// @return admin Airnode admin
  /// @return xpub Master public key of the Airnode
  /// @return authorizers Authorizer contract addresses of the Airnode
  function getAirnodeParameters(bytes32 airnodeId)
    external
    view
    override
    returns (
      address admin,
      string memory xpub,
      address[] memory authorizers
    )
  {
    AirnodeParameter storage airnodeParameter = airnodeParameters[airnodeId];
    admin = airnodeParameter.admin;
    xpub = airnodeParameter.xpub;
    authorizers = airnodeParameter.authorizers;
  }
}
