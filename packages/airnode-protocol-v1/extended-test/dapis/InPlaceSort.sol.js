/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');

let inPlaceSort;

// Adapted from https://stackoverflow.com/a/37580979/14558682
async function testSortWithAllPermutations(arrayLength) {
  const array = Array.from(Array(arrayLength), (_, i) => i - Math.floor(arrayLength / 2));
  let length = array.length,
    c = new Array(length).fill(0),
    i = 1,
    k,
    p;

  while (i < length) {
    if (c[i] < i) {
      k = i % 2 && c[i];
      p = array[i];
      array[i] = array[k];
      array[k] = p;
      ++c[i];
      i = 1;
      const permutation = array.slice();
      const sortedArray = (await inPlaceSort.externalSortValuesInPlace(permutation)).map((x) => x.toNumber());
      expect(sortedArray).to.deep.equal(
        permutation.sort(function (a, b) {
          return a - b;
        })
      );
    } else {
      c[i] = 0;
      ++i;
    }
  }
}

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  const roles = {
    deployer: accounts[0],
  };
  const mockInPlaceMedianFactory = await hre.ethers.getContractFactory('MockInPlaceMedian', roles.deployer);
  inPlaceSort = await mockInPlaceMedianFactory.deploy();
});

describe('sortValuesInPlace', function () {
  context('Array length is 1-5', function () {
    it('sorts values', async function () {
      for (let arrayLength = 1; arrayLength <= 5; arrayLength++) {
        console.log(`Testing with array length ${arrayLength}`);
        await testSortWithAllPermutations(arrayLength);
      }
    });
  });
  context('Array length is 6-9', function () {
    it('sorts values', async function () {
      for (let arrayLength = 6; arrayLength <= 9; arrayLength++) {
        console.log(`Testing with array length ${arrayLength}`);
        await testSortWithAllPermutations(arrayLength);
      }
    });
  });
  context('Array length is larger than 9', function () {
    it('reverts', async function () {
      await expect(inPlaceSort.externalSortValuesInPlace(Array(10).fill(0))).to.not.be.reverted;
      await expect(inPlaceSort.externalSortValuesInPlace(Array(11).fill(0))).to.be.reverted;
      await expect(inPlaceSort.externalSortValuesInPlace(Array(12).fill(0))).to.be.reverted;
    });
  });
});
