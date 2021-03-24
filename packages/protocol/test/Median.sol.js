const { expect } = require('chai');

let median;
let owner;

// some helper functions for testing

const permutations = (arr) => {
  if (arr.length <= 2) return arr.length === 2 ? [arr, [arr[1], arr[0]]] : arr;
  return arr.reduce(
    (acc, item, i) => acc.concat(permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((val) => [item, ...val])),
    []
  );
};

const range = (n) => {
  var arr = new Array();
  for (let x = 100; x <= n * 100; x += 100) {
    arr.push(x);
  }
  return arr;
};

const medianSorted = (arr) => {
  n = arr.length;
  if (n % 2 == 1) {
    return arr[Math.floor(n / 2)];
  } else {
    return (arr[n / 2 - 1] + arr[n / 2]) / 2;
  }
};

beforeEach(async () => {
  //owner = await ethers.getSigners()[0];

  console.log(owner);
  const Median = await ethers.getContractFactory('Median');

  median = await Median.deploy();
});

describe('median.compute', function () {
  for (let n = 1; n <= 5; n++) {
    arr = range(n);
    perms = permutations(arr);

    for (let i = 0; i < perms.length; i++) {
      arrP = perms[i];
      it('return correct median for all permutations of array of length ' + n + ': [' + arrP + ']', async function () {
        expect(await median.compute(arrP)).to.equal(medianSorted(arr));
      });
    }
  }
});
