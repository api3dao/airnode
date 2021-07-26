// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./interfaces/IConvenienceUtils.sol";
import "./authorizers/interfaces/IRrpAuthorizer.sol";

/// @title Contract that implements convenience functions
contract ConvenienceUtils is IConvenienceUtils {
    mapping(address => string) private airnodeToPublicKey;
    mapping(address => address[]) private airnodeToAuthorizers;

    /// @notice Called by the Airnode operator to set it's public key
    /// @dev It is expected for the Airnode operator to call this function with
    /// the respective Airnode's default BIP 44 wallet (m/44'/60'/0'/0/0).
    /// This public key set does not need to be made for the protocol to be used,
    /// it is mainly for convenience.
    /// @param xpub Extended public key of the Airnode
    function setAirnodePublicKey(string calldata xpub) external override {
        airnodeToPublicKey[msg.sender] = xpub;
        emit SetAirnodePublicKey(msg.sender, xpub);
    }

    /// @notice Called by the Airnode operator to set authorizers
    /// @dev It is expected for the Airnode operator to call this function with
    /// the respective Airnode's default BIP 44 wallet (m/44'/60'/0'/0/0).
    /// This authorizers set does not need to be made for the protocol to be used,
    /// it is mainly for convenience. This is only to allow the Airnode operator
    /// to announce the authorizers it will be using. It is a trusted on-chain
    /// announcement similar to xpub.
    /// @param authorizers Authorizer contract addresses that Airnode uses
    function setAirnodeAuthorizers(address[] calldata authorizers)
        external
        override
    {
        airnodeToAuthorizers[msg.sender] = authorizers;
        emit SetAirnodeAuthorizers(msg.sender, authorizers);
    }

    /// @notice Called to get the Airnode public key
    /// @dev The information announced with this function is not trustless.
    /// It is up to the user to verify that the announced `xpub` is correct by
    /// checking if its default BIP 44 wallet matches the Airnode address.
    /// @param airnode Airnode address
    /// @return xpub Extended public key of the Airnode
    function getAirnodePublicKey(address airnode)
        external
        view
        override
        returns (string memory xpub)
    {
        return airnodeToPublicKey[airnode];
    }

    /// @notice Called to get the Airnode authorizers
    /// @dev The information announced with this function is not trustless.
    /// It is not possible to verify the correctness of `authorizers` (i.e.,
    /// that the Airnode will use these contracts to check for authorization).
    /// @param airnode Airnode address
    /// @return authorizers Authorizer contract addresses
    function getAirnodeAuthorizers(address airnode)
        external
        view
        override
        returns (address[] memory authorizers)
    {
        return airnodeToAuthorizers[airnode];
    }

    /// @notice Uses the authorizer contracts of an Airnode to decide if a
    /// request is authorized. Once an Airnode receives a request, it calls
    /// this method to determine if it should respond. Similarly, third parties
    /// can use this method to determine if a particular request would be
    /// authorized.
    /// @dev This method is meant to be called off-chain by the Airnode to
    /// decide if it should respond to a request. The requester can also call
    /// it, yet this function returning true should not be taken as a guarantee
    /// of the subsequent request being fulfilled.
    /// It is enough for only one of the authorizer contracts to return true
    /// for the request to be authorized.
    /// @param authorizers Authorizer contract addresses
    /// @param airnode Airnode address
    /// @param requestId Request ID
    /// @param endpointId Endpoint ID
    /// @param sponsor Sponsor address
    /// @param requester Requester address
    /// @return status Authorization status of the request
    function checkAuthorizationStatus(
        address[] calldata authorizers,
        address airnode,
        bytes32 requestId,
        bytes32 endpointId,
        address sponsor,
        address requester
    ) public view override returns (bool status) {
        for (uint256 ind = 0; ind < authorizers.length; ind++) {
            IRrpAuthorizer authorizer = IRrpAuthorizer(authorizers[ind]);
            if (
                authorizer.isAuthorized(
                    requestId,
                    airnode,
                    endpointId,
                    sponsor,
                    requester
                )
            ) {
                return true;
            }
        }
        return false;
    }

    /// @notice A convenience function to make multiple authorization status
    /// checks with a single call
    /// @param airnode Airnode address
    /// @param requestIds Request IDs
    /// @param endpointIds Endpoint IDs
    /// @param sponsors Sponsor addresses
    /// @param requesters Requester addresses
    /// @return statuses Authorization statuses of the request
    function checkAuthorizationStatuses(
        address[] calldata authorizers,
        address airnode,
        bytes32[] calldata requestIds,
        bytes32[] calldata endpointIds,
        address[] calldata sponsors,
        address[] calldata requesters
    ) external view override returns (bool[] memory statuses) {
        require(
            requestIds.length == endpointIds.length &&
                requestIds.length == sponsors.length &&
                requestIds.length == requesters.length,
            "Unequal parameter lengths"
        );
        statuses = new bool[](requestIds.length);
        for (uint256 ind = 0; ind < requestIds.length; ind++) {
            statuses[ind] = checkAuthorizationStatus(
                authorizers,
                airnode,
                requestIds[ind],
                endpointIds[ind],
                sponsors[ind],
                requesters[ind]
            );
        }
    }
}
