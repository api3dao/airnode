// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./Mean.sol";
import "./Median.sol";
import "./Reducer.sol";

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
  /// @notice Reduction will fall back to median if the median is not with
  /// a [-toleranceInPercentages, toleranceInPercentages] neighborhood of the
  /// mean
  int256 public toleranceInPercentages;

  /// @dev Reverts if the percentage value is not valid
  /// @param percentageValue A percentage value represented by multiplying by
  /// 1,000,000 (1e6)
  modifier onlyValidPercentage(int256 percentageValue) {
    require(percentageValue >= 0 && percentageValue <= HUNDRED_PERCENT, "Invalid percentage");
    _;
  }

  /// @param _toleranceInPercentages Tolerance in percentages
  constructor(int256 _toleranceInPercentages) onlyValidPercentage(_toleranceInPercentages) {
    toleranceInPercentages = _toleranceInPercentages;
  }

  /// @notice Called by the owner to set the tolerance
  /// @dev This should be set high enough that the reduction does not fall
  /// back to median unless there is a misreport among the values to be
  /// reduced
  /// @param _toleranceInPercentages Tolerance in percentages
  function setTolerance(int256 _toleranceInPercentages)
    external
    onlyValidPercentage(_toleranceInPercentages)
  // onlyOwner
  {
    toleranceInPercentages = _toleranceInPercentages;
  }

  /// @notice Reduces the array of values by computing their mean, checking
  /// if the mean is similar enough to median, and computing the median
  /// instead if it is not
  /// @param values Values to be reduced
  function reduceInPlace(int256[] memory values) internal view virtual override(Mean, Median) returns (int256) {
    int256 mean = Mean.reduceInPlace(values);
    // Test the mean for validity
    int256 upperTolerance = (mean * (HUNDRED_PERCENT + toleranceInPercentages)) / HUNDRED_PERCENT;
    int256 lowerTolerance = (mean * (HUNDRED_PERCENT - toleranceInPercentages)) / HUNDRED_PERCENT;
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
    return Median.reduceInPlace(values);
  }
}
