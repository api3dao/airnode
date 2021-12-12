// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IOwnableCallForwarder.sol";

/// @title Contract that forwards the calls that its owner sends
/// @dev AccessControlRegistry users that want their access control tables
/// to be transferrable (e.g., a DAO) will use this forwarder instead of
/// interacting with it directly. There are cases where this transferrability
/// is not desired, e.g., if the user is an Airnode and is immutably associated
/// with a single address, in which case the manager will interact with
/// AccessControlRegistry directly.
contract OwnableCallForwarder is Ownable, IOwnableCallForwarder {
    function forwardCall(
        address targetAddress,
        bytes calldata forwardedCalldata
    ) external payable override onlyOwner returns (bytes memory returnedData) {
        bool callSuccess;
        (callSuccess, returnedData) = targetAddress.call{value: msg.value}( // solhint-disable-line avoid-low-level-calls
            forwardedCalldata
        );
        require(callSuccess, "Call unsuccessful");
        emit ForwardedCall(
            targetAddress,
            msg.value,
            forwardedCalldata,
            returnedData
        );
    }
}
