// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

/// @title The abstract contract that generalizes reduction methods
/// @notice Reduction method implementations should inherit this contract
abstract contract Reducer {
  /// @notice Called internally by the dAPI contract to reduce an array of
  /// values
  /// @dev It is not guaranteed that `values` will not be changed after this
  /// method runs
  /// @param values Values to be reduced
  function reduceInPlace(int256[] memory values) internal view virtual returns (int256);
}
