// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

/// @title A contract for computing the median of an array of uints.
/// @author Sasa Milic - <sasa@api3.org>
contract Median {
  
  // maximum length of an array that `_medianSmallArray` can handle
  uint256 constant SMALL_ARRAY_MAX_LENGTH = 16;
    
  // EXTERNAL FUNCTIONS

  /* Computes a median on an array of unsigned integers of any length.
   * @param arr An array of unsigned integers.
   * @return median
   */ 
  function compute
  (
    uint256[] memory arr
  )
    external
    pure
    returns (uint256 median)
  {
    bool isOddLength = arr.length % 2 == 1; 
    uint m = arr.length / 2;

    if (arr.length <= SMALL_ARRAY_MAX_LENGTH) {return _medianSmallArray(arr);}
    uint idx1;
    uint idx2;
    if (isOddLength) {
      (idx1, idx2) = _quickSelect(arr, 0, arr.length - 1, m, false);
      median = arr[idx1];
    } else {
      (idx1, idx2) = _quickSelect(arr, 0, arr.length - 1, m - 1, true);
      median = (arr[idx1] + arr[idx2]) / 2;
    }
  }

  // PRIVATE FUNCTIONS

  /* Select the index of the kth element in an array.
   * @dev This function may modify array.
   * @param arr an array of uints.
   * @param left the left index to begin search.
   * @param right the right index to begin search.
   * @param k
   * @param selectKplusOne a bool representing whether the function should
   *                       return the (k+1)st element or not.
   * @return a tuple (i, j) where i and j are the indices of the kth and
   *         (k+1)st elements of `arr`, respectively. In the case where
   *         `selectKplusOne` is false, the tuple returned is (i, 0).
   */
   function _quickSelect
  (
    uint256[] memory arr,
    uint256 left,
    uint256 right,
    uint256 k,
    bool selectKplusOne
  )
    private
    pure
    returns (uint256, uint256)
  {
    assert(left <= k && k <= right);
    
    if (left == right) {return (k, 0);}
   
    uint256 pivotIdx = partition(arr, left, right);

    uint256 idx1;
    uint256 idx2;

    if (k == pivotIdx) {
      idx1 = pivotIdx;
    } else if (k < pivotIdx){
      (idx1, idx2) = _quickSelect(arr, left, pivotIdx - 1, k, false);
    } else {
      (idx1, idx2) = _quickSelect(arr, pivotIdx + 1, right, k, false);
    }
    if (!selectKplusOne) {
      return (idx1, 0);
    }
    assert(idx1 != arr.length - 1);
    // In order to find (k+1)th element,
    // find minimum in right partition of array
    idx2 = idx1 + 1;
    for (uint i=idx1+2; i<arr.length; i++) {
      if (arr[i] < arr[idx2]) {
        idx2 = i;
      }
    }
    return (idx1, idx2);
  }

  /**
   * Partitions the array in-place using a modified Hoare's partitioning
   * scheme. Only elements between indices `lo` and `high` (inclusive) will be
   * partitioned.
   * @dev Hoare's algorithm is modified in order to return the index of the
   *      pivot element.
   * @return the index of the pivot
   */
  function partition
  (
    uint256[] memory arr,
    uint256 lo,
    uint256 hi
  )
    private
    pure
    returns (uint256)
  {
    if (lo == hi) {return lo;}
    
    // make middle element pivot
    uint m = arr.length / 2;
    (arr[m], arr[lo] = arr[lo], arr[m]);
    uint pivot = arr[lo];

    uint i = lo;
    uint j = hi + 1;
 
    while (true) {
      do {
        i++;
      } while (i < arr.length && arr[i] < pivot);
      do {
        j--;
      } while (arr[j] > pivot);
      if (i >= j) {
        // swap with pivot
        (arr[lo], arr[j]) = (arr[j], arr[lo]);
        return j;
      } 
      (arr[i], arr[j]) = (arr[j], arr[i]);
    }
  }

  /* Computes a median on an array of unsigned integers of at most length 16.
   * @param arr an array of unsigned integers
   * @return median
   */ 
  function _medianSmallArray
  (
    uint256[] memory arr
  )
      private
      pure
      returns (uint256)
  {
    assert(arr.length <= SMALL_ARRAY_MAX_LENGTH);

    if (arr.length == 1) {
      return arr[0];
    }
    if (arr.length == 2) {
      return (arr[0] + arr[1]) / 2;
    }
    if (arr.length == 3) {
      _swap(arr, 0, 1); _swap(arr, 1, 2); _swap(arr, 0, 1);
      return arr[1];
    }
    if (arr.length == 4) {
      _swap(arr, 0, 1); _swap(arr, 2, 3); _swap(arr, 1, 3);
      _swap(arr, 0, 2);
      return (arr[1] + arr[2]) / 2;
    }
    if (arr.length == 5) {
      _swap(arr, 1, 2); _swap(arr, 3, 4); _swap(arr, 1, 3);
      _swap(arr, 0, 2); _swap(arr, 2, 4); _swap(arr, 0, 3);
      _swap(arr, 0, 1); _swap(arr, 2, 3); _swap(arr, 1, 2);
      return arr[2];
    }
    if (arr.length == 6) {
      _swap(arr, 0, 1); _swap(arr, 2, 3); _swap(arr, 4, 5);
      _swap(arr, 1, 3); _swap(arr, 3, 5); _swap(arr, 1, 3);
      _swap(arr, 2, 4); _swap(arr, 0, 2); _swap(arr, 2, 4);
      _swap(arr, 3, 4); _swap(arr, 1, 2); _swap(arr, 2, 3);
      return (arr[2] + arr[3]) / 2;
    }
    if (arr.length == 7) {
      _swap(arr, 1, 2); _swap(arr, 3, 4); _swap(arr, 5, 6);
      _swap(arr, 0, 2); _swap(arr, 4, 6); _swap(arr, 3, 5);
      _swap(arr, 2, 6); _swap(arr, 1, 5); _swap(arr, 0, 4);
      _swap(arr, 2, 5); _swap(arr, 0, 3); _swap(arr, 2, 4);
      _swap(arr, 1, 3); _swap(arr, 0, 1); _swap(arr, 2, 3);
      _swap(arr, 4, 5);
      return arr[3];
    }
    if (arr.length == 8) {
      _swap(arr, 0, 7); _swap(arr, 1, 6); _swap(arr, 2, 5);
      _swap(arr, 3, 4); _swap(arr, 0, 3); _swap(arr, 4, 7);
      _swap(arr, 1, 2); _swap(arr, 5, 6); _swap(arr, 0, 1);
      _swap(arr, 2, 3); _swap(arr, 4, 5); _swap(arr, 6, 7);
      _swap(arr, 3, 5); _swap(arr, 2, 4); _swap(arr, 1, 2);
      _swap(arr, 3, 4); _swap(arr, 5, 6); _swap(arr, 2, 3);
      _swap(arr, 4, 5);
      return (arr[3] + arr[4]) / 2;
    }
    if (arr.length == 9) {
      _swap(arr, 1, 8); _swap(arr, 2, 7); _swap(arr, 3, 6);
      _swap(arr, 4, 5); _swap(arr, 1, 4); _swap(arr, 5, 8);
      _swap(arr, 0, 2); _swap(arr, 6, 7); _swap(arr, 2, 6);
      _swap(arr, 7, 8); _swap(arr, 0, 3); _swap(arr, 4, 5);
      _swap(arr, 0, 1); _swap(arr, 3, 5); _swap(arr, 6, 7);
      _swap(arr, 2, 4); _swap(arr, 1, 3); _swap(arr, 5, 7);
      _swap(arr, 4, 6); _swap(arr, 1, 2); _swap(arr, 3, 4);
      _swap(arr, 5, 6); _swap(arr, 7, 8); _swap(arr, 2, 3);
      _swap(arr, 4, 5);
      return arr[4];
    }
    if (arr.length == 10) {
      _swap(arr, 0, 1);  _swap(arr, 2, 3); _swap(arr, 4, 5);
      _swap(arr, 6, 7);  _swap(arr, 8, 9); _swap(arr, 4, 9);
      _swap(arr, 0, 5);  _swap(arr, 1, 8); _swap(arr, 3, 7);
      _swap(arr, 2, 6);  _swap(arr, 0, 2); _swap(arr, 3, 6);
      _swap(arr, 7, 9);  _swap(arr, 1, 4); _swap(arr, 5, 8);
      _swap(arr, 0, 1);  _swap(arr, 2, 7); _swap(arr, 8, 9);
      _swap(arr, 4, 6);  _swap(arr, 3, 5); _swap(arr, 2, 4);
      _swap(arr, 6, 8);  _swap(arr, 1, 3); _swap(arr, 5, 7);
      _swap(arr, 1, 2);  _swap(arr, 3, 4); _swap(arr, 5, 6);
      _swap(arr, 7, 8);  _swap(arr, 2, 3); _swap(arr, 4, 5);
      _swap(arr, 6, 7);
      return (arr[4] + arr[5]) / 2;
    }
    if (arr.length == 11) {
      _swap(arr, 0, 9);  _swap(arr, 1, 8);  _swap(arr, 2, 7);
      _swap(arr, 3, 6);  _swap(arr, 4, 5);  _swap(arr, 0, 3);
      _swap(arr, 1, 2);  _swap(arr, 4, 10); _swap(arr, 6, 9);
      _swap(arr, 7, 8);  _swap(arr, 0, 1);  _swap(arr, 2, 3);
      _swap(arr, 5, 8);  _swap(arr, 9, 10); _swap(arr, 6, 7);
      _swap(arr, 1, 2);  _swap(arr, 4, 6);  _swap(arr, 8, 10);
      _swap(arr, 5, 9);  _swap(arr, 0, 4);  _swap(arr, 7, 8);
      _swap(arr, 1, 5);  _swap(arr, 2, 9);  _swap(arr, 3, 6);
      _swap(arr, 1, 4);  _swap(arr, 5, 7);  _swap(arr, 2, 3);
      _swap(arr, 6, 9);  _swap(arr, 2, 4);  _swap(arr, 6, 7);
      _swap(arr, 8, 9);  _swap(arr, 3, 5);  _swap(arr, 3, 4);
      _swap(arr, 5, 6);  _swap(arr, 7, 8);
      return arr[5];
    }
    if (arr.length == 12) {
      _swap(arr, 0, 6);   _swap(arr, 1, 7);  _swap(arr, 2, 8);
      _swap(arr, 3, 9);   _swap(arr, 4, 10); _swap(arr, 5, 11);
      _swap(arr, 0, 3);   _swap(arr, 1, 4);  _swap(arr, 2, 5);
      _swap(arr, 6, 9);   _swap(arr, 7, 10); _swap(arr, 8, 11);
      _swap(arr, 0, 1);   _swap(arr, 3, 4);  _swap(arr, 5, 8);
      _swap(arr, 10, 11); _swap(arr, 6, 7);  _swap(arr, 1, 2);
      _swap(arr, 3, 6);   _swap(arr, 7, 8);  _swap(arr, 9, 10);
      _swap(arr, 4, 5);   _swap(arr, 0, 1);  _swap(arr, 2, 9);
      _swap(arr, 10, 11); _swap(arr, 3, 4);  _swap(arr, 5, 8);
      _swap(arr, 6, 7);   _swap(arr, 1, 3);  _swap(arr, 4, 7);
      _swap(arr, 8, 10);  _swap(arr, 2, 6);  _swap(arr, 5, 9);
      _swap(arr, 2, 3);   _swap(arr, 4, 6);  _swap(arr, 8, 9);
      _swap(arr, 5, 7);   _swap(arr, 3, 4);  _swap(arr, 5, 6);
      _swap(arr, 7, 8);
      return (arr[5] + arr[6]) / 2;
    }
    if (arr.length == 13) {
      _swap(arr, 1, 12); _swap(arr, 2, 11);  _swap(arr, 3, 10);
      _swap(arr, 4, 9);  _swap(arr, 5, 8);   _swap(arr, 6, 7);
      _swap(arr, 0, 5);  _swap(arr, 1, 4);   _swap(arr, 2, 3);
      _swap(arr, 9, 12); _swap(arr, 10, 11); _swap(arr, 3, 6);
      _swap(arr, 7, 10); _swap(arr, 0, 1);   _swap(arr, 4, 5);
      _swap(arr, 8, 9);  _swap(arr, 1, 7);   _swap(arr, 9, 10);
      _swap(arr, 2, 8);  _swap(arr, 3, 4);   _swap(arr, 5, 11);
      _swap(arr, 6, 12); _swap(arr, 0, 3);   _swap(arr, 4, 9);
      _swap(arr, 1, 2);  _swap(arr, 5, 8);   _swap(arr, 11, 12);
      _swap(arr, 6, 7);  _swap(arr, 0, 1);   _swap(arr, 2, 3);
      _swap(arr, 4, 7);  _swap(arr, 10, 11); _swap(arr, 5, 9);
      _swap(arr, 6, 8);  _swap(arr, 1, 2);   _swap(arr, 3, 5);
      _swap(arr, 8, 10); _swap(arr, 11, 12); _swap(arr, 4, 6);
      _swap(arr, 7, 9);  _swap(arr, 3, 4);   _swap(arr, 5, 6);
      _swap(arr, 7, 8);  _swap(arr, 9, 10);  _swap(arr, 2, 3);
      _swap(arr, 4, 5);  _swap(arr, 6, 7);   _swap(arr, 8, 9);
      _swap(arr, 10, 11);
      return arr[6];
    }  
    if (arr.length == 14) {
      _swap(arr, 0, 13);  _swap(arr, 1, 12); _swap(arr, 2, 11);
      _swap(arr, 3, 10);  _swap(arr, 4, 9);  _swap(arr, 5, 8);
      _swap(arr, 6, 7);   _swap(arr, 0, 5);  _swap(arr, 1, 4);
      _swap(arr, 2, 3);   _swap(arr, 8, 13); _swap(arr, 9, 12);
      _swap(arr, 10, 11); _swap(arr, 3, 6);  _swap(arr, 7, 10);
      _swap(arr, 0, 1);   _swap(arr, 4, 5);  _swap(arr, 8, 9);
      _swap(arr, 12, 13); _swap(arr, 1, 7);  _swap(arr, 9, 10);
      _swap(arr, 2, 8);   _swap(arr, 3, 4);  _swap(arr, 5, 11);
      _swap(arr, 6, 12);  _swap(arr, 0, 3);  _swap(arr, 4, 9);
      _swap(arr, 10, 13); _swap(arr, 1, 2);  _swap(arr, 5, 8);
      _swap(arr, 11, 12); _swap(arr, 6, 7);  _swap(arr, 0, 1);
      _swap(arr, 2, 3);   _swap(arr, 4, 7);  _swap(arr, 10, 11);
      _swap(arr, 12, 13); _swap(arr, 5, 9);  _swap(arr, 6, 8);
      _swap(arr, 1, 2);   _swap(arr, 3, 5);  _swap(arr, 8, 10);
      _swap(arr, 11, 12); _swap(arr, 4, 6);  _swap(arr, 7, 9);
      _swap(arr, 3, 4);   _swap(arr, 5, 6);  _swap(arr, 7, 8);
      _swap(arr, 9, 10);  _swap(arr, 2, 3);  _swap(arr, 4, 5);
      _swap(arr, 6, 7);   _swap(arr, 8, 9);  _swap(arr, 10, 11);
      return (arr[6] + arr[7]) / 2;
    }  
    if (arr.length == 15) {
      _swap(arr, 1, 14);  _swap(arr, 2, 13);  _swap(arr, 3, 12);
      _swap(arr, 4, 11);  _swap(arr, 5, 10);  _swap(arr, 6, 9);
      _swap(arr, 7, 8);   _swap(arr, 0, 7);   _swap(arr, 1, 6);
      _swap(arr, 2, 5);   _swap(arr, 3, 4);   _swap(arr, 9, 14);
      _swap(arr, 10, 13); _swap(arr, 11, 12); _swap(arr, 0, 3);
      _swap(arr, 4, 7);   _swap(arr, 8, 11);  _swap(arr, 1, 2);
      _swap(arr, 5, 6);   _swap(arr, 9, 10);  _swap(arr, 13, 14);
      _swap(arr, 0, 1);   _swap(arr, 2, 8);   _swap(arr, 10, 11);
      _swap(arr, 3, 9);   _swap(arr, 4, 5);   _swap(arr, 6, 12);
      _swap(arr, 7, 13);  _swap(arr, 1, 4);   _swap(arr, 5, 10);
      _swap(arr, 11, 14); _swap(arr, 2, 3);   _swap(arr, 6, 9);
      _swap(arr, 12, 13); _swap(arr, 7, 8);   _swap(arr, 1, 2);
      _swap(arr, 3, 4);   _swap(arr, 5, 8);   _swap(arr, 11, 12);
      _swap(arr, 13, 14); _swap(arr, 6, 10);  _swap(arr, 7, 9);
      _swap(arr, 2, 3);   _swap(arr, 4, 6);   _swap(arr, 9, 11);
      _swap(arr, 12, 13); _swap(arr, 5, 7);   _swap(arr, 8, 10);
      _swap(arr, 4, 5);   _swap(arr, 6, 7);   _swap(arr, 8, 9);
      _swap(arr, 10, 11); _swap(arr, 3, 4);   _swap(arr, 5, 6);
      _swap(arr, 7, 8);   _swap(arr, 9, 10);  _swap(arr, 11, 12);
      return arr[7];
    }  
    if (arr.length == 16) {
      _swap(arr, 0, 15);  _swap(arr, 1, 14);  _swap(arr, 2, 13);
      _swap(arr, 3, 12);  _swap(arr, 4, 11);  _swap(arr, 5, 10);
      _swap(arr, 6, 9);   _swap(arr, 7, 8);   _swap(arr, 0, 7);
      _swap(arr, 1, 6);   _swap(arr, 2, 5);   _swap(arr, 3, 4);
      _swap(arr, 8, 15);  _swap(arr, 9, 14);  _swap(arr, 10, 13);
      _swap(arr, 11, 12); _swap(arr, 0, 3);   _swap(arr, 4, 7);
      _swap(arr, 8, 11);  _swap(arr, 12, 15); _swap(arr, 1, 2);
      _swap(arr, 5, 6);   _swap(arr, 9, 10);  _swap(arr, 13, 14);
      _swap(arr, 0, 1);   _swap(arr, 2, 8);   _swap(arr, 10, 11);
      _swap(arr, 14, 15); _swap(arr, 3, 9);   _swap(arr, 4, 5);
      _swap(arr, 6, 12);  _swap(arr, 7, 13);  _swap(arr, 1, 4);
      _swap(arr, 5, 10);  _swap(arr, 11, 14); _swap(arr, 2, 3);
      _swap(arr, 6, 9);   _swap(arr, 12, 13); _swap(arr, 7, 8);
      _swap(arr, 1, 2);   _swap(arr, 3, 4);   _swap(arr, 5, 8);
      _swap(arr, 11, 12); _swap(arr, 13, 14); _swap(arr, 6, 10);
      _swap(arr, 7, 9);   _swap(arr, 2, 3);   _swap(arr, 4, 6);
      _swap(arr, 9, 11);  _swap(arr, 12, 13); _swap(arr, 5, 7);
      _swap(arr, 8, 10);  _swap(arr, 4, 5);   _swap(arr, 6, 7);
      _swap(arr, 8, 9);   _swap(arr, 10, 11); _swap(arr, 3, 4);
      _swap(arr, 5, 6);   _swap(arr, 7, 8);   _swap(arr, 9, 10);
      _swap(arr, 11, 12);
      return (arr[7] + arr[8]) / 2;
    }  
  }

  /* Swap two elements of an array iff the first element
   * is greater than the second.
   * @param arr an array of unsigned integers
   * @param i the first index
   * @param j the second index
   */
  function _swap
  (
    uint256[] memory arr,
    uint256 i,
    uint256 j
  )
    private
    pure
  {
    assert(i < j);
    if (arr[i] > arr[j]) {(arr[i], arr[j]) = (arr[j], arr[i]);}
  }
}

