// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

/// @title An abstract contract that describes the general interface of an
/// authorizer contract
/// @notice This contract tells if a request is authorized. The requester may
/// need to prepay to subscribe to the endpoint or go through KYC to get
/// whitelisted. Each rule can be implemented as a separate authorizer
/// contract.
abstract contract Authorizer {
    /// Authorizer types can be identified by their authorizerType, yet all
    /// types have the same verifyAuthorization() interface.
    uint public authorizerType;

    /// @notice Verifies the authorization status of a request according to
    /// this authorizer contract
    /// @param requestId Request ID
    /// @param providerId Provider ID from ProviderStore
    /// @param endpointId Endpoint ID from EndpointStore
    /// @param requesterInd Requester index from RequesterStore
    /// @param clientAddress Client address
    /// @return status Authorization status of the request
    function checkIfAuthorized(
        bytes32 requestId,
        bytes32 providerId,
        bytes32 endpointId,
        uint256 requesterInd,
        address clientAddress
        )
        virtual
        external
        view
        returns (bool status);
}
