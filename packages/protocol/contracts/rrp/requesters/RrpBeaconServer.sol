// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../adminnable/Adminnable.sol";
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
/// The contract casts the timestamps to `uint32`, which means it will not work
/// work past-2038 in the current form. If this is an issue, consider casting
/// the timestamps to a larger type.
contract RrpBeaconServer is
    Adminnable,
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

    /// @notice Called to check if a sponsor has permitted an account to
    /// request updates at this contract
    mapping(address => mapping(address => bool))
        public
        override sponsorToUpdateRequesterToPermissionStatus;

    mapping(bytes32 => Beacon) private templateIdToBeacon;
    mapping(bytes32 => bytes32) private requestIdToTemplateId;

    /// @dev Reverts if the template with the ID is not created
    /// @param templateId Template ID
    modifier onlyIfTemplateExists(bytes32 templateId) {
        (address airnode, , ) = airnodeRrp.templates(templateId);
        require(airnode != address(0), "Template does not exist");
        _;
    }

    /// @param airnodeRrp_ Airnode RRP address
    constructor(address airnodeRrp_) RrpRequester(airnodeRrp_) {}

    /// @notice Called by the sponsor to set the update request permission
    /// status of an account
    /// @param updateRequester Update requester address
    /// @param status Update permission status of the update requester
    function setUpdatePermissionStatus(address updateRequester, bool status)
        external
        override
    {
        require(updateRequester != address(0), "Update requester zero");
        sponsorToUpdateRequesterToPermissionStatus[msg.sender][
            updateRequester
        ] = status;
        emit SetUpdatePermissionStatus(msg.sender, updateRequester, status);
    }

    /// @notice Called to request a beacon to be updated
    /// @dev There are two requirements for this method to be called: (1) The
    /// sponsor must call `setSponsorshipStatus()` of AirnodeRrp to sponsor
    /// this RrpBeaconServer contract, (2) The sponsor must call
    /// `setUpdatePermissionStatus()` of this RrpBeaconServer contract to give
    /// request update permission to the caller of this method.
    /// The template used here must specify a single point of data of type
    /// `int256` to be returned because this is what `fulfill()` expects.
    /// This point of data should be castable to `int224`.
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
            sponsorToUpdateRequesterToPermissionStatus[sponsor][msg.sender],
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
    /// @param data Fulfillment data (a single `int256` encoded as `bytes`)
    function fulfill(bytes32 requestId, bytes calldata data)
        external
        override
        onlyAirnodeRrp
    {
        bytes32 templateId = requestIdToTemplateId[requestId];
        require(templateId != bytes32(0), "No such request made");
        delete requestIdToTemplateId[requestId];
        int256 decodedData = abi.decode(data, (int256));
        require(
            decodedData >= type(int224).min && decodedData <= type(int224).max,
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
    }

    /// @notice Called by an admin to extend the whitelist expiration of a user
    /// for the beacon
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
        onlyWithRank(uint256(AdminRank.Admin))
        onlyIfTimestampExtends(templateId, user, expirationTimestamp)
        onlyIfTemplateExists(templateId)
    {
        serviceIdToUserToWhitelistStatus[templateId][user]
            .expirationTimestamp = expirationTimestamp;
        emit ExtendedWhitelistExpiration(
            templateId,
            user,
            msg.sender,
            expirationTimestamp
        );
    }

    /// @notice Called by a super admin to set the whitelisting expiration of a
    /// user for the beacon
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
        onlyWithRank(uint256(AdminRank.SuperAdmin))
        onlyIfTemplateExists(templateId)
    {
        serviceIdToUserToWhitelistStatus[templateId][user]
            .expirationTimestamp = expirationTimestamp;
        emit SetWhitelistExpiration(
            templateId,
            user,
            msg.sender,
            expirationTimestamp
        );
    }

    /// @notice Called by a super admin to set the whitelist status of a user
    /// past expiration for the beacon
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
        onlyWithRank(uint256(AdminRank.SuperAdmin))
        onlyIfTemplateExists(templateId)
    {
        serviceIdToUserToWhitelistStatus[templateId][user]
            .whitelistedPastExpiration = status;
        emit SetWhitelistStatusPastExpiration(
            templateId,
            user,
            msg.sender,
            status
        );
    }

    /// @notice Called to read the beacon
    /// @dev The caller must be whitelisted.
    /// If the `timestamp` of a beacon is zero, this means that it was never
    /// written to before, and the zero value in the `value` field is not
    /// valid. In general, make sure to check if the timestamp of the beacon is
    /// fresh enough, and definitely disregard beacons with zero `timestamp`.
    /// @param templateId Template ID whose beacon will be returned
    /// @return value Beacon value
    /// @return timestamp Beacon timestamp
    function readBeacon(bytes32 templateId)
        external
        view
        override
        returns (int224 value, uint32 timestamp)
    {
        require(
            userCanReadBeacon(templateId, msg.sender),
            "Caller not whitelisted"
        );
        Beacon storage beacon = templateIdToBeacon[templateId];
        return (beacon.value, beacon.timestamp);
    }

    /// @notice Called to check if a user is whitelisted to read the beacon
    /// @param templateId Template ID
    /// @param user User address
    /// @return isWhitelisted If the user is whitelisted
    function userCanReadBeacon(bytes32 templateId, address user)
        public
        view
        override
        onlyIfTemplateExists(templateId)
        returns (bool isWhitelisted)
    {
        return
            userIsWhitelisted(templateId, user) ||
            adminToRank[user] >= uint256(AdminRank.Admin) ||
            user == metaAdmin;
    }

    /// @notice Called to get the detailed whitelist status of a user for the
    /// beacon
    /// @param templateId Template ID
    /// @param user User address
    /// @return expirationTimestamp Timestamp at which the whitelisting of the
    /// user will expire
    /// @return whitelistedPastExpiration Whitelist status that the user will
    /// have past expiration
    function templateIdToUserToWhitelistStatus(bytes32 templateId, address user)
        external
        view
        override
        onlyIfTemplateExists(templateId)
        returns (uint64 expirationTimestamp, bool whitelistedPastExpiration)
    {
        WhitelistStatus
            storage whitelistStatus = serviceIdToUserToWhitelistStatus[
                templateId
            ][user];
        expirationTimestamp = whitelistStatus.expirationTimestamp;
        whitelistedPastExpiration = whitelistStatus.whitelistedPastExpiration;
    }
}
