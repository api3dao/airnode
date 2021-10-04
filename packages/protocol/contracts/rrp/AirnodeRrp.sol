// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./AuthorizationUtils.sol";
import "./TemplateUtils.sol";
import "./WithdrawalUtils.sol";
import "./interfaces/IAirnodeRrp.sol";

/// @title Contract that implements the Airnode request–response protocol (RRP)
contract AirnodeRrp is
    AuthorizationUtils,
    TemplateUtils,
    WithdrawalUtils,
    IAirnodeRrp
{
    /// @notice Called to get the extended public key of the Airnode
    /// @dev The xpub belongs to the HDNode with the path m/44'/60'/0'
    mapping(address => string) public override airnodeToXpub;

    /// @notice Called to get the sponsorship status for a sponsor–requester
    /// pair
    mapping(address => mapping(address => bool))
        public
        override sponsorToRequesterToSponsorshipStatus;

    /// @notice Called to get the request count of the requester plus one
    /// @dev Can be used to calculate the ID of the next request the requester
    /// will make
    mapping(address => uint256) public override requesterToRequestCountPlusOne;

    /// @dev Hash of expected fulfillment parameters are kept to verify that
    /// the fulfillment will be done with the correct parameters. This value is
    /// also used to check if the fulfillment for the particular request is
    /// expected (i.e., if there are recorded fulfillment parameters)
    mapping(bytes32 => bytes32) private requestIdToFulfillmentParameters;

    /// @dev Reverts if the incoming fulfillment parameters do not match the
    /// ones provided in the request
    /// @param requestId Request ID
    /// @param airnode Airnode address
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    modifier onlyCorrectFulfillmentParameters(
        bytes32 requestId,
        address airnode,
        address fulfillAddress,
        bytes4 fulfillFunctionId
    ) {
        require(
            keccak256(
                abi.encodePacked(
                    airnode,
                    msg.sender,
                    fulfillAddress,
                    fulfillFunctionId
                )
            ) == requestIdToFulfillmentParameters[requestId],
            "Invalid request fulfillment"
        );
        _;
    }

    /// @notice Called by the Airnode operator to announce its extended public
    /// key
    /// @dev It is expected for the Airnode operator to call this function with
    /// the respective Airnode's default BIP 44 wallet (m/44'/60'/0'/0/0), to
    /// report the xpub belongs to the HDNode with the path m/44'/60'/0'. Then,
    /// if the address of the default BIP 44 wallet derived from the extended
    /// public key (with the remaining non-hardened path, 0/0) does not match
    /// the respective Airnode address, the extended public key is invalid
    /// (does not belong to the respective Airnode).
    /// An Airnode operator can also announce their extended public key through
    /// off-chain channels. Validation method remains the same.
    /// The extended public key of an Airnode is used with a sponsor address to
    /// derive the address of the respective sponsor wallet.
    /// @param xpub Extended public key of the Airnode
    function setAirnodeXpub(string calldata xpub) external override {
        airnodeToXpub[msg.sender] = xpub;
        emit SetAirnodeXpub(msg.sender, xpub);
    }

    /// @notice Called by the sponsor to set the sponsorship status of a
    /// requester, i.e., allow or disallow a requester to make requests that
    /// will be fulfilled by the sponsor wallet
    /// @dev This is not Airnode-specific, i.e., the sponsor allows the
    /// requester's requests to be fulfilled through its sponsor wallets across
    /// all Airnodes
    /// @param requester Requester address
    /// @param sponsorshipStatus Sponsorship status
    function setSponsorshipStatus(address requester, bool sponsorshipStatus)
        external
        override
    {
        // Initialize the requester request count for consistent request gas
        // cost
        if (requesterToRequestCountPlusOne[requester] == 0) {
            requesterToRequestCountPlusOne[requester] = 1;
        }
        sponsorToRequesterToSponsorshipStatus[msg.sender][
            requester
        ] = sponsorshipStatus;
        emit SetSponsorshipStatus(msg.sender, requester, sponsorshipStatus);
    }

    /// @notice Called by the requester to make a request that refers to a
    /// template for the Airnode address, endpoint ID and parameters
    /// @dev `fulfillAddress` is not allowed to be the address of this
    /// contract. This is not actually needed to protect users that use the
    /// protocol as intended, but it is done for good measure.
    /// @param templateId Template ID
    /// @param sponsor Sponsor address
    /// @param sponsorWallet Sponsor wallet that is requested to fulfill the
    /// request
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    /// @return requestId Request ID
    function makeTemplateRequest(
        bytes32 templateId,
        address sponsor,
        address sponsorWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external override returns (bytes32 requestId) {
        address airnode = templates[templateId].airnode;
        // If the Airnode address of the template is zero the template does not
        // exist because template creation does not allow zero Airnode address
        require(airnode != address(0), "Template does not exist");
        require(fulfillAddress != address(this), "Fulfill address AirnodeRrp");
        require(
            sponsorToRequesterToSponsorshipStatus[sponsor][msg.sender],
            "Requester not sponsored"
        );
        uint256 requesterRequestCount = requesterToRequestCountPlusOne[
            msg.sender
        ];
        requestId = keccak256(
            abi.encodePacked(
                requesterRequestCount,
                block.chainid,
                msg.sender,
                templateId,
                sponsor,
                parameters
            )
        );
        requestIdToFulfillmentParameters[requestId] = keccak256(
            abi.encodePacked(
                airnode,
                sponsorWallet,
                fulfillAddress,
                fulfillFunctionId
            )
        );
        requesterToRequestCountPlusOne[msg.sender]++;
        emit MadeTemplateRequest(
            airnode,
            requestId,
            requesterRequestCount,
            block.chainid,
            msg.sender,
            templateId,
            sponsor,
            sponsorWallet,
            fulfillAddress,
            fulfillFunctionId,
            parameters
        );
    }

    /// @notice Called by the requester to make a full request, which provides
    /// all of its parameters as arguments and does not refer to a template
    /// @dev `fulfillAddress` is not allowed to be the address of this
    /// contract. This is not actually needed to protect users that use the
    /// protocol as intended, but it is done for good measure.
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID (allowed to be `bytes32(0)`)
    /// @param sponsor Sponsor address
    /// @param sponsorWallet Sponsor wallet that is requested to fulfill
    /// the request
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @param parameters All request parameters
    /// @return requestId Request ID
    function makeFullRequest(
        address airnode,
        bytes32 endpointId,
        address sponsor,
        address sponsorWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external override returns (bytes32 requestId) {
        require(airnode != address(0), "Airnode address zero");
        require(fulfillAddress != address(this), "Fulfill address AirnodeRrp");
        require(
            sponsorToRequesterToSponsorshipStatus[sponsor][msg.sender],
            "Requester not sponsored"
        );
        uint256 requesterRequestCount = requesterToRequestCountPlusOne[
            msg.sender
        ];
        requestId = keccak256(
            abi.encodePacked(
                requesterRequestCount,
                block.chainid,
                msg.sender,
                endpointId,
                sponsor,
                parameters
            )
        );
        requestIdToFulfillmentParameters[requestId] = keccak256(
            abi.encodePacked(
                airnode,
                sponsorWallet,
                fulfillAddress,
                fulfillFunctionId
            )
        );
        requesterToRequestCountPlusOne[msg.sender]++;
        emit MadeFullRequest(
            airnode,
            requestId,
            requesterRequestCount,
            block.chainid,
            msg.sender,
            endpointId,
            sponsor,
            sponsorWallet,
            fulfillAddress,
            fulfillFunctionId,
            parameters
        );
    }

    /// @notice Called by Airnode to fulfill the request (template or full)
    /// @dev The data is ABI-encoded as a `bytes` type, with its format
    /// depending on the request specifications.
    /// This will not revert depending on the external call. However, it will
    /// return `false` if the external call reverts or if there is no function
    /// with a matching signature at `fulfillAddress`. On the other hand, it
    /// will return `true` if the external call returns successfully or if
    /// there is no contract deployed at `fulfillAddress`.
    /// If `callSuccess` is `false`, `callData` can be decoded to retrieve the
    /// revert string.
    /// @param requestId Request ID
    /// @param airnode Airnode address
    /// @param data Fulfillment data
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function fulfill(
        bytes32 requestId,
        address airnode,
        bytes calldata data,
        address fulfillAddress,
        bytes4 fulfillFunctionId
    )
        external
        override
        onlyCorrectFulfillmentParameters(
            requestId,
            airnode,
            fulfillAddress,
            fulfillFunctionId
        )
        returns (bool callSuccess, bytes memory callData)
    {
        delete requestIdToFulfillmentParameters[requestId];
        (callSuccess, callData) = fulfillAddress.call( // solhint-disable-line avoid-low-level-calls
            abi.encodeWithSelector(fulfillFunctionId, requestId, data)
        );
        if (callSuccess) {
            emit FulfilledRequest(airnode, requestId, data);
        } else {
            // We do not bubble up the revert string from `callData`
            emit FailedRequest(
                airnode,
                requestId,
                "Fulfillment failed unexpectedly"
            );
        }
    }

    /// @notice Called by Airnode if the request cannot be fulfilled
    /// @dev Airnode should fall back to this if a request cannot be fulfilled
    /// because static call to `fulfill()` returns `false` for `callSuccess`
    /// @param requestId Request ID
    /// @param airnode Airnode address
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @param errorMessage A message that explains why the request has failed
    function fail(
        bytes32 requestId,
        address airnode,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        string calldata errorMessage
    )
        external
        override
        onlyCorrectFulfillmentParameters(
            requestId,
            airnode,
            fulfillAddress,
            fulfillFunctionId
        )
    {
        delete requestIdToFulfillmentParameters[requestId];
        emit FailedRequest(airnode, requestId, errorMessage);
    }

    /// @notice Called to check if the request with the ID is made but not
    /// fulfilled/failed yet
    /// @dev If a requester has made a request, received a request ID but did
    /// not hear back, it can call this method to check if the Airnode has
    /// called back `fail()` instead.
    /// @param requestId Request ID
    /// @return isAwaitingFulfillment If the request is awaiting fulfillment
    /// (i.e., `true` if `fulfill()` or `fail()` is not called back yet,
    /// `false` otherwise)
    function requestIsAwaitingFulfillment(bytes32 requestId)
        external
        view
        override
        returns (bool isAwaitingFulfillment)
    {
        isAwaitingFulfillment =
            requestIdToFulfillmentParameters[requestId] != bytes32(0);
    }
}
