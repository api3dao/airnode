// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./IAuthorizer.sol";

interface ISelfAuthorizer is IAuthorizer {
    event AdminParametersSet(
        bytes32 indexed providerId,
        address indexed adminAddress,
        bool status,
        uint256 maxWhitelistExtension
        );
    event AdminshipRenounced(
        bytes32 indexed providerId,
        address indexed adminAddress
        );
    event ClientWhitelistingExtended(
        bytes32 indexed providerId,
        address indexed clientAddress,
        uint256 whitelistExpiration,
        address indexed adminAddress
        );
    event RequesterWhitelistingExtended(
        bytes32 indexed providerId,
        uint256 indexed requesterIndex,
        uint256 whitelistExpiration,
        address indexed adminAddress
        );
    event ClientWhitelistExpirationSet(
        bytes32 indexed providerId,
        address indexed clientAddress,
        uint256 whitelistExpiration
        );
    event RequesterWhitelistExpirationSet(
        bytes32 indexed providerId,
        uint256 indexed requesterIndex,
        uint256 whitelistExpiration
        );

    function setAdminParameters(
        bytes32 providerId,
        address adminAddress,
        bool status,
        uint256 maxWhitelistExtension
        )
        external;

    function renounceAdminship(bytes32 providerId)
        external;

    function extendClientWhitelisting(
        bytes32 providerId,
        address clientAddress,
        uint256 whitelistExpiration
        )
        external;

    function extendRequesterWhitelisting(
        bytes32 providerId,
        uint256 requesterIndex,
        uint256 whitelistExpiration
        )
        external;

    function setClientWhitelistExpiration(
        bytes32 providerId,
        address clientAddress,
        uint256 whitelistExpiration
        )
        external;

    function setRequesterWhitelistExpiration(
        bytes32 providerId,
        uint256 requesterIndex,
        uint256 whitelistExpiration
        )
        external;
}
