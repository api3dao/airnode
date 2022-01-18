// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../InPlaceMedian.sol";

contract MockInPlaceMedian is InPlaceMedian {
    function externalComputeMedianInPlace(int256[] memory values)
        external
        pure
        returns (int256)
    {
        return computeMedianInPlace(values);
    }

    function externalSortValuesInPlace(int256[] memory values)
        external
        pure
        returns (int256[] memory)
    {
        sortValuesInPlace(values);
        return values;
    }
}
