// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../whitelist/WhitelistWithManager.sol";
import "../AirnodeRequesterAndSignatureVerifier.sol";
import "./Median.sol";
import "./interfaces/IDapiServer.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title Contract that serves Beacons and dAPIs using the Airnode protocol
/// @notice A Beacon is a live data point addressed by an ID, which is
/// derived from a template ID and additional parameters. This is suitable
/// where the more recent data point is always more favorable, e.g., in the
/// context of an asset price data feed. Beacons can also be seen as
/// one-Airnode data feeds that can be used individually or combined to build
/// dAPIs.
contract DapiServer is
    WhitelistWithManager,
    AirnodeRequesterAndSignatureVerifier,
    Median,
    IDapiServer
{
    using ECDSA for bytes32;
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

    mapping(bytes32 => bytes32) public override subscriptionIdToBeaconId;

    mapping(bytes32 => bytes32) private subscriptionIdToHash;

    mapping(bytes32 => bytes32) private nameHashToDataPointId;

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
        AirnodeRequesterAndSignatureVerifier(_airnodeProtocol)
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

    ///                     ~~~RRP Beacon updates~~~

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

    /// @notice Requests a Beacon to be updated
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
    /// @param templateId Template ID of the Beacon to be updated
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    /// @param sponsor Address of the sponsor whose wallet will be used to
    /// fulfill the request
    /// @return requestId Request ID
    function requestRrpBeaconUpdate(
        bytes32 templateId,
        bytes calldata parameters,
        address sponsor
    )
        external
        override
        onlyPermittedUpdateRequester(sponsor)
        returns (bytes32 requestId)
    {
        requestId = IAirnodeProtocol(airnodeProtocol).makeRequest(
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

    /// @notice Requests a Beacon to be updated by a relayer
    /// @param templateId Template ID of the Beacon to be updated
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    /// @param relayer Relayer address
    /// @param sponsor Address of the sponsor whose wallet will be used to
    /// fulfill the request
    /// @return requestId Request ID
    function requestRrpBeaconUpdateRelayed(
        bytes32 templateId,
        bytes calldata parameters,
        address relayer,
        address sponsor
    )
        external
        override
        onlyPermittedUpdateRequester(sponsor)
        returns (bytes32 requestId)
    {
        requestId = IAirnodeProtocol(airnodeProtocol).makeRequestRelayed(
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
    /// @param requestId Request ID
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

    ///                     ~~~PSP Beacon updates~~~

    /// @notice Registers which Beacon the respective subscription should
    /// update
    /// @dev Similar to how one needs to call `requestRrpBeaconUpdate()` for
    /// this contract to recognize the incoming RRP fulfillment, this needs to
    /// be called before subscription fulfillments.
    /// There is an additional requirement for this subscription to work: The
    /// sponsor must call `setSponsorshipStatus()` of AirnodeProtocol to
    /// sponsor this DapiServer contract. Notice that there is no counterpart
    /// to `setUpdatePermissionStatus()` here. This is because whether if a
    /// subscription is permitted by its sponsor is checked by the slot setters
    /// of Allocators, and not here.
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
        bytes memory parameters,
        bytes memory conditions,
        address relayer,
        address sponsor
    ) external override returns (bytes32 subscriptionId, bytes32 beaconId) {
        subscriptionId = keccak256(
            abi.encodePacked(
                block.chainid,
                templateId,
                parameters,
                conditions,
                relayer,
                sponsor,
                address(this),
                this.fulfillPspBeaconUpdate.selector
            )
        );
        address airnode = IAirnodeProtocol(airnodeProtocol).templateIdToAirnode(
            templateId
        );
        require(airnode != address(0), "Template not registered");
        subscriptionIdToHash[subscriptionId] = keccak256(
            abi.encodePacked(airnode, relayer, sponsor)
        );
        beaconId = deriveBeaconId(templateId, parameters);
        subscriptionIdToBeaconId[subscriptionId] = beaconId;
        emit RegisteredSubscription(
            subscriptionId,
            templateId,
            parameters,
            conditions,
            relayer,
            sponsor,
            address(this),
            this.fulfillPspBeaconUpdate.selector
        );
    }

    /// @notice Returns true if the respective Beacon needs to be updated based
    /// on the fulfillment data and the condition parameters
    /// @dev Reverts if not called by a void signer with zero address because
    /// this method can be used to read from a Beacon indirectly.
    /// Airnode derives `conditionParameters` out of the `conditions` field of
    /// a Subscription.
    /// @param subscriptionId Subscription ID
    /// @param data Fulfillment data (a single `int256` encoded as `bytes`)
    /// @param conditionParameters Subscription condition parameters (a single
    /// `uint256` encoded as `bytes`)
    /// @return If the Beacon update subscription should be fulfilled
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

    /// @notice Called by the Airnode through AirnodeProtocol to fulfill the
    /// beacon update subscription
    /// @dev There is no need to verify that `conditionPspBeaconUpdate()`
    /// returns `true` because any Beacon update is a good Beacon update
    /// @param subscriptionId ID of the subscription being fulfilled
    /// @param timestamp Timestamp used in the signature
    /// @param data Fulfillment data (a single `int256` encoded as `bytes`)
    function fulfillPspBeaconUpdate(
        bytes32 subscriptionId,
        address airnode,
        address relayer,
        address sponsor,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external override onlyValidTimestamp(timestamp) {
        require(
            subscriptionIdToHash[subscriptionId] ==
                keccak256(abi.encodePacked(airnode, relayer, sponsor)),
            "Subscription not registered"
        );
        if (airnode == relayer) {
            require(
                (
                    keccak256(
                        abi.encodePacked(subscriptionId, timestamp, msg.sender)
                    ).toEthSignedMessageHash()
                ).recover(signature) == airnode,
                "Signature mismatch"
            );
        } else {
            require(
                (
                    keccak256(
                        abi.encodePacked(
                            subscriptionId,
                            timestamp,
                            msg.sender,
                            data
                        )
                    ).toEthSignedMessageHash()
                ).recover(signature) == airnode,
                "Signature mismatch"
            );
        }
        bytes32 beaconId = subscriptionIdToBeaconId[subscriptionId];
        // Beacon ID is guaranteed to not be zero because the subscription is
        // registered
        int256 decodedData = processBeaconUpdate(beaconId, timestamp, data);
        emit UpdatedBeaconWithPsp(
            beaconId,
            subscriptionId,
            int224(decodedData),
            uint32(timestamp)
        );
    }

    ///                     ~~~Signed data Beacon updates~~~

    /// @notice Updates a Beacon using data signed by the respective Airnode
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
        bytes32 beaconId = verifySignature(
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

    /// @notice Updates the dAPI that is comprised by the Beacons with the IDs
    /// @param beaconIds Beacon IDs
    /// @return dapiId dAPI ID
    function updateDapiWithBeacons(bytes32[] memory beaconIds)
        public
        override
        returns (bytes32 dapiId)
    {
        uint256 beaconCount = beaconIds.length;
        require(beaconCount > 1, "Specified less than two Beacons");
        int256[] memory values = new int256[](beaconCount);
        uint256 accumulatedTimestamp = 0;
        for (uint256 ind = 0; ind < beaconCount; ind++) {
            DataPoint storage datapoint = dataPoints[beaconIds[ind]];
            values[ind] = datapoint.value;
            accumulatedTimestamp += datapoint.timestamp;
        }
        uint32 updatedTimestamp = uint32(accumulatedTimestamp / beaconCount);
        dapiId = deriveDapiId(beaconIds);
        require(
            updatedTimestamp >= dataPoints[dapiId].timestamp,
            "Updated value outdated"
        );
        int224 updatedValue = int224(median(values));
        dataPoints[dapiId] = DataPoint({
            value: updatedValue,
            timestamp: updatedTimestamp
        });
        emit UpdatedDapiWithBeacons(dapiId, updatedValue, updatedTimestamp);
    }

    /// @notice Returns true if the respective dAPI needs to be updated based
    /// on the fulfillment data and the condition parameters
    /// @dev This method does not allow the caller to read from a dAPI
    /// indirectly and thus is not protected, which allows implementation of
    /// mechanics such as rewarding keepers that trigger substantial dAPI
    /// updates.
    /// The respective Airnode does not need to make an API call before
    /// checking this condition. In such cases, the endpoint ID of the template
    /// of the respective subscription is set to zero, which indicates to the
    /// Airnode that it should forward the template parameters as `data` to the
    /// condition. Therefore, `data` here is the `parameters` field from the
    /// template used in the subscription.
    /// We do not care about the subscription ID as long as `data` and
    /// `conditionParameters` are formatted correctly.
    /// @param subscriptionId Subscription ID
    /// @param data Fulfillment data (array of Beacon IDs)
    /// @param conditionParameters Subscription condition parameters (a single
    /// `uint256` encoded as `bytes`)
    /// @return If the dAPI update subscription should be fulfilled
    function conditionPspDapiUpdate(
        bytes32 subscriptionId, // solhint-disable-line no-unused-vars
        bytes calldata data,
        bytes calldata conditionParameters
    ) external override returns (bool) {
        bytes32 dapiId = keccak256(data);
        int224 currentDapiValue = dataPoints[dapiId].value;
        require(
            dapiId == updateDapiWithBeacons(abi.decode(data, (bytes32[]))),
            "Data length not correct"
        );
        return
            calculateUpdateInPercentage(
                currentDapiValue,
                dataPoints[dapiId].value
            ) >= decodeConditionParameters(conditionParameters);
    }

    /// @notice Called by the Airnode through AirnodeProtocol to fulfill the
    /// dAPI update subscription
    /// @dev There is no need to verify that `conditionPspDapiUpdate()`
    /// returns `true` because any dAPI update is a good dAPI update.
    /// Similar to Beacon update subscriptions, the sponsor must call
    /// `setSponsorshipStatus()` of AirnodeProtocol to sponsor this DapiServer
    /// contract.
    /// We do not care about the subscription ID as long as `data` is formatted
    /// correctly.
    /// `onlyAirnodeProtocol` and `onlyValidTimestamp` can be omitted, but we
    /// are keeping them to prevent subscription fulfillments from being
    /// spoofed.
    /// @param subscriptionId ID of the subscription being fulfilled
    /// @param timestamp Timestamp used in the signature
    /// @param data Fulfillment data (a single `int256` encoded as `bytes`)
    function fulfillPspDapiUpdate(
        bytes32 subscriptionId, // solhint-disable-line no-unused-vars
        address airnode, // solhint-disable-line no-unused-vars
        address relayer, // solhint-disable-line no-unused-vars
        address sponsor, // solhint-disable-line no-unused-vars
        uint256 timestamp, // solhint-disable-line no-unused-vars
        bytes calldata data,
        bytes calldata signature // solhint-disable-line no-unused-vars
    ) external override {
        require(
            keccak256(data) ==
                updateDapiWithBeacons(abi.decode(data, (bytes32[]))),
            "Data length not correct"
        );
    }

    ///                     ~~~Signed data dAPI updates~~~

    /// @notice Updates a dAPI using data signed by the respective Airnodes.
    /// The beacons for which the signature is omitted will be read from the
    /// storage.
    /// @param templateIds Template IDs
    /// @param parameters Parameters provided by the requesters in addition to
    /// the parameters in the templates
    /// @param timestamps Timestamps used in the signatures
    /// @param data Response data (a single `int256` encoded as `bytes` per
    /// beacon)
    /// @param signatures Request hash, a timestamp and the response data signed
    /// by the respective Airnode addresses
    /// @return dapiId ID of the dAPI that is updated
    function updateDapiWithSignedData(
        bytes32[] memory templateIds,
        bytes[] memory parameters,
        uint256[] memory timestamps,
        bytes[] memory data,
        bytes[] memory signatures
    ) public override returns (bytes32 dapiId) {
        uint256 beaconCount = templateIds.length;
        require(
            beaconCount == parameters.length &&
                beaconCount == timestamps.length &&
                beaconCount == data.length &&
                beaconCount == signatures.length,
            "Parameter length mismatch"
        );
        require(beaconCount > 1, "Specified less than two Beacons");
        bytes32[] memory beaconIds = new bytes32[](beaconCount);
        for (uint256 ind = 0; ind < beaconCount; ind++) {
            if (signatures[ind].length != 0) {
                require(timestampIsValid(timestamps[ind]), "Invalid timestamp");
                beaconIds[ind] = verifySignature(
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
                // Timestamp validity is already checked, which means it will
                // be small enough to be typecast into `uint32`
                accumulatedTimestamp += timestamps[ind];
            } else {
                DataPoint storage dataPoint = dataPoints[beaconIds[ind]];
                values[ind] = dataPoint.value;
                accumulatedTimestamp += dataPoint.timestamp;
            }
        }
        uint32 updatedTimestamp = uint32(accumulatedTimestamp / beaconCount);
        require(
            updatedTimestamp >= dataPoints[dapiId].timestamp,
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
    /// that was pointing at a Beacon can be pointed to a dAPI, then another
    /// dAPI, etc.
    /// @param name Human-readable name
    /// @param dataPointId Data point ID the name will point to
    function setName(bytes32 name, bytes32 dataPointId) external override {
        require(name != bytes32(0), "Name zero");
        require(dataPointId != bytes32(0), "Data point ID zero");
        require(
            msg.sender == manager ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    nameSetterRole,
                    msg.sender
                ),
            "Sender cannot set name"
        );
        nameHashToDataPointId[keccak256(abi.encodePacked(name))] = dataPointId;
        emit SetName(name, dataPointId, msg.sender);
    }

    /// @notice Returns the data point ID the name is set to
    /// @param name Name
    /// @return Data point ID
    function nameToDataPointId(bytes32 name)
        external
        view
        override
        returns (bytes32)
    {
        return nameHashToDataPointId[keccak256(abi.encodePacked(name))];
    }

    /// @notice Reads the data point with ID
    /// @param dataPointId ID of the data point that will be read
    /// @return value Data point value
    /// @return timestamp Data point timestamp
    function readWithDataPointId(bytes32 dataPointId)
        external
        view
        override
        returns (int224 value, uint32 timestamp)
    {
        require(
            readerCanReadDataPoint(dataPointId, msg.sender),
            "Sender cannot read"
        );
        DataPoint storage dataPoint = dataPoints[dataPointId];
        return (dataPoint.value, dataPoint.timestamp);
    }

    /// @notice Reads the data point with name
    /// @dev The read data point may belong to a Beacon or dAPI
    /// @param name Name of the data point
    /// @return value Data point value
    /// @return timestamp Data point timestamp
    function readWithName(bytes32 name)
        external
        view
        override
        returns (int224 value, uint32 timestamp)
    {
        bytes32 nameHash = keccak256(abi.encodePacked(name));
        require(
            readerCanReadDataPoint(nameHash, msg.sender),
            "Sender cannot read"
        );
        DataPoint storage dataPoint = dataPoints[
            nameHashToDataPointId[nameHash]
        ];
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

    /// @notice Derives the Beacon ID from the respective template ID and
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

    /// @notice Derives the dAPI ID from the beacon IDs
    /// @dev `abi.encode()` is used over `abi.encodePacked()`
    /// @param beaconIds Beacon IDs
    /// @return dapiId dAPI ID
    function deriveDapiId(bytes32[] memory beaconIds)
        public
        pure
        override
        returns (bytes32 dapiId)
    {
        dapiId = keccak256(abi.encode(beaconIds));
    }

    /// @notice Called privately to process the Beacon update
    /// @param beaconId Beacon ID
    /// @param timestamp Timestamp used in the signature
    /// @param data Fulfillment data (a single `int256` encoded as `bytes`)
    /// @return updatedBeaconValue Updated Beacon value
    function processBeaconUpdate(
        bytes32 beaconId,
        uint256 timestamp,
        bytes calldata data
    ) private returns (int256 updatedBeaconValue) {
        updatedBeaconValue = decodeFulfillmentData(data);
        require(
            timestamp > dataPoints[beaconId].timestamp,
            "Fulfillment older than Beacon"
        );
        // Timestamp validity is already checked by `onlyValidTimestamp`, which
        // means it will be small enough to be typecast into `uint32`
        dataPoints[beaconId] = DataPoint({
            value: int224(updatedBeaconValue),
            timestamp: uint32(timestamp)
        });
    }

    /// @notice Called privately to decode the fulfillment data
    /// @param data Fulfillment data (a single `int256` encoded as `bytes`)
    /// @return decodedData Decoded fulfillment data
    function decodeFulfillmentData(bytes memory data)
        private
        pure
        returns (int224)
    {
        require(data.length == 32, "Data length not correct");
        int256 decodedData = abi.decode(data, (int256));
        require(
            decodedData >= type(int224).min && decodedData <= type(int224).max,
            "Value typecasting error"
        );
        return int224(decodedData);
    }

    /// @notice Called privately to decode the condition parameters
    /// @param conditionParameters Condition parameters (a single `uint256`
    /// encoded as `bytes`)
    /// @return updateThresholdInPercentage Update threshold in percentage
    /// where 100% is represented as `HUNDRED_PERCENT`
    function decodeConditionParameters(bytes calldata conditionParameters)
        private
        pure
        returns (uint256 updateThresholdInPercentage)
    {
        require(conditionParameters.length == 32, "Incorrect parameter length");
        updateThresholdInPercentage = abi.decode(
            conditionParameters,
            (uint256)
        );
    }

    /// @notice Called privately to calculate update that the second value does
    /// over the first value in percentage where 100% is represented as
    /// `HUNDRED_PERCENT`
    /// @dev The percentage changes will be more pronounced when the first
    /// value is almost zero, which may trigger updates more frequently than
    /// wanted. To avoid this, Beacons should be defined in a way that the
    /// expected values are not small numbers floating around zero, i.e.,
    /// offset and scale.
    /// @param initialValue Initial value
    /// @param updatedValue Updated value
    /// @return updateInPercentage Update in percentage where 100% is
    /// represented as `HUNDRED_PERCENT`
    function calculateUpdateInPercentage(
        int224 initialValue,
        int224 updatedValue
    ) private pure returns (uint256 updateInPercentage) {
        int256 delta = int256(updatedValue) - int256(initialValue);
        uint256 absoluteDelta = delta > 0 ? uint256(delta) : uint256(-delta);
        uint256 absoluteFirstValue = initialValue > 0
            ? uint256(int256(initialValue))
            : uint256(-int256(initialValue));
        // Avoid division by 0
        if (absoluteFirstValue == 0) {
            absoluteFirstValue = 1;
        }
        updateInPercentage =
            (absoluteDelta * HUNDRED_PERCENT) /
            absoluteFirstValue;
    }
}
