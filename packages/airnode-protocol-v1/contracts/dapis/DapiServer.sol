// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../whitelist/WhitelistWithManager.sol";
import "../AirnodeRequester.sol";
import "./InPlaceMedian.sol";
import "./interfaces/IDapiServer.sol";

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
contract DapiServer is
    WhitelistWithManager,
    AirnodeRequester,
    InPlaceMedian,
    IDapiServer
{
    struct DataPoint {
        int224 value;
        uint32 timestamp;
    }

    /// @notice Description of the unlimited reader role
    string public constant override UNLIMITED_READER_ROLE_DESCRIPTION =
        "Unlimited reader";

    uint256 public constant override HUNDRED_PERCENT = 1e8;

    /// @notice Unlimited reader role
    bytes32 public immutable override unlimitedReaderRole;

    /// @notice Called to check if a sponsor has permitted an account to
    /// request updates at this contract
    mapping(address => mapping(address => bool))
        public
        override sponsorToUpdateRequesterToPermissionStatus;

    mapping(bytes32 => DataPoint) internal dataPoints;

    mapping(bytes32 => bytes32) private requestIdToBeaconId;

    mapping(bytes32 => bytes32) private subscriptionIdToBeaconId;

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
        (bytes32 beaconId, ) = IAirnodeProtocolV1(airnodeProtocol)
            .verifySignature(
                templateId,
                parameters,
                timestamp,
                data,
                signature
            );
        int256 decodedData = ingestFulfillmentData(beaconId, timestamp, data);
        emit UpdatedBeaconWithoutRequest(beaconId, decodedData, timestamp);
    }

    /// @notice Called to request a beacon to be updated
    /// @dev There are two requirements for this method to be called: (1) The
    /// sponsor must call `setSponsorshipStatus()` of AirnodeProtocol to
    /// sponsor this BeaconServer contract, (2) The sponsor must call
    /// `setUpdatePermissionStatus()` of this BeaconServer contract to give
    /// request update permission to the user of this method.
    /// The template and additional parameters used here must specify a single
    /// point of data of type `int256` because this is what `fulfill()`
    /// expects. This point of data must be castable to `int224`.
    /// The sponsor and the update requester in the event are indexed to allow
    /// keepers to keep track of their update requests.
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
            this.fulfillRrpBeaconUpdate.selector
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
                this.fulfillRrpBeaconUpdate.selector
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
    function fulfillRrpBeaconUpdate(
        bytes32 requestId,
        uint256 timestamp,
        bytes calldata data
    ) external override onlyAirnodeProtocol onlyFreshTimestamp(timestamp) {
        bytes32 beaconId = requestIdToBeaconId[requestId];
        require(beaconId != bytes32(0), "No such request made");
        delete requestIdToBeaconId[requestId];
        int256 decodedData = ingestFulfillmentData(beaconId, timestamp, data);
        emit UpdatedBeaconWithRrp(
            beaconId,
            requestId,
            int224(decodedData),
            uint32(timestamp)
        );
    }

    /// @notice Called by the Airnode protocol to fulfill the subscription
    /// @dev This implementation should be used with non-relayed subscriptions
    /// @param subscriptionId ID of the subscription being fulfilled
    /// @param timestamp Timestamp used in the signature
    /// @param data Fulfillment data (a single `int256` encoded as `bytes`)
    function fulfillPspBeaconUpdate(
        bytes32 subscriptionId,
        uint256 timestamp,
        bytes calldata data
    ) external override onlyAirnodeProtocol onlyFreshTimestamp(timestamp) {
        bytes32 beaconId = getRegisteredBeaconId(subscriptionId);
        int256 decodedData = ingestFulfillmentData(beaconId, timestamp, data);
        emit UpdatedBeaconWithPsp(
            beaconId,
            subscriptionId,
            int224(decodedData),
            uint32(timestamp)
        );
    }

    /// @notice Called by the Airnode protocol to fulfill the subscription
    /// @dev This implementation should be used with relayed subscriptions.
    /// The identity of the relayer does not matter in the context of this
    /// contract, which is why the value is not used.
    /// @param subscriptionId ID of the subscription being fulfilled
    /// @param relayer Relayer address
    /// @param timestamp Timestamp used in the signature
    /// @param data Fulfillment data (a single `int256` encoded as `bytes`)
    function fulfillPspBeaconUpdate(
        bytes32 subscriptionId,
        address relayer, // solhint-disable-line no-unused-vars
        uint256 timestamp,
        bytes calldata data
    ) external override onlyAirnodeProtocol onlyFreshTimestamp(timestamp) {
        bytes32 beaconId = getRegisteredBeaconId(subscriptionId);
        int256 decodedData = ingestFulfillmentData(beaconId, timestamp, data);
        emit UpdatedBeaconWithPsp(
            beaconId,
            subscriptionId,
            int224(decodedData),
            uint32(timestamp)
        );
    }

    function conditionPspBeaconUpdate(
        bytes32 subscriptionId,
        bytes calldata data,
        bytes calldata conditionParameters
    ) external override returns (bool) {
        require(msg.sender == address(0), "Sender not zero address");
        bytes32 beaconId = getRegisteredBeaconId(subscriptionId);
        int224 beaconData = dataPoints[beaconId].value;
        int224 decodedData = decodeFulfillmentData(data);
        require(conditionParameters.length == 32, "Incorrect parameter length");
        uint256 updatePercentageThreshold = abi.decode(
            conditionParameters,
            (uint256)
        );
        return
            calculateUpdateInPercentage(beaconData, decodedData) >=
            updatePercentageThreshold;
    }

    /// @notice Called to read the data point
    /// @param dataPointId ID of the data point that will be read
    /// @return value Data point value
    /// @return timestamp Data point timestamp
    function readDataPoint(bytes32 dataPointId)
        external
        view
        override
        returns (int224 value, uint32 timestamp)
    {
        require(
            readerCanReadDataPoint(dataPointId, msg.sender),
            "Sender cannot read beacon"
        );
        DataPoint storage dataPoint = dataPoints[dataPointId];
        return (dataPoint.value, dataPoint.timestamp);
    }

    /// @notice Called to check if a reader is whitelisted to read the data
    /// point
    /// @param dataPointId Data point ID
    /// @param reader Reader address
    /// @return isWhitelisted If the reader is whitelisted
    function readerCanReadDataPoint(bytes32 dataPointId, address reader)
        public
        view
        override
        returns (bool)
    {
        return
            userIsWhitelisted(dataPointId, reader) ||
            userIsUnlimitedReader(reader);
    }

    /// @notice Called to get the detailed whitelist status of the reader for
    /// the data point
    /// @param dataPointId Data point ID
    /// @param reader Reader address
    /// @return expirationTimestamp Timestamp at which the whitelisting of the
    /// reader will expire
    /// @return indefiniteWhitelistCount Number of times `reader` was
    /// whitelisted indefinitely for `id`
    function dataPointIdToReaderToWhitelistStatus(
        bytes32 dataPointId,
        address reader
    )
        external
        view
        override
        returns (uint64 expirationTimestamp, uint192 indefiniteWhitelistCount)
    {
        WhitelistStatus
            storage whitelistStatus = serviceIdToUserToWhitelistStatus[
                dataPointId
            ][reader];
        expirationTimestamp = whitelistStatus.expirationTimestamp;
        indefiniteWhitelistCount = whitelistStatus.indefiniteWhitelistCount;
    }

    /// @notice Returns if an account has indefinitely whitelisted the reader
    /// for the data point
    /// @param dataPointId Data point ID
    /// @param reader Reader address
    /// @param setter Address of the account that has potentially whitelisted
    /// the reader for the data point indefinitely
    /// @return indefiniteWhitelistStatus If `setter` has indefinitely
    /// whitelisted reader for the data point
    function dataPointIdToReaderToSetterToIndefiniteWhitelistStatus(
        bytes32 dataPointId,
        address reader,
        address setter
    ) external view override returns (bool indefiniteWhitelistStatus) {
        indefiniteWhitelistStatus = serviceIdToUserToSetterToIndefiniteWhitelistStatus[
            dataPointId
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

    /// @notice Returns if the user has the unlimited reader role
    /// @dev An unlimited reader can read all data points. `address(0)` is
    /// treated as an unlimited reader to provide an easy way for off-chain
    /// agents to read data point values without having to resort to logs.
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
    function ingestFulfillmentData(
        bytes32 beaconId,
        uint256 timestamp,
        bytes calldata data
    ) private returns (int256 decodedData) {
        decodedData = decodeFulfillmentData(data);
        require(timestamp <= type(uint32).max, "Timestamp typecasting error");
        require(
            timestamp > dataPoints[beaconId].timestamp,
            "Fulfillment older than beacon"
        );
        dataPoints[beaconId] = DataPoint({
            value: int224(decodedData),
            timestamp: uint32(timestamp)
        });
    }

    function decodeFulfillmentData(bytes calldata data)
        private
        pure
        returns (int224)
    {
        require(data.length == 32, "Incorrect data length");
        int256 decodedData = abi.decode(data, (int256));
        require(
            decodedData >= type(int224).min && decodedData <= type(int224).max,
            "Value typecasting error"
        );
        return int224(decodedData);
    }

    function calculateUpdateInPercentage(int224 firstValue, int224 secondValue)
        internal
        pure
        returns (uint256 updateInPercentage)
    {
        uint256 absoluteDelta = uint256(
            firstValue > secondValue
                ? int256(firstValue) - secondValue
                : int256(secondValue) - firstValue
        );
        uint256 absoluteFirstValue;
        if (firstValue > 0) {
            absoluteFirstValue = uint256(int256(firstValue));
        } else if (firstValue < 0) {
            absoluteFirstValue = uint256(-int256(firstValue));
        } else {
            // Avoid division by 0
            absoluteFirstValue = 1;
        }
        return (HUNDRED_PERCENT * absoluteDelta) / absoluteFirstValue;
    }

    function registerSubscription(
        address _airnodeProtocol,
        bytes32 templateId,
        bytes calldata parameters,
        bytes calldata conditions,
        address sponsor,
        address requester,
        bytes4 fulfillFunctionId
    ) external override returns (bytes32 subscriptionId, bytes32 beaconId) {
        subscriptionId = keccak256(
            abi.encodePacked(
                block.chainid,
                _airnodeProtocol,
                templateId,
                parameters,
                conditions,
                sponsor,
                requester,
                fulfillFunctionId
            )
        );
        beaconId = keccak256(abi.encodePacked(templateId, parameters));
        subscriptionIdToBeaconId[subscriptionId] = beaconId;
    }

    function getRegisteredBeaconId(bytes32 subscriptionId)
        private
        returns (bytes32 beaconId)
    {
        beaconId = subscriptionIdToBeaconId[subscriptionId];
        if (beaconId == bytes32(0)) {
            (
                bytes32 templateId,
                bytes memory parameters,
                ,
                ,
                ,

            ) = IAirnodeProtocolV1(airnodeProtocol).subscriptions(
                    subscriptionId
                );
            beaconId = keccak256(abi.encodePacked(templateId, parameters));
            subscriptionIdToBeaconId[subscriptionId] = beaconId;
        }
        return beaconId;
    }

    function fulfillPspDapiUpdate(
        bytes32 subscriptionId, // solhint-disable-line no-unused-vars
        uint256 timestamp,
        bytes calldata data
    ) external override onlyAirnodeProtocol onlyFreshTimestamp(timestamp) {
        require(
            keccak256(data) == updateDapi(abi.decode(data, (bytes32[]))),
            "Incorrect data length"
        );
    }

    function conditionPspDapiUpdate(
        bytes32 subscriptionId, // solhint-disable-line no-unused-vars
        bytes calldata data,
        bytes calldata conditionParameters
    ) external override returns (bool) {
        require(msg.sender == address(0), "Sender not zero address");
        bytes32 dapiId = keccak256(data);
        int224 currentDapiValue = dataPoints[dapiId].value;
        require(
            dapiId == updateDapi(abi.decode(data, (bytes32[]))),
            "Incorrect data length"
        );
        int224 updatedDapiValue = dataPoints[dapiId].value;
        require(conditionParameters.length == 32, "Incorrect parameter length");
        uint256 updatePercentageThreshold = abi.decode(
            conditionParameters,
            (uint256)
        );
        return
            calculateUpdateInPercentage(currentDapiValue, updatedDapiValue) >=
            updatePercentageThreshold;
    }

    function updateDapi(bytes32[] memory beaconIds)
        public
        override
        returns (bytes32 dapiId)
    {
        dapiId = keccak256(abi.encodePacked(beaconIds));
        uint32 currentTimestamp = dataPoints[dapiId].timestamp;
        uint256 beaconCount = beaconIds.length;
        int256[] memory values = new int256[](beaconCount);
        uint256 accumulatedTimestamp = 0;
        for (uint256 ind = 0; ind < beaconCount; ind++) {
            DataPoint storage datapoint = dataPoints[beaconIds[ind]];
            values[ind] = datapoint.value;
            accumulatedTimestamp += datapoint.timestamp;
        }
        uint32 updatedTimestamp = uint32(accumulatedTimestamp / beaconCount);
        require(updatedTimestamp > currentTimestamp, "Updated value outdated");
        int224 updatedValue = int224(computeMedianInPlace(values));
        dataPoints[dapiId] = DataPoint({
            value: updatedValue,
            timestamp: updatedTimestamp
        });
    }
}
