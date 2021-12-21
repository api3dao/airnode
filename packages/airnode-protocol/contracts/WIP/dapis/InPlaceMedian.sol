// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./InPlaceSort.sol";

contract InPlaceMedian is InPlaceSort {
    function computeMedianInPlace(int256[] memory values)
        internal
        pure
        returns (int256)
    {
        uint256 arrayLength = values.length;
        require(arrayLength <= MAX_ARRAY_LENGTH, "Array longer than maximum");
        sortValuesInPlace(values);
        if (arrayLength % 2 == 1) {
            return values[arrayLength / 2];
        }
        // The addition may potentially cause an overflow, which will revert
        return (values[arrayLength / 2] + values[arrayLength / 2 + 1]) / 2;
    }
}
