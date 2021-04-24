// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

/// @title The abstract contract that generalizes aggregation methods
/// @notice Aggregation method implementations should inherit this contract
abstract contract Aggregator {
    /// @notice Called internally by the dAPI contract to aggregate an array of
    /// values
    /// @dev It is not guaranteed that `values` will not be changed after this
    /// method runs
    /// @param values Values to be aggregated
    function aggregateInplace(int256[] memory values)
        internal
        view
        virtual
        returns (int256);
}
