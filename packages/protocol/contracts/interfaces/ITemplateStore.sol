// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;


interface ITemplateStore {
    struct Template {
        bytes32 providerId;
        bytes32 endpointId;
        uint256 requesterInd;
        address designatedWallet;
        address fulfillAddress;
        address errorAddress;
        bytes4 fulfillFunctionId;
        bytes4 errorFunctionId;
        bytes parameters;
        }

    event TemplateCreated(
        bytes32 indexed templateId,
        bytes32 providerId,
        bytes32 endpointId,
        uint256 requesterInd,
        address designatedWallet,
        address fulfillAddress,
        address errorAddress,
        bytes4 fulfillFunctionId,
        bytes4 errorFunctionId,
        bytes parameters
        );

    function createTemplate(
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
        returns (bytes32 templateId);

    function getTemplate(bytes32 templateId)
        external
        view
        returns (Template memory template);
}
