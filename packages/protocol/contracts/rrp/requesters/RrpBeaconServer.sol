// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../adminnable/MetaAdminnable.sol";
import "../../adminnable/Whitelister.sol";
import "./RrpRequester.sol";
import "./interfaces/IRrpBeaconServer.sol";

/// @title The contract that serves beacons using Airnode RRP
/// @notice A beacon is a live data point associated with a template ID. This
/// is suitable where the more recent data point is always more favorable,
/// e.g., in the context of an asset price data feed. Another definition of
/// beacons are one-Airnode data feeds that can be used individually or
/// combined to build decentralized data feeds.
/// @dev This contract casts the reported data point to `int224`. If this is
/// a problem (because the reported data may not fit into 224 bits or it is of
/// a completely different type such as `bytes32`), do not use this contract
/// and implement a customized version instead.
contract RrpBeaconServer is
    MetaAdminnable,
    Whitelister,
    RrpRequester,
    IRrpBeaconServer
{
    enum AdminRank {
        Unauthorized,
        Admin,
        SuperAdmin
    }

    struct Beacon {
        int224 value;
        uint32 timestamp;
    }

    mapping(address => mapping(address => bool))
        public
        override sponsorToUpdateRequesterToPermissonStatus;

    mapping(bytes32 => Beacon) private templateIdToBeacon;
    mapping(bytes32 => bytes32) private requestIdToTemplateId;

    /// @param airnodeRrp_ Airnode RRP address
    /// @param metaAdmin_ Initial metaAdmin
    constructor(address airnodeRrp_, address metaAdmin_)
        RrpRequester(airnodeRrp_)
        MetaAdminnable(metaAdmin_)
    {}

    /// @notice Called by the sponsor to set the update request permission
    /// status of an account
    /// @param updateRequester Update requester address
    /// @param updatePermissionStatus Update permission status of the update
    /// requester
    function setUpdatePermissionStatus(
        address updateRequester,
        bool updatePermissionStatus
    ) external override {
        require(updateRequester != address(0), "updateRequester address zero");
        sponsorToUpdateRequesterToPermissonStatus[msg.sender][
            updateRequester
        ] = updatePermissionStatus;
        emit SetUpdatePermissionStatus(
            msg.sender,
            updateRequester,
            updatePermissionStatus
        );
    }

    /// @notice Called to request a beacon to be updated
    /// @dev Anyone can request a beacon to be updated. This is because it is
    /// assumed that a beacon update request is always desirable, and the
    /// requester and sponsor will pay for the gas cost.
    /// There are two requirements for this method to be called: (1) The
    /// sponsor must call `setSponsorshipStatus()` of AirnodeRrp to sponsor
    /// this RrpBeaconServer contract, (2) The sponsor must call
    /// `setUpdatePermissionStatus()` of this RrpBeaconServer contract to give
    /// request update permission to the caller of this method.
    /// The template used here must specify a single point of data of type
    /// `int256` to be returned (because this is what `fulfill()` expects).
    /// @param templateId Template ID of the beacon to be updated
    /// @param sponsor Sponsor whose wallet will be used to fulfill this
    /// request
    /// @param sponsorWallet Sponsor wallet that will be used to fulfill this
    /// request
    function requestBeaconUpdate(
        bytes32 templateId,
        address sponsor,
        address sponsorWallet
    ) external override {
        require(
            sponsorToUpdateRequesterToPermissonStatus[sponsor][msg.sender],
            "Caller not permitted"
        );
        bytes32 requestId = airnodeRrp.makeTemplateRequest(
            templateId,
            sponsor,
            sponsorWallet,
            address(this),
            this.fulfill.selector,
            ""
        );
        requestIdToTemplateId[requestId] = templateId;
        emit RequestedBeaconUpdate(
            templateId,
            sponsor,
            msg.sender,
            requestId,
            sponsorWallet
        );
    }

    /// @notice Called by AirnodeRrp to fulfill the request
    /// @dev It is assumed that the fulfillment will be made with a single
    /// point of data of type `int256`
    /// @param requestId ID of the request being fulfilled
    /// @param statusCode Status code of the fulfillment
    /// @param data Fulfillment data (a single `int256` encoded as `bytes`)
    function fulfill(
        bytes32 requestId,
        uint256 statusCode,
        bytes calldata data
    ) external override onlyAirnodeRrp {
        bytes32 templateId = requestIdToTemplateId[requestId];
        require(templateId != bytes32(0), "request ID unknown");
        delete requestIdToTemplateId[requestId];
        if (statusCode == 0) {
            int256 decodedData = abi.decode(data, (int256));
            require(
                decodedData >= type(int224).min &&
                    decodedData <= type(int224).max,
                "Value typecasting error"
            );
            require(
                block.timestamp <= type(uint32).max,
                "Timestamp typecasting error"
            );
            templateIdToBeacon[templateId] = Beacon({
                value: int224(decodedData),
                timestamp: uint32(block.timestamp)
            });
            emit UpdatedBeacon(
                templateId,
                requestId,
                int224(decodedData),
                uint32(block.timestamp)
            );
        } else {
            emit ErroredBeaconUpdate(templateId, requestId, statusCode);
        }
    }

    /// @notice Called to read the beacon
    /// @dev The caller must be whitelisted
    /// @param templateId Template ID whose beacon will be returned
    /// @return value Beacon value
    /// @return timestamp Beacon timestamp
    function readBeacon(bytes32 templateId)
        external
        view
        override
        onlyIfCallerIsWhitelisted(templateId)
        returns (int224 value, uint32 timestamp)
    {
        Beacon storage beacon = templateIdToBeacon[templateId];
        return (beacon.value, beacon.timestamp);
    }

    /// @notice Called by an admin to extend the whitelist expiration of a user
    /// @param templateId Template ID
    /// @param user User address
    /// @param expirationTimestamp Timestamp at which the user will no longer
    /// be whitelisted
    function extendWhitelistExpiration(
        bytes32 templateId,
        address user,
        uint64 expirationTimestamp
    )
        external
        override
        onlyWithRank(bytes32(0), uint256(AdminRank.Admin))
        onlyIfTimestampExtends(templateId, user, expirationTimestamp)
    {
        serviceIdToUserToWhitelistStatus[templateId][user]
            .expirationTimestamp = expirationTimestamp;
        emit ExtendedWhitelistExpiration(
            templateId,
            user,
            expirationTimestamp,
            msg.sender
        );
    }

    /// @notice Called by a super admin to set the whitelisting expiration of a
    /// user
    /// @dev Unlike `extendWhitelistExpiration()`, this can hasten expiration
    /// @param templateId Template ID
    /// @param user User address
    /// @param expirationTimestamp Timestamp at which the whitelisting of the
    /// user will expire
    function setWhitelistExpiration(
        bytes32 templateId,
        address user,
        uint64 expirationTimestamp
    )
        external
        override
        onlyWithRank(bytes32(0), uint256(AdminRank.SuperAdmin))
    {
        serviceIdToUserToWhitelistStatus[templateId][user]
            .expirationTimestamp = expirationTimestamp;
        emit SetWhitelistExpiration(
            templateId,
            user,
            expirationTimestamp,
            msg.sender
        );
    }

    /// @notice Called by a super admin to set the whitelist status of a user
    /// past expiration
    /// @param templateId Template ID
    /// @param user User address
    /// @param status Whitelist status that the user will have past expiration
    function setWhitelistStatusPastExpiration(
        bytes32 templateId,
        address user,
        bool status
    )
        external
        override
        onlyWithRank(bytes32(0), uint256(AdminRank.SuperAdmin))
    {
        serviceIdToUserToWhitelistStatus[templateId][user]
            .whitelistedPastExpiration = status;
        emit SetWhitelistStatusPastExpiration(
            templateId,
            user,
            status,
            msg.sender
        );
    }

    /// @notice Called to get the rank of an admin for an adminned entity
    /// @dev Explictly specifies the overriding `getRank()` implementation
    /// @param adminnedId ID of the entity being adminned
    /// @param admin Admin address whose rank will be returned
    /// @return Admin rank for the adminned entity
    function getRank(bytes32 adminnedId, address admin)
        public
        view
        virtual
        override(MetaAdminnable, IRankedAdminnable)
        returns (uint256)
    {
        return MetaAdminnable.getRank(adminnedId, admin);
    }
}
