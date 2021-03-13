// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./IAuthorizer.sol";

interface IMasterAuthorizer is IAuthorizer {
    event MasterAdminshipTransferred(
        address previousMasterAdmin,
        address newMasterAdmin
        );
    event AdminParametersSet(
        address indexed adminAddress,
        bool status,
        uint256 maxWhitelistExtension
        );
    event AdminshipRenounced(address indexed adminAddress);
    event ClientWhitelistingExtended(
        bytes32 indexed airnodeId,
        address indexed clientAddress,
        uint256 whitelistExpiration,
        address indexed adminAddress
        );
    event RequesterWhitelistingExtended(
        bytes32 indexed airnodeId,
        uint256 indexed requesterIndex,
        uint256 whitelistExpiration,
        address indexed adminAddress
        );
    event ClientWhitelistExpirationSet(
        bytes32 indexed airnodeId,
        address indexed clientAddress,
        uint256 whitelistExpiration
        );
    event RequesterWhitelistExpirationSet(
        bytes32 indexed airnodeId,
        uint256 indexed requesterIndex,
        uint256 whitelistExpiration
        );

    function transferMasterAdminship(address _masterAdmin)
        external;

    function setAdminParameters(
        address adminAddress,
        bool status,
        uint256 maxWhitelistExtension
        )
        external;

    function renounceAdminship()
        external;

    function extendClientWhitelisting(
        bytes32 airnodeId,
        address clientAddress,
        uint256 whitelistExpiration
        )
        external;

    function extendRequesterWhitelisting(
        bytes32 airnodeId,
        uint256 requesterIndex,
        uint256 whitelistExpiration
        )
        external;

    function setClientWhitelistExpiration(
        bytes32 airnodeId,
        address clientAddress,
        uint256 whitelistExpiration
        )
        external;

    function setRequesterWhitelistExpiration(
        bytes32 airnodeId,
        uint256 requesterIndex,
        uint256 whitelistExpiration
        )
        external;
}
