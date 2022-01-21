// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../whitelist/WhitelistWithManager.sol";
import "../AirnodeRequester.sol";
import "./Median.sol";
import "./interfaces/IDapiServer.sol";

/// @title Contract that serves Beacons and dAPIs using the Airnode protocol
/// @notice A Beacon is a live data point addressed by an ID, which is
/// derived from a template ID and additional parameters. This is suitable
/// where the more recent data point is always more favorable, e.g., in the
/// context of an asset price data feed. Beacons can also be seen as
/// one-Airnode data feeds that can be used individually or combined to build
/// dAPIs.
contract DapiServer is
    WhitelistWithManager,
    AirnodeRequester,
    Median,
    IDapiServer
{
    // Airnodes serve their fulfillment data along with timestamps. This
    // contract casts the reported data to `int224` and the timestamp to
    // `uint32`, which works until year 2106.
    struct DataPoint {
        int224 value;
        uint32 timestamp;
    }

    /// @notice Unlimited reader role description
    string public constant override UNLIMITED_READER_ROLE_DESCRIPTION =
        "Unlimited reader";

    /// @notice Name setter role description
    string public constant override NAME_SETTER_ROLE_DESCRIPTION =
        "Name setter";

    /// @notice Number that represents 100%
    /// @dev 10^8 is chosen (and not a larger number) to avoid overflows in
    /// `calculateUpdateInPercentage()`. Since the reported data needs to fit
    /// into 224 bits, its multiplication by 10^8 is guaranteed not to
    /// overflow.
    uint256 public constant override HUNDRED_PERCENT = 1e8;

    /// @notice Unlimited reader role
    bytes32 public immutable override unlimitedReaderRole;

    /// @notice Name setter role
    bytes32 public immutable override nameSetterRole;

    /// @notice If a sponsor has permitted an account to request updates at
    /// this contract
    mapping(address => mapping(address => bool))
        public
        override sponsorToUpdateRequesterToPermissionStatus;

    /// @notice ID of the beacon that a subscription with the ID will update
    mapping(bytes32 => bytes32) public override subscriptionIdToBeaconId;

    /// @notice Data point ID that a name is pointed to
    mapping(bytes32 => bytes32) public override nameToDataPointId;

    mapping(bytes32 => DataPoint) private dataPoints;

    mapping(bytes32 => bytes32) private requestIdToBeaconId;

    /// @dev Reverts if the sender is not permitted to request an update with
    /// the sponsor and is not the sponsor
    /// @param sponsor Sponsor address
    modifier onlyPermittedUpdateRequester(address sponsor) {
        require(
            sponsor == msg.sender ||
                sponsorToUpdateRequesterToPermissionStatus[sponsor][msg.sender],
            "Sender not permitted"
        );
        _;
    }

    /// @dev Reverts if the sender is not authorized to read the data point
    /// with the ID
    /// @param dataPointId Data point ID
    modifier onlyAuthorizedReader(bytes32 dataPointId) {
        require(
            readerCanReadDataPoint(dataPointId, msg.sender),
            "Sender cannot read"
        );
        _;
    }

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    /// @param _airnodeProtocol AirnodeProtocol contract address
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
        nameSetterRole = _deriveRole(
            _deriveAdminRole(manager),
            keccak256(abi.encodePacked(NAME_SETTER_ROLE_DESCRIPTION))
        );
    }

    ///                     ~~~RRP beacon updates~~~

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

    /// @notice Requests a beacon to be updated
    /// @dev There are two requirements for this method to be called: (1) The
    /// sponsor must call `setSponsorshipStatus()` of AirnodeProtocol to
    /// sponsor this DapiServer contract, (2) The sponsor must call
    /// `setUpdatePermissionStatus()` of this DapiServer contract to give
    /// request update permission to the user of this method.
    /// The template and additional parameters used here must specify a single
    /// point of data of type `int256` because this is what
    /// `fulfillRrpBeaconUpdate()` expects. This point of data must be castable
    /// to `int224`.
    /// The sponsor and the update requester in the event are indexed to allow
    /// keepers to keep track of their update requests.
    /// @param templateId Template ID of the beacon to be updated
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    /// @param sponsor Address of the sponsor whose wallet will be used to
    /// fulfill the request
    function requestRrpBeaconUpdate(
        bytes32 templateId,
        bytes calldata parameters,
        address sponsor
    ) external override onlyPermittedUpdateRequester(sponsor) {
        bytes32 requestId = IAirnodeProtocolV1(airnodeProtocol).makeRequest(
            templateId,
            parameters,
            sponsor,
            this.fulfillRrpBeaconUpdate.selector
        );
        bytes32 beaconId = deriveBeaconId(templateId, parameters);
        requestIdToBeaconId[requestId] = beaconId;
        emit RequestedRrpBeaconUpdate(
            beaconId,
            sponsor,
            msg.sender,
            requestId,
            templateId,
            parameters
        );
    }

    /// @notice Requests a beacon to be updated by a relayer
    /// @param templateId Template ID of the beacon to be updated
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    /// @param relayer Relayer address
    /// @param sponsor Address of the sponsor whose wallet will be used to
    /// fulfill the request
    function requestRrpBeaconUpdateRelayed(
        bytes32 templateId,
        bytes calldata parameters,
        address relayer,
        address sponsor
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
        emit RequestedRrpBeaconUpdateRelayed(
            beaconId,
            sponsor,
            msg.sender,
            requestId,
            relayer,
            templateId,
            parameters
        );
    }

    /// @notice Called by the Airnode through AirnodeProtocol to fulfill the
    /// request
    /// @param requestId ID of the request being fulfilled
    /// @param timestamp Timestamp used in the signature
    /// @param data Fulfillment data (a single `int256` encoded as `bytes`)
    function fulfillRrpBeaconUpdate(
        bytes32 requestId,
        uint256 timestamp,
        bytes calldata data
    ) external override onlyAirnodeProtocol onlyValidTimestamp(timestamp) {
        bytes32 beaconId = requestIdToBeaconId[requestId];
        delete requestIdToBeaconId[requestId];
        int256 decodedData = processBeaconUpdate(beaconId, timestamp, data);
        emit UpdatedBeaconWithRrp(
            beaconId,
            requestId,
            int224(decodedData),
            uint32(timestamp)
        );
    }

    ///                     ~~~PSP beacon updates~~~

    /// @notice Registers which beacon the respective subscription should
    /// update
    /// @dev Similar to how one needs to call `requestRrpBeaconUpdate()` for
    /// this contract to recognize the incoming RRP fulfillment, this needs to
    /// be called before subscription fulfillments
    /// @param templateId Template ID
    /// @param parameters Parameters provided by the subscription in addition
    /// to the parameters in the request template
    /// @param conditions Conditions under which the subscription is requested
    /// to be fulfilled
    /// @param relayer Relayer address
    /// @param sponsor Sponsor address
    /// @return subscriptionId Subscription ID
    /// @return beaconId Beacon ID
    function registerBeaconUpdateSubscription(
        bytes32 templateId,
        bytes calldata parameters,
        bytes calldata conditions,
        address relayer,
        address sponsor
    ) external override returns (bytes32 subscriptionId, bytes32 beaconId) {
        subscriptionId = keccak256(
            abi.encodePacked(
                block.chainid,
                airnodeProtocol,
                templateId,
                parameters,
                conditions,
                relayer,
                sponsor,
                address(this),
                this.fulfillPspBeaconUpdate.selector
            )
        );
        require(
            IAirnodeProtocolV1(airnodeProtocol).subscriptionIdToHash(
                subscriptionId
            ) != bytes32(0),
            "Not registered at protocol"
        );
        beaconId = deriveBeaconId(templateId, parameters);
        subscriptionIdToBeaconId[subscriptionId] = beaconId;
        emit RegisteredSubscription(subscriptionId, beaconId);
    }

    /// @notice Returns true if the respective beacon needs to be updated based
    /// on the fulfillment data and the condition parameters
    /// @dev Reverts if not called by a void signer with zero address.
    /// Airnode derives `conditionParameters` out of the `conditions` field of
    /// a Subscription.
    /// @param subscriptionId Subscription ID
    /// @param data Fulfillment data
    /// @param conditionParameters Subscription condition parameters
    /// @return If the beacon update subscription should be fulfilled
    function conditionPspBeaconUpdate(
        bytes32 subscriptionId,
        bytes calldata data,
        bytes calldata conditionParameters
    ) external override returns (bool) {
        require(msg.sender == address(0), "Sender not zero address");
        bytes32 beaconId = subscriptionIdToBeaconId[subscriptionId];
        require(beaconId != bytes32(0), "Subscription not registered");
        return
            calculateUpdateInPercentage(
                dataPoints[beaconId].value,
                decodeFulfillmentData(data)
            ) >= decodeConditionParameters(conditionParameters);
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
    ) external override onlyAirnodeProtocol onlyValidTimestamp(timestamp) {
        bytes32 beaconId = subscriptionIdToBeaconId[subscriptionId];
        require(beaconId != bytes32(0), "Subscription not registered");
        int256 decodedData = processBeaconUpdate(beaconId, timestamp, data);
        emit UpdatedBeaconWithPsp(
            beaconId,
            subscriptionId,
            int224(decodedData),
            uint32(timestamp)
        );
    }

    ///                     ~~~Signed data beacon updates~~~

    /// @notice Updates a beacon using data signed by the respective Airnode
    /// @param templateId Template ID
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    /// @param timestamp Timestamp used in the signature
    /// @param data Response data (a single `int256` encoded as `bytes`)
    /// @param signature Request hash, a timestamp and the response data signed
    /// by the Airnode address
    function updateBeaconWithSignedData(
        bytes32 templateId,
        bytes calldata parameters,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external override onlyValidTimestamp(timestamp) {
        (bytes32 beaconId, ) = IAirnodeProtocolV1(airnodeProtocol)
            .verifySignature(
                templateId,
                parameters,
                timestamp,
                data,
                signature
            );
        int256 decodedData = processBeaconUpdate(beaconId, timestamp, data);
        emit UpdatedBeaconWithSignedData(beaconId, decodedData, timestamp);
    }

    ///                     ~~~PSP dAPI updates~~~

    function updateDapi(bytes32[] memory beaconIds)
        public
        override
        returns (bytes32 dapiId)
    {
        dapiId = deriveDapiId(beaconIds);
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
        int224 updatedValue = int224(median(values));
        dataPoints[dapiId] = DataPoint({
            value: updatedValue,
            timestamp: updatedTimestamp
        });
        emit UpdatedDapi(dapiId, updatedValue, updatedTimestamp);
    }

    function conditionPspDapiUpdate(
        bytes32 subscriptionId, // solhint-disable-line no-unused-vars
        bytes calldata data,
        bytes calldata conditionParameters
    ) external override returns (bool) {
        //require(msg.sender == address(0), "Sender not zero address");
        bytes32 dapiId = keccak256(data);
        int224 currentDapiValue = dataPoints[dapiId].value;
        require(
            dapiId == updateDapi(abi.decode(data, (bytes32[]))),
            "Incorrect data length"
        );
        return
            calculateUpdateInPercentage(
                currentDapiValue,
                dataPoints[dapiId].value
            ) >= decodeConditionParameters(conditionParameters);
    }

    function fulfillPspDapiUpdate(
        bytes32 subscriptionId, // solhint-disable-line no-unused-vars
        uint256 timestamp,
        bytes calldata data
    ) external override onlyAirnodeProtocol onlyValidTimestamp(timestamp) {
        require(
            keccak256(data) == updateDapi(abi.decode(data, (bytes32[]))),
            "Incorrect data length"
        );
    }

    ///                     ~~~Signed data dAPI updates~~~

    function updateDapiWithSignedData(
        bytes32[] calldata templateIds,
        bytes[] calldata parameters,
        uint256[] calldata timestamps,
        bytes[] calldata data,
        bytes[] calldata signatures
    ) external override returns (bytes32 dapiId) {
        uint256 beaconCount = templateIds.length;
        require(
            beaconCount == parameters.length &&
                beaconCount == timestamps.length &&
                beaconCount == data.length &&
                beaconCount == signatures.length,
            "Parameter length mismatch"
        );
        bytes32[] memory beaconIds = new bytes32[](beaconCount);
        for (uint256 ind = 0; ind < beaconCount; ind++) {
            if (signatures[ind].length != 0) {
                require(timestampIsValid(timestamps[ind]), "Invalid timestamp");
                (beaconIds[ind], ) = IAirnodeProtocolV1(airnodeProtocol)
                    .verifySignature(
                        templateIds[ind],
                        parameters[ind],
                        timestamps[ind],
                        data[ind],
                        signatures[ind]
                    );
            } else {
                beaconIds[ind] = deriveBeaconId(
                    templateIds[ind],
                    parameters[ind]
                );
            }
        }
        dapiId = deriveDapiId(beaconIds);
        int256[] memory values = new int256[](beaconCount);
        uint256 accumulatedTimestamp = 0;
        for (uint256 ind = 0; ind < beaconCount; ind++) {
            if (signatures[ind].length != 0) {
                values[ind] = decodeFulfillmentData(data[ind]);
                uint256 timestamp = timestamps[ind];
                require(
                    timestamp <= type(uint32).max,
                    "Timestamp typecasting error"
                );
                accumulatedTimestamp += timestamp;
            } else {
                DataPoint storage dataPoint = dataPoints[beaconIds[ind]];
                values[ind] = dataPoint.value;
                accumulatedTimestamp += dataPoint.timestamp;
            }
        }
        uint32 updatedTimestamp = uint32(accumulatedTimestamp / beaconCount);
        require(
            updatedTimestamp > dataPoints[dapiId].timestamp,
            "Updated value outdated"
        );
        int224 updatedValue = int224(median(values));
        dataPoints[dapiId] = DataPoint({
            value: updatedValue,
            timestamp: updatedTimestamp
        });
        emit UpdatedDapiWithSignedData(dapiId, updatedValue, updatedTimestamp);
    }

    /// @notice Sets the data point ID the name points to
    /// @dev While a data point ID refers to a specific Beacon or dAPI, names
    /// provide a more abstract interface for convenience. This means a name
    /// that was pointing at a beacon can be pointed to a dAPI, then another
    /// dAPI, etc.
    /// @param name Human-readable name
    /// @param dataPointId Data point ID the name will point to
    function setName(bytes32 name, bytes32 dataPointId) external override {
        require(
            msg.sender == manager ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    nameSetterRole,
                    msg.sender
                ),
            "Sender cannot set name"
        );
        nameToDataPointId[name] = dataPointId;
        emit SetName(name, dataPointId, msg.sender);
    }

    /// @notice Reads the data point
    /// @param dataPointId ID of the data point that will be read
    /// @return value Data point value
    /// @return timestamp Data point timestamp
    function readWithDataPointId(bytes32 dataPointId)
        external
        view
        override
        onlyAuthorizedReader(dataPointId)
        returns (int224 value, uint32 timestamp)
    {
        DataPoint storage dataPoint = dataPoints[dataPointId];
        return (dataPoint.value, dataPoint.timestamp);
    }

    function readWithName(bytes32 name)
        external
        view
        override
        onlyAuthorizedReader(name)
        returns (int224 value, uint32 timestamp)
    {
        DataPoint storage dataPoint = dataPoints[nameToDataPointId[name]];
        return (dataPoint.value, dataPoint.timestamp);
    }

    /// @notice Returns if a reader is whitelisted to read the data point
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
            reader == address(0) ||
            userIsWhitelisted(dataPointId, reader) ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                unlimitedReaderRole,
                reader
            );
    }

    /// @notice Returns the detailed whitelist status of the reader for the
    /// data point
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

    function deriveDapiId(bytes32[] memory beaconIds)
        public
        pure
        override
        returns (bytes32 dapiId)
    {
        dapiId = keccak256(abi.encodePacked(beaconIds));
    }

    /// @notice Called privately to process the beacon update
    /// @param beaconId Beacon ID
    /// @param timestamp Timestamp used in the signature
    /// @param data Fulfillment data (a single `int256` encoded as `bytes`)
    /// @return decodedData Decoded fulfillment data
    function processBeaconUpdate(
        bytes32 beaconId,
        uint256 timestamp,
        bytes calldata data
    ) private returns (int256 decodedData) {
        decodedData = decodeFulfillmentData(data);
        require(
            timestamp > dataPoints[beaconId].timestamp,
            "Fulfillment older than beacon"
        );
        // Timestamp validity is already checked by `onlyValidTimestamp`, which
        // means it will be small enough to be typecast into `uint32`
        dataPoints[beaconId] = DataPoint({
            value: int224(decodedData),
            timestamp: uint32(timestamp)
        });
    }

    /// @notice Called privately to decode the fulfillment data
    /// @param data Fulfillment data (a single `int256` encoded as `bytes`)
    /// @return decodedData Decoded fulfillment data
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

    function decodeConditionParameters(bytes calldata conditionParameters)
        private
        pure
        returns (uint256)
    {
        require(conditionParameters.length == 32, "Incorrect parameter length");
        return abi.decode(conditionParameters, (uint256));
    }

    function calculateUpdateInPercentage(int224 firstValue, int224 secondValue)
        private
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
}
