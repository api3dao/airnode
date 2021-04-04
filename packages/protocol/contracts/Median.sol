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
              array[3]
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
            
            if (array.length % 2 == 1) {
              uint idx = _quickSelect1(
                array, 0, array.length - 1, array.length / 2 + 1, pivotVal
              );
              median = array[idx];
            } else {
              (uint idx1, uint idx2) = _quickSelect2(
                array, 0, array.length - 1, array.length / 2, pivotVal
              );
              median = (array[idx1] + array[idx2]) / 2;
            }
        }
    }

    function _quickSelect1
    (
      uint256[] memory array,
      uint256 left,
      uint256 right,
      uint256 k,
      uint256 pivotVal
    )
      public
      pure
      returns (uint256 result)
    {
      if (left == right) {return left;}

      uint256 pivotIdx = _partition(array, left, right, pivotVal);

      if (k == pivotIdx + 1) {
        result = pivotIdx;
      } else if (k < pivotIdx + 1){
        pivotVal = array[left]; 
        result = _quickSelect1(array, left, pivotIdx - 1, k, pivotVal);
      } else {
        pivotVal = array[pivotIdx + 1]; 
        result = _quickSelect1(array, pivotIdx + 1, right, k, pivotVal);
      }
    }

    function _quickSelect2
    (
      uint256[] memory array,
      uint256 left,
      uint256 right,
      uint256 k,
      uint256 pivotVal
    )
      public
      pure
      returns (uint idx, uint minIdx)
    {
      idx = _quickSelect1(array, left, right, k, pivotVal);
      assert(idx != array.length - 1);
      // find minimum in right partition of array
      minIdx = idx + 1;
      for (uint i=idx+2; i<array.length; i++) {
        // TODO: what's the cost of accessing an array value?
        // ... compared to accessing "normal" variable?
        if (array[i] < array[minIdx]) {
          minIdx = i;
        }
      }
    }

    function _medianOfMedians
    (
      uint256[] memory array
    )
        public
        pure
        returns (uint256 pivot)
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
          medians[i/5] = med;   
        }
       
        uint pivotIdx; 
        pivotIdx = _quickSelect1(
          medians, 0, medians.length - 1, medians.length / 2, medians[0]
        );
        pivot = medians[pivotIdx];
    }

    function _partition
    (
      uint256[] memory array,
      uint256 left,
      uint256 right,
      uint256 pivotVal
    )
      public
      pure
      returns (uint256 idx)
    {
      uint i = left;
      uint j = left;
      while (j < right) {
        if (array[j] < pivotVal) {
          _swap(array, i, j);
          i++;
          j++;
        } else if (array[j] == pivotVal && pivotVal != array[right]) {
          _swap(array, j, right);
        } else {
          j++;
        }
      }
      _swap(array, i, right);
      idx = i;
    }

    function _swap
    (
      uint256[] memory array,
      uint256 i,
      uint256 j
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
        } else if (x4 > x2) {
            _median = x2;
        } else {
          _median = x4; 
        }
    }
}
