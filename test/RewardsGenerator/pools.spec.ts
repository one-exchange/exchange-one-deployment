import {ethers} from 'hardhat';
import {Contract, ContractFactory} from 'ethers';

//import {MaxUint256} from 'ethers/constants';
import {expandTo18Decimals} from '../shared/utilities';

import {deployRewardsGenerator, deployOneX} from '../shared/deploy';

import chai, {expect} from 'chai';
import {waffleChai} from '@ethereum-waffle/chai';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
chai.use(waffleChai);

describe('RewardsGenerator::Pools', () => {
  let signers: SignerWithAddress[];
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;
  let minter: SignerWithAddress;
  let dev: SignerWithAddress;
  let liquidityFund: SignerWithAddress;
  let communityFund: SignerWithAddress;
  let founderFund: SignerWithAddress;

  let ERC20Mock: ContractFactory;
  let govToken: Contract;
  let lp: Contract;
  let lp2: Contract;

  before(async function () {
    signers = await ethers.getSigners();
    alice = signers[0];
    bob = signers[1];
    carol = signers[2];
    minter = signers[3];
    dev = signers[4];
    liquidityFund = signers[5];
    communityFund = signers[6];
    founderFund = signers[7];

    ERC20Mock = await ethers.getContractFactory('ERC20Mock');
  });

  beforeEach(async () => {
    govToken = await deployOneX(alice);

    lp = await ERC20Mock.deploy('LPToken', 'LP', expandTo18Decimals(1000000));
    await lp.transfer(alice.address, expandTo18Decimals(1000));
    await lp.transfer(bob.address, expandTo18Decimals(1000));
    await lp.transfer(carol.address, expandTo18Decimals(1000));

    lp2 = await ERC20Mock.deploy(
      'LPToken2',
      'LP2',
      expandTo18Decimals(1000000)
    );
    await lp2.transfer(alice.address, expandTo18Decimals(1000));
    await lp2.transfer(bob.address, expandTo18Decimals(1000));
    await lp2.transfer(carol.address, expandTo18Decimals(1000));
  });

  it('should be able to add a pool', async function () {
    // 1 ONEx per block farming rate starting at block 100 with the first halvening block starting 1000 blocks after the start block
    const rewardsPerBlock = 1;
    const rewardsStartAtBlock = 100;
    const generator = await deployRewardsGenerator(
      signers,
      govToken,
      expandTo18Decimals(rewardsPerBlock),
      rewardsStartAtBlock,
      1000
    );

    await govToken.transferOwnership(generator.address);

    await generator.add(rewardsPerBlock, lp.address, true);

    expect(await generator.poolLength()).to.equal(1);
    expect(await generator.poolExistence(lp.address)).to.equal(true);
  });

  it('should not be able to add the same pool twice', async function () {
    // 1 ONEx per block farming rate starting at block 100 with the first halvening block starting 1000 blocks after the start block
    const rewardsPerBlock = 1;
    const rewardsStartAtBlock = 100;
    const generator = await deployRewardsGenerator(
      signers,
      govToken,
      expandTo18Decimals(rewardsPerBlock),
      rewardsStartAtBlock,
      1000
    );

    await govToken.transferOwnership(generator.address);

    await generator.add(rewardsPerBlock, lp.address, true);

    expect(await generator.poolLength()).to.equal(1);
    expect(await generator.poolExistence(lp.address)).to.equal(true);

    await expect(
      generator.add(rewardsPerBlock, lp.address, true)
    ).to.be.revertedWith('RewardsGenerator::nonDuplicated: duplicated');
  });

  it('should not be able to add a pool as an unauthorized user', async function () {
    // 1 ONEx per block farming rate starting at block 100 with the first halvening block starting 1000 blocks after the start block
    const rewardsPerBlock = 1;
    const rewardsStartAtBlock = 100;
    const generator = await deployRewardsGenerator(
      signers,
      govToken,
      expandTo18Decimals(rewardsPerBlock),
      rewardsStartAtBlock,
      1000
    );

    await govToken.transferOwnership(generator.address);

    await expect(
      generator.connect(bob).add(rewardsPerBlock, lp.address, true)
    ).to.be.revertedWith('Ownable: caller is not the owner');
    expect(await generator.poolLength()).to.equal(0);
    expect(await generator.poolExistence(lp.address)).to.equal(false);
  });

  it('should be able to add multiple pools', async function () {
    // 1 ONEx per block farming rate starting at block 100 with the first halvening block starting 1000 blocks after the start block
    const rewardsPerBlock = 1;
    const rewardsStartAtBlock = 100;
    const generator = await deployRewardsGenerator(
      signers,
      govToken,
      expandTo18Decimals(rewardsPerBlock),
      rewardsStartAtBlock,
      1000
    );

    await govToken.transferOwnership(generator.address);

    await generator.add(rewardsPerBlock, lp.address, true);
    expect(await generator.poolLength()).to.equal(1);
    expect(await generator.poolExistence(lp.address)).to.equal(true);

    await generator.add(rewardsPerBlock, lp2.address, true);
    expect(await generator.poolLength()).to.equal(2);
    expect(await generator.poolExistence(lp2.address)).to.equal(true);
  });

  it('should be able to change the allocation points for a given pool', async function () {
    // 1 ONEx per block farming rate starting at block 100 with the first halvening block starting 1000 blocks after the start block
    const rewardsPerBlock = 1;
    const rewardsStartAtBlock = 100;
    const generator = await deployRewardsGenerator(
      signers,
      govToken,
      expandTo18Decimals(rewardsPerBlock),
      rewardsStartAtBlock,
      1000
    );

    await govToken.transferOwnership(generator.address);

    await generator.add(rewardsPerBlock, lp.address, true);
    expect(await generator.poolLength()).to.equal(1);
    expect(await generator.poolExistence(lp.address)).to.equal(true);

    await generator.set(0, rewardsPerBlock * 10, true);
    const [
      _lpToken,
      allocPoint,
      _lastRewardBlock,
      _accOneXPerShare,
    ] = await generator.poolInfo(0);
    expect(allocPoint).to.equal(rewardsPerBlock * 10);
  });

  it('should not be able to change the allocation points for a given pool as an unauthorized user', async function () {
    // 1 ONEx per block farming rate starting at block 100 with the first halvening block starting 1000 blocks after the start block
    const rewardsPerBlock = 1;
    const rewardsStartAtBlock = 100;
    const generator = await deployRewardsGenerator(
      signers,
      govToken,
      expandTo18Decimals(rewardsPerBlock),
      rewardsStartAtBlock,
      1000
    );

    await govToken.transferOwnership(generator.address);

    await generator.add(rewardsPerBlock, lp.address, true);
    expect(await generator.poolLength()).to.equal(1);
    expect(await generator.poolExistence(lp.address)).to.equal(true);

    await expect(
      generator.connect(bob).set(0, rewardsPerBlock * 10, true)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });
});
