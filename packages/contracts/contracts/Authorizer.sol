// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;


/// @title An abstract contract that describes the general interface of an
/// authorizer contract
/// @notice This contract tells if a requester is authorized to call an
/// endpoint. The requester may need to prepay to subscribe to the endpoint
/// or go through KYC to get whitelisted. Each rule can be implemented as a
/// separate authorizer contract.
abstract contract Authorizer {
    /// Authorizer types can be identified by their authorizerType, yet all
    /// types have the same verifyAuthorization() interface.
    uint public authorizerType;

    /// @notice Verifies the authorization status of the requester for calling
    /// the endpoint according to this authorizer contract
    /// @param requester Requester contract address
    /// @param endpointId Endpoint ID from EndpointStorage
    /// @return status Authorization status of the requester for calling the
    /// endpoint according to this authorizer contract
    function verifyAuthorization(
        address requester,
        bytes32 endpointId
        )
        virtual
        external
        view
        returns (bool status);
}
