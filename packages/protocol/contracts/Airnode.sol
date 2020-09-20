// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

import "./interfaces/IAirnode.sol";
import "./EndpointStore.sol";
import "./TemplateStore.sol";


/// @title The contract used to make and fulfill requests
/// @notice Clients use this contract to make requests that follow a
/// request-response scheme. In addition, it inherits from contracts that keep
/// records of providers, requesters, endpoints, etc.
contract Airnode is EndpointStore, TemplateStore, IAirnode {
    mapping(bytes32 => address) private requestIdToDesignatedWallet;
    mapping(bytes32 => bool) private requestWithIdHasFailed;
    uint256 private noRequests = 0;


    /// @notice Called by the client to make a regular request. A regular
    /// request refers to a template for the requester-agnostic parameters, but
    /// requires the client to provide the requester-specific parameters.
    /// @dev This is the recommended way of making a request in most cases. Use
    /// makeShortRequest() if gas efficiency is critical.
    /// @param templateId Template ID from TemplateStore
    /// @param requesterInd Requester index from RequesterStore
    /// @param designatedWallet Designated wallet that is requested to fulfill
    /// the request
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param errorAddress Address that will be called to error
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @param errorFunctionId Signature of the function that will be called
    /// to error
    /// @param parameters Dynamic request parameters (i.e., parameters that are
    /// determined at runtime, unlike the static parameters stored in the
    /// template)
    /// @return requestId Request ID
    function makeRequest(
        bytes32 templateId,
        uint256 requesterInd,
        address designatedWallet,
        address fulfillAddress,
        address errorAddress,
        bytes4 fulfillFunctionId,
        bytes4 errorFunctionId,
        bytes calldata parameters
        )
        external
        override
        onlyIfDesignatedWalletIsFunded(
          designatedWallet,
          providers[templates[templateId].providerId].minBalance
          )
        returns (bytes32 requestId)
    {
        requestId = keccak256(abi.encodePacked(
            noRequests++,
            this,
            msg.sender
            ));
        requestIdToDesignatedWallet[requestId] = designatedWallet;
        emit RequestMade(
            templates[templateId].providerId,
            requestId,
            msg.sender,
            templateId,
            requesterInd,
            designatedWallet,
            fulfillAddress,
            errorAddress,
            fulfillFunctionId,
            errorFunctionId,
            parameters
        );
    }

    /// @notice Called by the requester to make a short request. A short
    /// request refers to a template, which the provider will use to get both
    /// requester-agnostic and requester-specific parameters
    /// @dev Use this if gas efficiency is critical
    /// @param templateId Template ID from TemplateStore
    /// @param parameters Dynamic request parameters (i.e., parameters that are
    /// determined at runtime, unlike the static parameters stored in the
    /// template)
    /// @return requestId Request ID
    function makeShortRequest(
        bytes32 templateId,
        bytes calldata parameters
        )
        external
        override
        onlyIfDesignatedWalletIsFunded(
          templates[templateId].designatedWallet,
          providers[templates[templateId].providerId].minBalance
          )
        returns (bytes32 requestId)
    {
        requestId = keccak256(abi.encodePacked(
            noRequests++,
            this,
            msg.sender
            ));
        requestIdToDesignatedWallet[requestId] = templates[templateId].designatedWallet;
        emit ShortRequestMade(
            templates[templateId].providerId,
            requestId,
            msg.sender,
            templateId,
            parameters
        );
    }

    /// @notice Called by the requester to make a full request. A full request
    /// does not refer to a template, meaning that it passes all the parameters
    /// in the request. It does not require a template to be created
    /// beforehand, which provides extra flexibility compared to makeRequest()
    /// and makeShortRequest().
    /// @dev This is the least gas efficient way of making a request. Do not
    /// use it unless you have a good reason.
    /// @param providerId Provider ID from ProviderStore
    /// @param endpointId Endpoint ID from EndpointStore
    /// @param requesterInd Requester index from RequesterStore
    /// @param designatedWallet Designated wallet that is requested to fulfill
    /// the request
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param errorAddress Address that will be called to error
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @param errorFunctionId Signature of the function that will be called
    /// to error
    /// @param parameters All request parameters
    /// @return requestId Request ID
    function makeFullRequest(
        bytes32 providerId,
        bytes32 endpointId,
        uint256 requesterInd,
        address designatedWallet,
        address fulfillAddress,
        address errorAddress,
        bytes4 fulfillFunctionId,
        bytes4 errorFunctionId,
        bytes calldata parameters
        )
        external
        override
        onlyIfDesignatedWalletIsFunded(
          designatedWallet,
          providers[providerId].minBalance
          )
        returns (bytes32 requestId)
    {
        requestId = keccak256(abi.encodePacked(
            noRequests++,
            this,
            msg.sender
            ));
        requestIdToDesignatedWallet[requestId] = designatedWallet;
        emit FullRequestMade(
            providerId,
            requestId,
            msg.sender,
            endpointId,
            requesterInd,
            designatedWallet,
            fulfillAddress,
            errorAddress,
            fulfillFunctionId,
            errorFunctionId,
            parameters
        );
    }

    /// @notice Called by the oracle node to fulfill individual requests
    /// (including regular, short and full requests)
    /// @param providerId Provider ID from ProviderStore
    /// @param requestId Request ID
    /// @param data Oracle response
    /// @param fulfillAddress Address that will be called
    /// @param fulfillFunctionId Signature of the function that will be called
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function fulfill(
        bytes32 providerId,
        bytes32 requestId,
        bytes32 data,
        address fulfillAddress,
        bytes4 fulfillFunctionId
        )
        external
        override
        onlyDesignatedWallet(requestId)
        returns(
            bool callSuccess,
            bytes memory callData
        )
    {
        delete requestIdToDesignatedWallet[requestId];
        emit FulfillmentSuccessful(
            providerId,
            requestId,
            data
            );
        (callSuccess, callData) = fulfillAddress.call(
            abi.encodeWithSelector(fulfillFunctionId, requestId, data)
            );
    }

    /// @notice Called by the oracle node to fulfill individual requests
    /// (including regular, short and full requests) with a bytes type response
    /// @dev The oracle uses this method to fulfill if the requester has
    /// specifically asked for a bytes type response
    /// @param providerId Provider ID from ProviderStore
    /// @param requestId Request ID
    /// @param data Oracle response of type bytes
    /// @param fulfillAddress Address that will be called
    /// @param fulfillFunctionId Signature of the function that will be called
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function fulfillBytes(
        bytes32 providerId,
        bytes32 requestId,
        bytes calldata data,
        address fulfillAddress,
        bytes4 fulfillFunctionId
        )
        external
        override
        onlyDesignatedWallet(requestId)
        returns(
            bool callSuccess,
            bytes memory callData
        )
    {
        delete requestIdToDesignatedWallet[requestId];
        emit FulfillmentBytesSuccessful(
            providerId,
            requestId,
            data
            );
        (callSuccess, callData) = fulfillAddress.call(
            abi.encodeWithSelector(fulfillFunctionId, requestId, data)
            );
    }

    /// @notice Called by the oracle node if a request could not be fulfilled
    /// for any reason
    /// @dev The oracle may specify the error using errorCode. The specification
    /// format is outside the scope of this contract. Refer to the specific
    /// oracle node documentations for more information.
    /// @param providerId Provider ID from ProviderStore
    /// @param requestId Request ID
    /// @param errorCode Error code
    /// @param errorAddress Address that will be called
    /// @param errorFunctionId Signature of the function that will be called
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function error(
        bytes32 providerId,
        bytes32 requestId,
        uint256 errorCode,
        address errorAddress,
        bytes4 errorFunctionId
        )
        external
        override
        onlyDesignatedWallet(requestId)
        returns(
            bool callSuccess,
            bytes memory callData
        )
    {
        delete requestIdToDesignatedWallet[requestId];
        emit FulfillmentErrored(
            providerId,
            requestId,
            errorCode
            );
        (callSuccess, callData) = errorAddress.call(
            abi.encodeWithSelector(errorFunctionId, requestId, errorCode)
            );
    }

    /// @notice Called by the oracle node if a request could neither be fulfilled
    /// nor errored
    /// @dev The oracle should fall back to this if a request cannot be fulfilled
    /// and error() is reverting
    /// @param providerId Provider ID from ProviderStore
    /// @param requestId Request ID
    function fail(
        bytes32 providerId,
        bytes32 requestId
        )
        external
        override
        onlyDesignatedWallet(requestId)
    {
        delete requestIdToDesignatedWallet[requestId];
        // Failure is recorded so that it can be checked externally with
        // checkIfRequestHasFailed()
        requestWithIdHasFailed[requestId] = true;
        emit FulfillmentFailed(
            providerId,
            requestId
            );
    }

    /// @notice Used to check if a request has failed because it could neither
    /// be fulfilled nor errored
    /// @param requestId Request ID
    /// @return status If the request has failed
    function checkIfRequestHasFailed(bytes32 requestId)
        external
        view
        returns(bool status)
    {
        status = requestWithIdHasFailed[requestId];
    }

    /// @dev Reverts unless the caller is not the designated wallet requested
    /// to fulfill the respective request
    /// @param requestId Request ID
    modifier onlyDesignatedWallet(bytes32 requestId)
    {
        require(
            requestIdToDesignatedWallet[requestId] == msg.sender,
            "Not the wallet requested to fulfill this request"
            );
        _;
    }
}
