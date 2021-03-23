const { expect } = require('chai');

let _median;

beforeEach(async () => {
  const [owner] = await ethers.getSigners();

  const Median = await ethers.getContractFactory('Median');

  median = await Median.deploy();
});

describe('_median1', function () {
  it('return correct median for array of length 1', async function () {
    expect(await median._median1([1])).to.equal(1);
  });
});

describe('_median2', function () {
  it('return correct median for array of length 2: [1, 3]', async function () {
    expect(await median._median2([1, 3])).to.equal(2);
  });
  it('return correct median for array of length 2: [3, 1]', async function () {
    expect(await median._median2([3, 1])).to.equal(2);
  });
});

describe('_median3', function () {
  let arrays = [
    [1, 2, 3],
    [2, 1, 3],
    [3, 1, 2],
    [1, 3, 2],
    [2, 3, 1],
    [3, 2, 1],
  ];
  it('return correct median for array of length 3: ' + arrays[0], async function () {
    expect(await median._median3(arrays[0])).to.equal(2);
  });
  it('return correct median for array of length 3: ' + arrays[1], async function () {
    expect(await median._median3(arrays[1])).to.equal(2);
  });
  it('return correct median for array of length 3: ' + arrays[2], async function () {
    expect(await median._median3(arrays[2])).to.equal(2);
  });
  it('return correct median for array of length 3: ' + arrays[3], async function () {
    expect(await median._median3(arrays[3])).to.equal(2);
  });
  it('return correct median for array of length 3: ' + arrays[4], async function () {
    expect(await median._median3(arrays[4])).to.equal(2);
  });
  it('return correct median for array of length 3: ' + arrays[5], async function () {
    expect(await median._median3(arrays[5])).to.equal(2);
  });
});

describe('_median3', function () {
  let arrays = [
    [1, 4, 2, 3],
    [2, 1, 4, 3],
    [3, 1, 2, 4],
    [1, 4, 3, 2],
    [2, 3, 4, 1],
    [4, 3, 2, 1],
  ];
  it('return correct median for array of length 3: ' + arrays[0], async function () {
    expect(await median._median4(arrays[0])).to.equal(2);
  });
  it('return correct median for array of length 3: ' + arrays[1], async function () {
    expect(await median._median4(arrays[1])).to.equal(2);
  });
  it('return correct median for array of length 3: ' + arrays[2], async function () {
    expect(await median._median4(arrays[2])).to.equal(2);
  });
  it('return correct median for array of length 3: ' + arrays[3], async function () {
    expect(await median._median4(arrays[3])).to.equal(2);
  });
  it('return correct median for array of length 3: ' + arrays[4], async function () {
    expect(await median._median4(arrays[4])).to.equal(2);
  });
  it('return correct median for array of length 3: ' + arrays[5], async function () {
    expect(await median._median4(arrays[5])).to.equal(2);
  });
});
