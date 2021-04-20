// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

/// @title A contract for seelecting the kth smallest element in an array of uints.
/// @author Sasa Milic - <sasa@api3.org>
contract SelectK {
  
  // maximum length of an array that `_medianSmallArray` can handle
  uint256 constant SMALL_ARRAY_MAX_LENGTH = 16;
    
  // EXTERNAL FUNCTIONS
  
  /* Returns the kth smallest element in an array of signed ints without
   * modifying the input array. 
   * @param arr An array of signed integers.
   * @param k
   * @return the kth smallest element in `arr`
   */ 
  function compute
  (
    int256[] memory arr,
    uint256 k
  )
    external
    pure
    returns (int256)
  {
    return computeInPlace(copy(arr), k);
  }

  /* Returns the kth and (k+1)st smallest elements in an array of signed ints without
   * modifying the input array.
   * @dev This is for when one wants to compute the exact median of an
   * even-length array. It's more gas efficient than calling `compute` twice. 
   * @param arr An array of signed integers.
   * @param k
   * @return a tuple containing the kth and (k+1)st smallest elements in `arr`,
   * respectively
   */ 
  function compute2
  (
    int256[] memory arr,
    uint256 k
  )
    external
    pure
    returns (int256, int256)
  {
    return compute2InPlace(copy(arr), k);
  }

  /* Returns the kth smallest element in an array of signed ints.
   * @dev The input array `arr` may be modified during the computation.
   * @param arr An array of unsigned integers.
   * @param k
   * @param inplace If true, original array is not modified. Otherwise, the
   *        array may be modified.
   * @return the kth smallest elements in `arr`
   */ 
  function computeInPlace
  (
    int256[] memory arr,
    uint256 k
  )
    public
    pure
    returns (int256)
  {
    assert(0 <= k && k <= arr.length - 1);
    if (arr.length <= SMALL_ARRAY_MAX_LENGTH) {
      return _selectK_smallArray(arr, k);
    }
    (uint256 idx1, uint256 idx2) = _quickSelect(arr, 0, arr.length - 1, k, false);
    return arr[idx1];
  }

  /* Returns the kth and (k+1)st smallest elements in an array of signed ints without
   * modifying the input array.
   * @dev This is for when one wants to compute the exact median of an
   * even-length array. It's more gas efficient than calling `compute` twice.
   * Note that array `arr` may be modified during the computation. 
   * @param arr An array of signed integers.
   * @param k
   * @return a tuple containing the kth and (k+1)st smallest elements in `arr`,
   * respectively
   */ 
  function compute2InPlace
  (
    int256[] memory arr,
    uint256 k
  )
    public
    pure
    returns (int256, int256)
  {
    assert(0 <= k && k <= arr.length - 2);
    if (arr.length <= SMALL_ARRAY_MAX_LENGTH) {
      int256 x1 = _selectK_smallArray(arr, k);
      int256 x2 = arr[k + 1];
      return (x1, x2);
    }
    (uint256 idx1, uint256 idx2) = _quickSelect(arr, 0, arr.length - 1, k, true);
    return (arr[idx1], arr[idx2]);
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
    int256[] memory arr,
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
    int256[] memory arr,
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
    int pivot = arr[lo];

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

  /* Return the kth element of a small array (at most length 16).
   * @param arr an array of signed integers (at most length 16)
   * @return the kth smallest element in `arr`
   */ 
  function _selectK_smallArray
  (
    int256[] memory arr,
    uint256 k
  )
      private
      pure
      returns (int256)
  {
    assert(arr.length <= SMALL_ARRAY_MAX_LENGTH);
    assert(0 <= k && k <= arr.length - 1);

    if (arr.length == 1) {
    }
    else if (arr.length == 2) {
      _swap(arr, 0, 1);
    }
    else if (arr.length == 3) {
      _swap(arr, 0, 1); _swap(arr, 1, 2); _swap(arr, 0, 1);
    }
    else if (arr.length == 4) {
      _swap(arr, 0, 1); _swap(arr, 2, 3); _swap(arr, 1, 3);
      _swap(arr, 0, 2); _swap(arr, 1, 2);
    }
    else if (arr.length == 5) {
      _swap(arr, 1, 2); _swap(arr, 3, 4); _swap(arr, 1, 3);
      _swap(arr, 0, 2); _swap(arr, 2, 4); _swap(arr, 0, 3);
      _swap(arr, 0, 1); _swap(arr, 2, 3); _swap(arr, 1, 2);
    }
    else if (arr.length == 6) {
      _swap(arr, 0, 1); _swap(arr, 2, 3); _swap(arr, 4, 5);
      _swap(arr, 1, 3); _swap(arr, 3, 5); _swap(arr, 1, 3);
      _swap(arr, 2, 4); _swap(arr, 0, 2); _swap(arr, 2, 4);
      _swap(arr, 3, 4); _swap(arr, 1, 2); _swap(arr, 2, 3);
    }
    else if (arr.length == 7) {
      _swap(arr, 1, 2); _swap(arr, 3, 4); _swap(arr, 5, 6);
      _swap(arr, 0, 2); _swap(arr, 4, 6); _swap(arr, 3, 5);
      _swap(arr, 2, 6); _swap(arr, 1, 5); _swap(arr, 0, 4);
      _swap(arr, 2, 5); _swap(arr, 0, 3); _swap(arr, 2, 4);
      _swap(arr, 1, 3); _swap(arr, 0, 1); _swap(arr, 2, 3);
      _swap(arr, 4, 5);
    }
    else if (arr.length == 8) {
      _swap(arr, 0, 7); _swap(arr, 1, 6); _swap(arr, 2, 5);
      _swap(arr, 3, 4); _swap(arr, 0, 3); _swap(arr, 4, 7);
      _swap(arr, 1, 2); _swap(arr, 5, 6); _swap(arr, 0, 1);
      _swap(arr, 2, 3); _swap(arr, 4, 5); _swap(arr, 6, 7);
      _swap(arr, 3, 5); _swap(arr, 2, 4); _swap(arr, 1, 2);
      _swap(arr, 3, 4); _swap(arr, 5, 6); _swap(arr, 2, 3);
      _swap(arr, 4, 5);
    }
    else if (arr.length == 9) {
      _swap(arr, 1, 8); _swap(arr, 2, 7); _swap(arr, 3, 6);
      _swap(arr, 4, 5); _swap(arr, 1, 4); _swap(arr, 5, 8);
      _swap(arr, 0, 2); _swap(arr, 6, 7); _swap(arr, 2, 6);
      _swap(arr, 7, 8); _swap(arr, 0, 3); _swap(arr, 4, 5);
      _swap(arr, 0, 1); _swap(arr, 3, 5); _swap(arr, 6, 7);
      _swap(arr, 2, 4); _swap(arr, 1, 3); _swap(arr, 5, 7);
      _swap(arr, 4, 6); _swap(arr, 1, 2); _swap(arr, 3, 4);
      _swap(arr, 5, 6); _swap(arr, 7, 8); _swap(arr, 2, 3);
      _swap(arr, 4, 5);
    }
    else if (arr.length == 10) {
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
    }
    else if (arr.length == 11) {
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
    }
    else if (arr.length == 12) {
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
    }
    else if (arr.length == 13) {
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
    }
    else if (arr.length == 14) {
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
    }
    else if (arr.length == 15) {
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
    }
    else {
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
    }
    return arr[k];
  }

  /* Swap two elements of an array iff the first element
   * is greater than the second.
   * @param arr an array of unsigned integers
   * @param i the first index
   * @param j the second index
   */
  function _swap
  (
    int256[] memory arr,
    uint256 i,
    uint256 j
  )
    private
    pure
  {
    assert(i < j);
    if (arr[i] > arr[j]) {(arr[i], arr[j]) = (arr[j], arr[i]);}
  }

  /**
   * Make an in-memory copy of an array
   * @param arr The array to be copied.
   */
  function copy
  (
    int256[] memory arr
  )
    private
    pure
    returns(int256[] memory)
  {
    int256[] memory arr2 = new int256[](arr.length);
    for (uint i = 0; i < arr.length; i++) {
      arr2[i] = arr[i];
    }
    return arr2;
  }
}

