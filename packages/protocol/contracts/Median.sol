// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

contract Median {

    function _median1(uint256[] calldata array)
        public
        pure
        returns (uint256 _median)
    {
        _median = array[0];
    }

    function _median2(uint256[] calldata array)
        public
        pure
        returns (uint256 _median)
    {
        _median = (array[0] + array[1]) / 2;
    }

    function _median3(uint256[] calldata array)
        public
        pure
        returns (uint256 _median)
    {
        uint256 x0 = array[0];
        uint256 x1 = array[1];
        _median = x1;
        uint256 x2 = array[2];

        if (x0 > x1) {(x0, x1) = (x1, x0);}
        if (x1 > x2) {(x1, x2) = (x2, x1);}
        if (x0 > x1) {(x0, x1) = (x1, x0);}

        _median = x1;
    }

    function _median4(uint256[] calldata array)
        public
        pure
        returns (uint256 _median)
    {
        uint256 x0 = array[0];
        uint256 x1 = array[1];
        uint256 x2 = array[2];
        uint256 x3 = array[3];

        // bubble up largest to end of array
        if (x0 > x1) {(x0, x1) = (x1, x0);}
        if (x1 > x2) {(x1, x2) = (x2, x1);}
        if (x2 > x3) {(x2, x3) = (x3, x2);}
        // bubble down smallest to front of array
        if (x1 > x2) {(x1, x2) = (x2, x1);}
        if (x0 > x1) {(x0, x1) = (x1, x0);}

        _median = (x1 + x2) / 2;
    }
}
