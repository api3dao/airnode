// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IWithdrawalUtils.sol";

contract WithdrawalUtils is IWithdrawalUtils {
    mapping(address => uint256) public sponsorToWithdrawalRequestCount;

    mapping(bytes32 => bytes32) private withdrawalRequestIdToParameters;

    mapping(address => uint256) public sponsorToBalance;

    function requestWithdrawal(
        address reporter,
        uint256 protocolId,
        address sponsorWallet
    ) external override {
        require(reporter != address(0), "Reporter address zero");
        require(protocolId != 0, "Protocol ID zero");
        require(sponsorWallet != address(0), "Sponsor wallet address zero");
        bytes32 withdrawalRequestId = keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                msg.sender,
                ++sponsorToWithdrawalRequestCount[msg.sender]
            )
        );
        withdrawalRequestIdToParameters[withdrawalRequestId] = keccak256(
            abi.encodePacked(reporter, msg.sender, protocolId, sponsorWallet)
        );
        emit RequestedWithdrawal(
            reporter,
            msg.sender,
            withdrawalRequestId,
            protocolId,
            sponsorWallet
        );
    }

    function fulfillWithdrawal(
        bytes32 withdrawalRequestId,
        address reporter,
        address sponsor,
        uint256 protocolId
    ) external payable override {
        require(
            withdrawalRequestIdToParameters[withdrawalRequestId] ==
                keccak256(
                    abi.encodePacked(reporter, sponsor, protocolId, msg.sender)
                ),
            "Invalid withdrawal fulfillment"
        );
        delete withdrawalRequestIdToParameters[withdrawalRequestId];
        sponsorToBalance[sponsor] += msg.value;
        emit FulfilledWithdrawal(
            reporter,
            sponsor,
            withdrawalRequestId,
            protocolId,
            msg.sender,
            msg.value
        );
    }

    function withdrawBalance() external override {
        uint256 sponsorBalance = sponsorToBalance[msg.sender];
        require(sponsorBalance != 0, "Sender balance zero");
        sponsorToBalance[msg.sender] = 0;
        emit ExecutedWithdrawal(msg.sender, sponsorBalance);
        (bool success, ) = msg.sender.call{value: sponsorBalance}(""); // solhint-disable-line avoid-low-level-calls
        require(success, "Transfer failed");
    }
}
