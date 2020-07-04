// SPDX-License-Identifier: MIT
pragma solidity 0.6.9;

import "../Authorizer.sol";


/// @title A mock authorizer contract
/// @notice Use this to simulate an authorizer
contract MockAuthorizer is Authorizer {
    bool private status;

    /// @notice Updates authorization status
    /// @param status_ Updated authorization status
    function updateAuthorization(bool status_)
        external
    {
        status = status_;
    }

    /// @notice Returns status as the authorization status
    /// @param requester Requester contract address (not used in mock)
    /// @param endpointId Endpoint ID (not used in mock)
    /// @return status
    function verifyAuthorization(
        address requester,
        bytes32 endpointId
        )
        external
        view
        override
        returns (bool)
    {
        return status;
    }
}
