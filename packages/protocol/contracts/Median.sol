// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

contract Median {

    function compute
    (
      uint256[] memory array
    )
        public
        pure
        returns (uint256 median)
    {
        // require array < 256

        if (array.length == 1)
        {
            median = array[0];
        }
        else if (array.length == 2)
        {
            median = (array[0] + array[1]) / 2;
        }
        else if (array.length == 3)
        {
            median = _median3(
              array[0],
              array[1],
              array[2]
            );
        }
        else if (array.length == 4)
        {
            median = _median4(
              array[0],
              array[1],
              array[2],
              array[4]
            );
        }
        else if (array.length == 5)
        {
            median = _median5(
              array[0],
              array[1],
              array[2],
              array[3],
              array[4]
            );
        }
        else
        {
            uint256 pivotVal = _medianOfMedians(array);
            //int8 i = _quickselect(pivot, array);
            median = 0;
        }
    }

    function _medianOfMedians
    (
      uint256[] memory array
    )
        public
        pure
        returns (uint256 _pivot)
    {
        uint256[] memory medians = new uint256[](array.length/5);
        uint256 med;

        for (uint i=0; i<array.length-array.length%5; i+=5)
        {
          med = _median5(
            array[i],
            array[i+1],
            array[i+2],
            array[i+3],
            array[i+4]
          );
          medians[i/5] = (med);   
        }
        
        _pivot = compute(medians);
    }

    function _partition
    ( uint256[] memory array,
      uint8 left,
      uint8 right,
      uint256 pivotVal
    )
      public
      pure
      returns (uint8 idx)
    {
      uint8 storeIdx = left;
      for (uint8 i=left; i<right; i++)
      {
        if (array[i] < pivotVal)
        {
          _swap(array, storeIdx, i);
          storeIdx++;
        }
      }
      return storeIdx;
    }

    function _swap
    (
      uint256[] memory array,
      uint8 i,
      uint8 j
    )
      public
      pure
    {
      uint256 temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }

    function _median3
    (
      uint256 x0,
      uint256 x1,
      uint256 x2
    )
        public
        pure
        returns (uint256 _median)
    {
        if (x0 > x1) {(x0, x1) = (x1, x0);}
        if (x1 > x2) {(x1, x2) = (x2, x1);}
        if (x0 > x1) {(x0, x1) = (x1, x0);}

        _median = x1;
    }

    function _median4
    (
      uint256 x0,
      uint256 x1,
      uint256 x2,
      uint256 x3
    )
        public
        pure
        returns (uint256 _median)
    {
        if (x0 > x1) {(x0, x1) = (x1, x0);}
        if (x2 > x3) {(x2, x3) = (x3, x2);}
        if (x1 > x3) {(x1, x3) = (x3, x1);}
        if (x0 > x2) {(x0, x2) = (x2, x0);}

        _median = (x1 + x2) / 2;
    }
    
    function _median5
    (
      uint256 x0,
      uint256 x1,
      uint256 x2,
      uint256 x3,
      uint256 x4
    )
        public
        pure
        returns (uint256 _median)
    {
        if (x0 > x1) {(x0, x1) = (x1, x0);}
        if (x2 > x3) {(x2, x3) = (x3, x2);}
        if (x1 > x3) {(x1, x3) = (x3, x1);}
        if (x0 > x2) {(x0, x2) = (x2, x0);}
        if (x1 > x2) {(x1, x2) = (x2, x1);}

        if (x4 < x1) {
            _median = x1;
        } else if (x4 > x3) {
            _median = x2;
        } else {
            _median = x4;
        }
    }
}
