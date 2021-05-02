// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./Mean.sol";
import "./Median.sol";

/// @title Mean-median hybrid reduction contract
/// @notice Mean is accurate but not robust. Median is inaccurate but robust.
/// Mean-median hybrid uses mean under normal circumstances for accuracy, but
/// falls back to median if there is a large enough discrepancy between mean
/// and median. Since the calculation of mean and its validation takes O(n)
/// time, it is more scalable than bare median under normal circumstances
/// (where mean will be similar to median).
/// @dev Even though the types are defined as `int256` for consistency, this
/// method is more suitable for similarly values. For example, consider the
/// values [-100, -4, 1, 1, 1, 1, 100]. The mean of these values is 0 and the
/// median is 1. Here, even though the mean is very close to the median, upper
/// and lower tolerances will be zero, which means the reduction will fall
/// back to median. Therefore, consider using Median.sol instead for values
/// with potentially alternating signs.
/// Note that there is a potential for overflow while summing large enough
/// values (in `Mean.aggregateInplace`). If that is a probability, use
/// Median.sol instead.
contract MeanMedianHybrid is Mean, Median {
    /// @notice Percentages are represented by multiplying by 1,000,000 (1e6)
    int256 public constant HUNDRED_PERCENT = 100e6;

    /// @notice Reduces the array of values by computing their mean, checking
    /// if the mean is similar enough to median, and computing the median
    /// instead if it is not
    /// @param values Values to be reduced
    function computeMeanMedianHybridInPlace(
        int256[] memory values,
        int256 toleranceInPercentages
        )
        internal
        pure
        returns (int256)
    {
        int256 mean = computeMean(values);
        // Test the mean for validity
        int256 upperTolerance = mean * (HUNDRED_PERCENT + toleranceInPercentages) / HUNDRED_PERCENT;
        int256 lowerTolerance = mean * (HUNDRED_PERCENT - toleranceInPercentages) / HUNDRED_PERCENT;
        uint256 upperToleranceValidityCount;
        uint256 lowerToleranceValidityCount;
        for (uint256 i = 0; i < values.length; i++) {
            if (upperTolerance >= values[i]) {
                upperToleranceValidityCount++;
            }
            if (lowerTolerance <= values[i]) {
                lowerToleranceValidityCount++;
            }
        }
        if (upperToleranceValidityCount >= values.length / 2) {
            if (lowerToleranceValidityCount >= values.length / 2) {
                return mean;
            }
        }
        // Fall back to median if the mean is not valid
        return computeMedianInPlace(values);
    }
}
