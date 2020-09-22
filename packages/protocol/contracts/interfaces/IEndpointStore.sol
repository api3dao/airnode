// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./IProviderStore.sol";


interface IEndpointStore is IProviderStore {
    event EndpointUpdated(
        bytes32 indexed providerId,
        bytes32 indexed endpointId,
        address[] authorizers
        );

    function updateEndpointAuthorizers(
        bytes32 providerId,
        bytes32 endpointId,
        address[] calldata authorizers
        )
        external;

    function getEndpointAuthorizers(
        bytes32 providerId,
        bytes32 endpointId
        )
        external
        view
        returns(address[] memory authorizers);

    function checkAuthorizationStatus(
        bytes32 providerId,
        bytes32 endpointId,
        uint256 requesterInd,
        address clientAddress
        )
        external
        view
        returns(bool status);
}
