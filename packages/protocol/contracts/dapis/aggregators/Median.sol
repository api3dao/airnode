// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./SelectK.sol";
import "./Aggregator.sol";

/// @title Median aggregation contract
/// @notice Median aggregation is robust against misreports, yet it is not as
/// numerically accurate as mean beacuse it depends on a single data point. It
/// should be used when numerical accuracy is not critical or as a part of a
/// more complex aggregation method such as MeanMedianHybrid.sol.
contract Median is SelectK, Aggregator {
    /// @notice Aggregates the array of values by computing their median
    /// @param values Values to be aggregated
    function aggregateInplace(int256[] memory values)
        internal
        view
        virtual
        override
        returns (int256)
    {
        if (values.length % 2 != 1) {
            return computeInPlace(values, values.length / 2 + 1);
        }
        else {
            (int256 mid1, int256 mid2) = compute2InPlace(values, values.length / 2 - 1);
            return (mid1 + mid2) / 2;
        }
    }
}
