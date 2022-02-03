// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./interfaces/IOwnableCallForwarder.sol";

/// @title Contract that forwards the calls that its owner sends
/// @dev AccessControlRegistry users that want their access control tables
/// to be transferrable (e.g., a DAO) will use this forwarder instead of
/// interacting with it directly. There are cases where this transferrability
/// is not desired, e.g., if the user is an Airnode and is immutably associated
/// with a single address, in which case the manager will interact with
/// AccessControlRegistry directly.
/// The ownership of this contract is deliberately renouncable. If this does
/// suit the use case, override and disable this functionality.
contract OwnableCallForwarder is Ownable, IOwnableCallForwarder {
    /// @notice Forwards the calldata and the value to the target address if
    /// the sender is the owner and returns the data
    /// @param forwardTarget Target address that the calldata will be forwarded
    /// to
    /// @param forwardedCalldata Calldata to be forwarded to the target address
    /// @return returnedData Data returned by the forwarded call
    function forwardCall(
        address forwardTarget,
        bytes calldata forwardedCalldata
    ) external payable override onlyOwner returns (bytes memory returnedData) {
        returnedData = Address.functionCallWithValue(
            forwardTarget,
            forwardedCalldata,
            msg.value
        );
    }
}
