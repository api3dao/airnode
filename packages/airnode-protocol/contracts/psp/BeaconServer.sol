// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../whitelist/Whitelist.sol";
import "../whitelist/WhitelistRolesWithManager.sol";
import "../rrp/requesters/RrpRequester.sol";
import "../rrp/requesters/interfaces/IRrpBeaconServer.sol";
import "./IAirnodePsp.sol";

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
/// work past-2106 in the current form. If this is an issue, consider casting
/// the timestamps to a larger type.
contract BeaconServer is
    Whitelist,
    WhitelistRolesWithManager,
    RrpRequester,
    IRrpBeaconServer
{
    struct Beacon {
        int224 value;
        uint32 timestamp;
    }

    address public immutable airnodePsp;

    mapping(bytes32 => uint256)
        public subscriptionIdToUpdatePercentageThreshold;

    /// @notice Returns if a sponsor has permitted an account to request
    /// updates at this contract
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

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    /// @param _airnodeRrp Airnode RRP contract address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager,
        address _airnodeRrp,
        address _airnodePsp
    )
        WhitelistRolesWithManager(
            _accessControlRegistry,
            _adminRoleDescription,
            _manager
        )
        RrpRequester(_airnodeRrp)
    {
        airnodePsp = _airnodePsp;
    }

    /// @notice Extends the expiration of the temporary whitelist of `reader`
    /// to be able to read the beacon with `templateId` if the sender has the
    /// whitelist expiration extender role
    /// @param templateId Template ID
    /// @param reader Reader address
    /// @param expirationTimestamp Timestamp at which the temporary whitelist
    /// will expire
    function extendWhitelistExpiration(
        bytes32 templateId,
        address reader,
        uint64 expirationTimestamp
    ) external override {
        require(
            hasWhitelistExpirationExtenderRoleOrIsManager(msg.sender),
            "Not expiration extender"
        );
        _extendWhitelistExpiration(templateId, reader, expirationTimestamp);
        emit ExtendedWhitelistExpiration(
            templateId,
            reader,
            msg.sender,
            expirationTimestamp
        );
    }

    /// @notice Sets the expiration of the temporary whitelist of `reader` to
    /// be able to read the beacon with `templateId` if the sender has the
    /// whitelist expiration setter role
    /// @param templateId Template ID
    /// @param reader Reader address
    /// @param expirationTimestamp Timestamp at which the temporary whitelist
    /// will expire
    function setWhitelistExpiration(
        bytes32 templateId,
        address reader,
        uint64 expirationTimestamp
    ) external override {
        require(
            hasWhitelistExpirationSetterRoleOrIsManager(msg.sender),
            "Not expiration setter"
        );
        _setWhitelistExpiration(templateId, reader, expirationTimestamp);
        emit SetWhitelistExpiration(
            templateId,
            reader,
            msg.sender,
            expirationTimestamp
        );
    }

    /// @notice Sets the indefinite whitelist status of `reader` to be able to
    /// read the beacon with `templateId` if the sender has the indefinite
    /// whitelister role
    /// @param templateId Template ID
    /// @param reader Reader address
    /// @param status Indefinite whitelist status
    function setIndefiniteWhitelistStatus(
        bytes32 templateId,
        address reader,
        bool status
    ) external override {
        require(
            hasIndefiniteWhitelisterRoleOrIsManager(msg.sender),
            "Not indefinite whitelister"
        );
        uint192 indefiniteWhitelistCount = _setIndefiniteWhitelistStatus(
            templateId,
            reader,
            status
        );
        emit SetIndefiniteWhitelistStatus(
            templateId,
            reader,
            msg.sender,
            status,
            indefiniteWhitelistCount
        );
    }

    /// @notice Revokes the indefinite whitelist status granted by a specific
    /// account that no longer has the indefinite whitelister role
    /// @param templateId Template ID
    /// @param reader Reader address
    /// @param setter Setter of the indefinite whitelist status
    function revokeIndefiniteWhitelistStatus(
        bytes32 templateId,
        address reader,
        address setter
    ) external override {
        require(
            !hasIndefiniteWhitelisterRoleOrIsManager(setter),
            "setter is indefinite whitelister"
        );
        (
            bool revoked,
            uint192 indefiniteWhitelistCount
        ) = _revokeIndefiniteWhitelistStatus(templateId, reader, setter);
        if (revoked) {
            emit RevokedIndefiniteWhitelistStatus(
                templateId,
                reader,
                setter,
                msg.sender,
                indefiniteWhitelistCount
            );
        }
    }

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
    /// This point of data must be castable to `int224`.
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
        (int256 decodedData, uint256 timestamp) = abi.decode(
            data,
            (int256, uint256)
        );
        require(
            decodedData >= type(int224).min && decodedData <= type(int224).max,
            "Value typecasting error"
        );
        require(timestamp <= type(uint32).max, "Timestamp typecasting error");
        require(block.timestamp - 1 hours < timestamp, "Fulfillment stale");
        require(
            templateIdToBeacon[templateId].timestamp < timestamp,
            "Fulfillment older than beacon"
        );
        templateIdToBeacon[templateId] = Beacon({
            value: int224(decodedData),
            timestamp: uint32(timestamp)
        });
        emit UpdatedBeacon(
            templateId,
            requestId,
            int224(decodedData),
            uint32(timestamp)
        );
    }

    function fulfillPsp(bytes32 subscriptionId, bytes calldata data) external {
        require(msg.sender == airnodePsp, "Sender not AirnodePsp");
        // require(condition(data), "Condition not met");

        (bytes32 templateId, , , , , , bytes memory parameters) = IAirnodePsp(
            airnodePsp
        ).subscriptions(subscriptionId);
        require(parameters.length == 0, "Subscription has parameters");

        (int256 decodedData, uint256 timestamp) = abi.decode(
            data,
            (int256, uint256)
        );
        require(
            decodedData >= type(int224).min && decodedData <= type(int224).max,
            "Value typecasting error"
        );
        require(timestamp <= type(uint32).max, "Timestamp typecasting error");
        require(block.timestamp - 1 hours < timestamp, "Fulfillment stale");
        require(
            templateIdToBeacon[templateId].timestamp < timestamp,
            "Fulfillment older than beacon"
        );
        templateIdToBeacon[templateId] = Beacon({
            value: int224(decodedData),
            timestamp: uint32(timestamp)
        });
        /*emit UpdatedBeacon(
            templateId,
            requestId,
            int224(decodedData),
            uint32(timestamp)
        );*/
    }

    function setUpdatePercentageThreshold(
        bytes32 subscriptionId,
        uint256 updatePercentageThreshold
    ) external {
        (, address sponsor, , , , , ) = IAirnodePsp(airnodePsp).subscriptions(
            subscriptionId
        );
        require(msg.sender == sponsor, "Sender not sponsor");
        subscriptionIdToUpdatePercentageThreshold[
            subscriptionId
        ] = updatePercentageThreshold;
    }

    function condition(bytes32 subscriptionId, bytes calldata data)
        external
        view
        returns (bool)
    {
        (bytes32 templateId, , , , , , bytes memory parameters) = IAirnodePsp(
            airnodePsp
        ).subscriptions(subscriptionId);
        require(parameters.length == 0, "Subscription has parameters");

        (int256 decodedData, ) = abi.decode(data, (int256, uint256));
        require(
            decodedData >= type(int224).min && decodedData <= type(int224).max,
            "Value typecasting error"
        );
        Beacon storage beacon = templateIdToBeacon[templateId];

        uint256 absoluteDelta = uint256(
            decodedData > beacon.value
                ? decodedData - beacon.value
                : beacon.value - decodedData
        );
        uint256 absoluteBeaconValue = uint256(int256(beacon.value));
        return
            (10**18 * absoluteDelta) / absoluteBeaconValue >
            subscriptionIdToUpdatePercentageThreshold[subscriptionId];
    }

    /// @notice Called to read the beacon
    /// @dev The caller must be whitelisted.
    /// If the `timestamp` of a beacon is zero, this means that it was never
    /// written to before, and the zero value in the `value` field is not
    /// valid. In general, make sure to check if the timestamp of the beacon is
    /// fresh enough, and definitely disregard beacons with zero `timestamp`.
    /// @param templateId Template ID of the beacon that will be returned
    /// @return value Beacon value
    /// @return timestamp Beacon timestamp
    function readBeacon(bytes32 templateId)
        external
        view
        override
        returns (int224 value, uint32 timestamp)
    {
        require(
            readerCanReadBeacon(templateId, msg.sender),
            "Caller not whitelisted"
        );
        Beacon storage beacon = templateIdToBeacon[templateId];
        return (beacon.value, beacon.timestamp);
    }

    /// @notice Called to check if a reader is whitelisted to read the beacon
    /// @param templateId Template ID
    /// @param reader Reader address
    /// @return isWhitelisted If the reader is whitelisted
    function readerCanReadBeacon(bytes32 templateId, address reader)
        public
        view
        override
        onlyIfTemplateExists(templateId)
        returns (bool)
    {
        return userIsWhitelisted(templateId, reader);
    }

    /// @notice Called to get the detailed whitelist status of the reader for
    /// the beacon
    /// @param templateId Template ID
    /// @param reader Reader address
    /// @return expirationTimestamp Timestamp at which the whitelisting of the
    /// reader will expire
    /// @return indefiniteWhitelistCount Number of times `reader` was
    /// whitelisted indefinitely for `templateId`
    function templateIdToReaderToWhitelistStatus(
        bytes32 templateId,
        address reader
    )
        external
        view
        override
        onlyIfTemplateExists(templateId)
        returns (uint64 expirationTimestamp, uint192 indefiniteWhitelistCount)
    {
        WhitelistStatus
            storage whitelistStatus = serviceIdToUserToWhitelistStatus[
                templateId
            ][reader];
        expirationTimestamp = whitelistStatus.expirationTimestamp;
        indefiniteWhitelistCount = whitelistStatus.indefiniteWhitelistCount;
    }

    /// @notice Returns if an account has indefinitely whitelisted the reader
    /// for the beacon
    /// @param templateId Template ID
    /// @param reader Reader address
    /// @param setter Address of the account that has potentially whitelisted
    /// the reader for the beacon indefinitely
    /// @return indefiniteWhitelistStatus If `setter` has indefinitely
    /// whitelisted reader for the beacon
    function templateIdToReaderToSetterToIndefiniteWhitelistStatus(
        bytes32 templateId,
        address reader,
        address setter
    ) external view override returns (bool indefiniteWhitelistStatus) {
        indefiniteWhitelistStatus = serviceIdToUserToSetterToIndefiniteWhitelistStatus[
            templateId
        ][reader][setter];
    }
}
