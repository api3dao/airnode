// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./AirnodeParameterStore.sol";
import "./TemplateStore.sol";
import "./interfaces/IConvenience.sol";

/// @title The contract that keeps the convenience methods that Airnodes use to
/// make batch calls
contract Convenience is AirnodeParameterStore, TemplateStore, IConvenience {
  /// @notice A convenience method for the Airnode to set its parameters
  /// and forward the remaining funds in the master wallet to the Airnode
  /// admin
  /// @param admin Airnode admin
  /// @param xpub Master public key of the Airnode
  /// @param authorizers Authorizer contract addresses of the Airnode
  /// @return airnodeId Airnode ID from AirnodeParameterStore
  function setAirnodeParametersAndForwardFunds(
    address admin,
    string calldata xpub,
    address[] calldata authorizers
  ) external payable override returns (bytes32 airnodeId) {
    airnodeId = setAirnodeParameters(admin, xpub, authorizers);
    if (msg.value > 0) {
      (bool success, ) = admin.call{ value: msg.value }(""); // solhint-disable-line
      require(success, "Transfer failed");
    }
  }

  /// @notice A convenience method to retrieve the Airnode parameters and
  /// the block number with a single call
  /// @param airnodeId Airnode ID from AirnodeParameterStore
  /// @return admin Airnode admin
  /// @return xpub Master public key of the Airnode
  /// @return authorizers Authorizer contract addresses of the Airnode
  /// @return blockNumber Block number
  function getAirnodeParametersAndBlockNumber(bytes32 airnodeId)
    external
    view
    override
    returns (
      address admin,
      string memory xpub,
      address[] memory authorizers,
      uint256 blockNumber
    )
  {
    AirnodeParameter storage airnodeParameter = airnodeParameters[airnodeId];
    admin = airnodeParameter.admin;
    xpub = airnodeParameter.xpub;
    authorizers = airnodeParameter.authorizers;
    blockNumber = block.number;
  }

  /// @notice A convenience method to retrieve multiple templates with a
  /// single call
  /// @dev If this reverts, Airnode will use getTemplate() to get the
  /// templates individually
  /// @param templateIds Request template IDs from TemplateStore
  /// @return airnodeIds Array of Airnode IDs from AirnodeParameterStore
  /// @return endpointIds Array of endpoint IDs from EndpointStore
  /// @return parameters Array of request parameters
  function getTemplates(bytes32[] calldata templateIds)
    external
    view
    override
    returns (
      bytes32[] memory airnodeIds,
      bytes32[] memory endpointIds,
      bytes[] memory parameters
    )
  {
    airnodeIds = new bytes32[](templateIds.length);
    endpointIds = new bytes32[](templateIds.length);
    parameters = new bytes[](templateIds.length);
    for (uint256 ind = 0; ind < templateIds.length; ind++) {
      Template storage template = templates[templateIds[ind]];
      airnodeIds[ind] = template.airnodeId;
      endpointIds[ind] = template.endpointId;
      parameters[ind] = template.parameters;
    }
  }

  /// @notice A convenience function to make multiple authorization status
  /// checks with a single call
  /// @dev If this reverts, Airnode will use checkAuthorizationStatus() to
  /// do the checks individually
  /// @param airnodeId Airnode ID from AirnodeParameterStore
  /// @param requestIds Request IDs
  /// @param endpointIds Endpoint IDs from EndpointStore
  /// @param requesterIndices Requester indices from RequesterStore
  /// @param designatedWallets Designated wallets
  /// @param clientAddresses Client addresses
  /// @return statuses Authorization statuses of the request
  function checkAuthorizationStatuses(
    bytes32 airnodeId,
    bytes32[] calldata requestIds,
    bytes32[] calldata endpointIds,
    uint256[] calldata requesterIndices,
    address[] calldata designatedWallets,
    address[] calldata clientAddresses
  ) external view override returns (bool[] memory statuses) {
    require(
      requestIds.length == endpointIds.length &&
        requestIds.length == requesterIndices.length &&
        requestIds.length == designatedWallets.length &&
        requestIds.length == clientAddresses.length,
      "Unequal parameter lengths"
    );
    statuses = new bool[](requestIds.length);
    for (uint256 ind = 0; ind < requestIds.length; ind++) {
      statuses[ind] = checkAuthorizationStatus(
        airnodeId,
        requestIds[ind],
        endpointIds[ind],
        requesterIndices[ind],
        designatedWallets[ind],
        clientAddresses[ind]
      );
    }
  }
}
