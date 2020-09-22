// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

import "./IEndpointStore.sol";
import "./ITemplateStore.sol";


interface IAirnode is IEndpointStore, ITemplateStore {
    event RequestMade(
        bytes32 indexed providerId,
        bytes32 requestId,
        address requester,
        bytes32 templateId,
        uint256 requesterInd,
        address designatedWallet,
        address fulfillAddress,
        address errorAddress,
        bytes4 fulfillFunctionId,
        bytes4 errorFunctionId,
        bytes parameters
        );

    event ShortRequestMade(
        bytes32 indexed providerId,
        bytes32 requestId,
        address requester,
        bytes32 templateId,
        bytes parameters
        );

    event FullRequestMade(
        bytes32 indexed providerId,
        bytes32 requestId,
        address requester,
        bytes32 endpointId,
        uint256 requesterInd,
        address designatedWallet,
        address fulfillAddress,
        address errorAddress,
        bytes4 fulfillFunctionId,
        bytes4 errorFunctionId,
        bytes parameters
        );

    event FulfillmentSuccessful(
        bytes32 indexed providerId,
        bytes32 requestId,
        bytes32 data
        );

    event FulfillmentBytesSuccessful(
        bytes32 indexed providerId,
        bytes32 requestId,
        bytes data
        );

    event FulfillmentErrored(
        bytes32 indexed providerId,
        bytes32 requestId,
        uint256 errorCode
        );

    event FulfillmentFailed(
        bytes32 indexed providerId,
        bytes32 requestId
        );


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
        returns (bytes32 requestId);

    function makeShortRequest(
        bytes32 templateId,
        bytes calldata parameters
        )
        external
        returns (bytes32 requestId);

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
        returns (bytes32 requestId);

    function fulfill(
        bytes32 providerId,
        bytes32 requestId,
        bytes32 data,
        address fulfillAddress,
        address errorAddress,
        bytes4 fulfillFunctionId,
        bytes4 errorFunctionId
        )
        external
        returns(
            bool callSuccess,
            bytes memory callData
        );

    function fulfillBytes(
        bytes32 providerId,
        bytes32 requestId,
        bytes calldata data,
        address fulfillAddress,
        address errorAddress,
        bytes4 fulfillFunctionId,
        bytes4 errorFunctionId
        )
        external
        returns(
            bool callSuccess,
            bytes memory callData
        );

    function error(
        bytes32 providerId,
        bytes32 requestId,
        uint256 errorCode,
        address fulfillAddress,
        address errorAddress,
        bytes4 fulfillFunctionId,
        bytes4 errorFunctionId
        )
        external
        returns(
            bool callSuccess,
            bytes memory callData
        );

    function fail(
        bytes32 providerId,
        bytes32 requestId,
        address fulfillAddress,
        address errorAddress,
        bytes4 fulfillFunctionId,
        bytes4 errorFunctionId
        )
        external;
}
