// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;


interface ConvenienceInterface {
    function getTemplates(bytes32[] calldata templateIds)
          external
          view
          returns (
              bytes32[] memory providerIds,
              bytes32[] memory endpointIds,
              address[] memory fulfillAddresses,
              address[] memory errorAddresses,
              bytes4[] memory fulfillFunctionIds,
              bytes4[] memory errorFunctionIds,
              bytes[] memory parameters
          );

    function getDataWithClientAddress(
        bytes32 providerId,
        address clientAddress
        )
        external
        view
        returns (
            bytes32 requesterId,
            uint256 walletInd,
            address walletAddress,
            uint256 walletBalance,
            uint256 minBalance
            );
}
