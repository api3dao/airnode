// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../AirnodeRequester.sol";

contract MockSponsor is AirnodeRequester {
    constructor(address _airnodeProtocol) AirnodeRequester(_airnodeProtocol) {}

    function requestWithdrawal(address airnodeOrRelayer, uint256 protocolId)
        external
    {
        IAirnodeProtocol(airnodeProtocol).requestWithdrawal(
            airnodeOrRelayer,
            protocolId
        );
    }

    function claimBalance() external {
        IAirnodeProtocol(airnodeProtocol).claimBalance();
    }
}
