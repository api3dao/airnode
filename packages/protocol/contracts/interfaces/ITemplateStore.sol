// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;


interface ITemplateStore {
    event TemplateCreated(
        bytes32 indexed templateId,
        bytes32 providerId,
        bytes32 endpointId,
        uint256 requesterInd,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes parameters
        );

    function createTemplate(
        bytes32 providerId,
        bytes32 endpointId,
        uint256 requesterInd,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
        )
        external
        returns (bytes32 templateId);

    function getTemplate(bytes32 templateId)
        external
        view
        returns (
            bytes32 providerId,
            bytes32 endpointId,
            uint256 requesterInd,
            address designatedWallet,
            address fulfillAddress,
            bytes4 fulfillFunctionId,
            bytes memory parameters
        );
}
