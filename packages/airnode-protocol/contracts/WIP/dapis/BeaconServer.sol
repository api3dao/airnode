// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../whitelist/WhitelistWithManager.sol";
import "../AirnodeRequester.sol";
import "./interfaces/IBeaconServer.sol";

/// @title Contract that serves beacons using the Airnode protocol
/// @notice A beacon is a live data point associated with a beacon ID, which is
/// derived from a template ID and additional parameters. This is suitable
/// where the more recent data point is always more favorable, e.g., in the
/// context of an asset price data feed. Another definition of beacons are
/// one-Airnode data feeds that can be used individually or combined to build
/// dAPIs.
/// @dev This contract casts the reported data point to `int224`. If this is
/// a problem (because the reported data may not fit into 224 bits or it is of
/// a completely different type such as `bytes32`), do not use this contract
/// and implement a customized version instead.
/// The contract casts the timestamps to `uint32`, which means it will not work
/// work past-2106 in the current form. If this is an issue, consider casting
/// the timestamps to a larger type.
contract BeaconServer is WhitelistWithManager, AirnodeRequester, IBeaconServer {
    struct Beacon {
        int224 value;
        uint32 timestamp;
    }

    /// @notice Description of the unlimited reader role
    string public constant override UNLIMITED_READER_ROLE_DESCRIPTION =
        "Unlimited reader";

    /// @notice Unlimited reader role
    bytes32 public immutable override unlimitedReaderRole;

    /// @notice Called to check if a sponsor has permitted an account to
    /// request updates at this contract
    mapping(address => mapping(address => bool))
        public
        override sponsorToUpdateRequesterToPermissionStatus;

    mapping(bytes32 => Beacon) private beacons;

    mapping(bytes32 => bytes32) private requestIdToBeaconId;

    /// @dev Reverts if the sender is not permitted to request an update with
    /// the sponsor or is not the sponsor
    /// @param sponsor Sponsor address
    modifier onlyPermittedUpdateRequester(address sponsor) {
        require(
            sponsor == msg.sender ||
                sponsorToUpdateRequesterToPermissionStatus[sponsor][msg.sender],
            "Sender not permitted"
        );
        _;
    }

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    /// @param _airnodeProtocol Airnode protocol contract address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager,
        address _airnodeProtocol
    )
        WhitelistWithManager(
            _accessControlRegistry,
            _adminRoleDescription,
            _manager
        )
        AirnodeRequester(_airnodeProtocol)
    {
        unlimitedReaderRole = _deriveRole(
            _deriveAdminRole(manager),
            keccak256(abi.encodePacked(UNLIMITED_READER_ROLE_DESCRIPTION))
        );
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

    /// @notice Called to update a beacon using data signed by the respective
    /// Airnode
    /// @param templateId Template ID
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    /// @param timestamp Timestamp used in the signature
    /// @param data Response data (a single `int256` encoded as `bytes`)
    /// @param signature Request hash, a timestamp and the response data signed
    /// by the Airnode address
    function updateBeaconWithoutRequest(
        bytes32 templateId,
        bytes calldata parameters,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external override onlyFreshTimestamp(timestamp) {
        (, bytes32 beaconId) = IAirnodeProtocolV1(airnodeProtocol)
            .verifySignature(
                templateId,
                parameters,
                timestamp,
                data,
                signature
            );
        int256 decodedData = ingestData(beaconId, timestamp, data);
        emit UpdatedBeaconWithoutRequest(beaconId, decodedData, timestamp);
    }

    /// @notice Called to request a beacon to be updated
    /// @dev There are two requirements for this method to be called: (1) The
    /// sponsor must call `setSponsorshipStatus()` of AirnodeProtocol to
    /// sponsor this BeaconServer contract, (2) The sponsor must call
    /// `setUpdatePermissionStatus()` of this BeaconServer contract to give
    /// request update permission to the user of this method.
    /// The template and additional parameters used here must specify a single
    /// point of data of type `int256` and an additional timestamp of type
    /// `uint256` to be returned because this is what `fulfill()` expects.
    /// This point of data must be castable to `int224` and the timestamp must
    /// be castable to `uint32`.
    /// The sponsor and the update requester in the event are indexed to allow
    /// keepers to be able to keep track of their update requests.
    /// @param templateId Template ID of the beacon to be updated
    /// @param sponsor Sponsor whose wallet will be used to fulfill this
    /// request
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    function requestBeaconUpdate(
        bytes32 templateId,
        address sponsor,
        bytes calldata parameters
    ) external override onlyPermittedUpdateRequester(sponsor) {
        bytes32 requestId = IAirnodeProtocolV1(airnodeProtocol).makeRequest(
            templateId,
            parameters,
            sponsor,
            this.fulfillRrp.selector
        );
        bytes32 beaconId = deriveBeaconId(templateId, parameters);
        requestIdToBeaconId[requestId] = beaconId;
        emit RequestedBeaconUpdate(
            beaconId,
            sponsor,
            msg.sender,
            requestId,
            templateId,
            parameters
        );
    }

    /// @notice Called to request a beacon to be updated by a relayer
    /// @param templateId Template ID of the beacon to be updated
    /// @param relayer Relayer address
    /// @param sponsor Sponsor whose wallet will be used to fulfill this
    /// request
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    function requestBeaconUpdate(
        bytes32 templateId,
        address relayer,
        address sponsor,
        bytes calldata parameters
    ) external override onlyPermittedUpdateRequester(sponsor) {
        bytes32 requestId = IAirnodeProtocolV1(airnodeProtocol)
            .makeRequestRelayed(
                templateId,
                parameters,
                relayer,
                sponsor,
                this.fulfillRrp.selector
            );
        bytes32 beaconId = deriveBeaconId(templateId, parameters);
        requestIdToBeaconId[requestId] = beaconId;
        emit RequestedBeaconUpdateRelayed(
            beaconId,
            sponsor,
            msg.sender,
            requestId,
            relayer,
            templateId,
            parameters
        );
    }

    /// @notice Called by the Airnode protocol to fulfill the request
    /// @param requestId ID of the request being fulfilled
    /// @param timestamp Timestamp used in the signature
    /// @param data Fulfillment data (a single `int256` encoded as `bytes`)
    function fulfillRrp(
        bytes32 requestId,
        uint256 timestamp,
        bytes calldata data
    ) external override onlyAirnodeProtocol onlyFreshTimestamp(timestamp) {
        bytes32 beaconId = requestIdToBeaconId[requestId];
        require(beaconId != bytes32(0), "No such request made");
        delete requestIdToBeaconId[requestId];
        int256 decodedData = ingestData(beaconId, timestamp, data);
        emit UpdatedBeaconWithRrp(
            beaconId,
            requestId,
            int224(decodedData),
            uint32(timestamp)
        );
    }

    /// @notice Called by the Airnode protocol to fulfill the subscription
    /// @param subscriptionId ID of the subscription being fulfilled
    /// @param timestamp Timestamp used in the signature
    /// @param data Fulfillment data (a single `int256` encoded as `bytes`)
    function fulfillPsp(
        bytes32 subscriptionId,
        uint256 timestamp,
        bytes calldata data
    ) external override onlyAirnodeProtocol onlyFreshTimestamp(timestamp) {
        (bytes32 beaconId, , , , , , ) = IAirnodeProtocolV1(airnodeProtocol)
            .subscriptions(subscriptionId);
        int256 decodedData = ingestData(beaconId, timestamp, data);
        emit UpdatedBeaconWithPsp(
            beaconId,
            subscriptionId,
            int224(decodedData),
            uint32(timestamp)
        );
    }

    /// @notice Called to read the beacon
    /// @dev The sender must be whitelisted.
    /// If the `timestamp` of a beacon is zero, this means that it was never
    /// written to before, and the zero value in the `value` field is not
    /// valid. In general, make sure to check if the timestamp of the beacon is
    /// fresh enough, and definitely disregard beacons with zero `timestamp`.
    /// @param beaconId ID of the beacon that will be returned
    /// @return value Beacon value
    /// @return timestamp Beacon timestamp
    function readBeacon(bytes32 beaconId)
        external
        view
        override
        returns (int224 value, uint32 timestamp)
    {
        require(
            readerCanReadBeacon(beaconId, msg.sender),
            "Sender cannot read beacon"
        );
        Beacon storage beacon = beacons[beaconId];
        return (beacon.value, beacon.timestamp);
    }

    /// @notice Called to check if a reader is whitelisted to read the beacon
    /// @param beaconId Beacon ID
    /// @param reader Reader address
    /// @return isWhitelisted If the reader is whitelisted
    function readerCanReadBeacon(bytes32 beaconId, address reader)
        public
        view
        override
        returns (bool)
    {
        return
            userIsWhitelisted(beaconId, reader) ||
            userIsUnlimitedReader(reader);
    }

    /// @notice Called to get the detailed whitelist status of the reader for
    /// the beacon
    /// @param beaconId Beacon ID
    /// @param reader Reader address
    /// @return expirationTimestamp Timestamp at which the whitelisting of the
    /// reader will expire
    /// @return indefiniteWhitelistCount Number of times `reader` was
    /// whitelisted indefinitely for `templateId`
    function beaconIdToReaderToWhitelistStatus(bytes32 beaconId, address reader)
        external
        view
        override
        returns (uint64 expirationTimestamp, uint192 indefiniteWhitelistCount)
    {
        WhitelistStatus
            storage whitelistStatus = serviceIdToUserToWhitelistStatus[
                beaconId
            ][reader];
        expirationTimestamp = whitelistStatus.expirationTimestamp;
        indefiniteWhitelistCount = whitelistStatus.indefiniteWhitelistCount;
    }

    /// @notice Returns if an account has indefinitely whitelisted the reader
    /// for the beacon
    /// @param beaconId Beacon ID
    /// @param reader Reader address
    /// @param setter Address of the account that has potentially whitelisted
    /// the reader for the beacon indefinitely
    /// @return indefiniteWhitelistStatus If `setter` has indefinitely
    /// whitelisted reader for the beacon
    function beaconIdToReaderToSetterToIndefiniteWhitelistStatus(
        bytes32 beaconId,
        address reader,
        address setter
    ) external view override returns (bool indefiniteWhitelistStatus) {
        indefiniteWhitelistStatus = serviceIdToUserToSetterToIndefiniteWhitelistStatus[
            beaconId
        ][reader][setter];
    }

    /// @notice Derives the beacon ID from the respective template ID and
    /// additional parameters
    /// @param templateId Template ID
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    /// @return beaconId Beacon ID
    function deriveBeaconId(bytes32 templateId, bytes memory parameters)
        public
        pure
        override
        returns (bytes32 beaconId)
    {
        beaconId = keccak256(abi.encodePacked(templateId, parameters));
    }

    /// @notice Returns if the user has the role unlimited reader
    /// @dev An unlimited reader can read all resources. `address(0)` is
    /// treated as an unlimited reader to provide an easy way for off-chain
    /// agents to read beacon values without having to resort to logs.
    /// @param user User address
    /// @return If the user is unlimited reader
    function userIsUnlimitedReader(address user) private view returns (bool) {
        return
            IAccessControlRegistry(accessControlRegistry).hasRole(
                unlimitedReaderRole,
                user
            ) || user == address(0);
    }

    /// @notice Called privately to decode and process the fulfillment data
    /// @param beaconId Beacon ID
    /// @param timestamp Timestamp used in the signature
    /// @param data Fulfillment data (a single `int256` encoded as `bytes`)
    /// @return decodedData Decoded beacon data
    function ingestData(
        bytes32 beaconId,
        uint256 timestamp,
        bytes calldata data
    ) private returns (int256 decodedData) {
        require(data.length == 32, "Incorrect data length");
        decodedData = abi.decode(data, (int256));
        require(
            decodedData >= type(int224).min && decodedData <= type(int224).max,
            "Value typecasting error"
        );
        require(timestamp <= type(uint32).max, "Timestamp typecasting error");
        require(
            timestamp > beacons[beaconId].timestamp,
            "Fulfillment older than beacon"
        );
        beacons[beaconId] = Beacon({
            value: int224(decodedData),
            timestamp: uint32(timestamp)
        });
    }
}
