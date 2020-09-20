// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./IProviderStore.sol";


interface IEndpointStore is IProviderStore {
    event EndpointCreated(
        bytes32 indexed endpointId,
        bytes32 providerId,
        bytes32 apiId,
        address[] authorizers
        );

    event EndpointUpdated(
        bytes32 indexed endpointId,
        bytes32 apiId,
        address[] authorizers
        );

    function createEndpoint(
        bytes32 providerId,
        bytes32 apiId,
        address[] calldata authorizers
        )
        external
        returns(bytes32 endpointId);

    function updateEndpoint(
        bytes32 endpointId,
        bytes32 apiId,
        address[] calldata authorizers
        )
        external;

    function getEndpoint(bytes32 endpointId)
        external
        view
        returns(
            bytes32 providerId,
            bytes32 apiId,
            address[] memory authorizers
        );

    function checkAuthorizationStatus(
        bytes32 endpointId,
        address clientAddress
        )
        external
        view
        returns(bool status);
}
