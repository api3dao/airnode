// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../Median.sol";

contract MockMedian is Median {
    function exposedMedian(int256[] memory array)
        external
        pure
        returns (int256)
    {
        return median(array);
    }
}
