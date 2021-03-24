import {ethers} from 'hardhat';
import {Contract, ContractFactory} from 'ethers';

//import {MaxUint256} from 'ethers/constants';
import {expandTo18Decimals} from '../shared/utilities';

import {deployRewardsGenerator, deployOneX} from '../shared/deploy';

import chai, {expect} from 'chai';
import {waffleChai} from '@ethereum-waffle/chai';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
chai.use(waffleChai);

const REWARDS_PER_BLOCK = expandTo18Decimals(1000);
const REWARDS_START_BLOCK = 0;
const HALVING_AFTER_BLOCK_COUNT = 45360;

describe('RewardsGenerator::Authorization', () => {
  let signers: SignerWithAddress[];
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;
  let minter: SignerWithAddress;
  let dev: SignerWithAddress;
  let liquidityFund: SignerWithAddress;
  let communityFund: SignerWithAddress;
  let founderFund: SignerWithAddress;

  let govToken: Contract;
  let generator: Contract;

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
  });

  beforeEach(async () => {
    govToken = await deployOneX(alice);
    // 1000 ONEx per block, rewards start at block 0, rewards are halved after every 45360 blocks
    generator = await deployRewardsGenerator(
      signers,
      govToken,
      REWARDS_PER_BLOCK,
      REWARDS_START_BLOCK,
      HALVING_AFTER_BLOCK_COUNT
    );
  });

  it('should allow the owner to reclaim ownership of the OneX token', async function () {
    expect(await govToken.transferOwnership(generator.address));

    expect(await govToken.owner()).to.be.equal(generator.address);

    await expect(generator.reclaimTokenOwnership(alice.address))
      .to.emit(govToken, 'OwnershipTransferred')
      .withArgs(generator.address, alice.address);

    expect(await govToken.owner()).to.be.equal(alice.address);
  });

  it('should allow authorized users to reclaim ownership of the OneX token', async function () {
    await generator.addAuthorized(bob.address);

    expect(await govToken.transferOwnership(generator.address));

    expect(await govToken.owner()).to.be.equal(generator.address);

    await expect(generator.connect(bob).reclaimTokenOwnership(bob.address))
      .to.emit(govToken, 'OwnershipTransferred')
      .withArgs(generator.address, bob.address);

    expect(await govToken.owner()).to.be.equal(bob.address);
  });

  it("unauthorized users shouldn't be able to reclaim ownership of the token back from RewardsGenerator", async function () {
    expect(await govToken.transferOwnership(generator.address));
    expect(await govToken.owner()).to.be.equal(generator.address);

    await expect(generator.connect(bob).reclaimTokenOwnership(bob.address)).to
      .be.reverted;

    expect(await govToken.owner()).to.be.equal(generator.address);
  });

  it('should allow only authorized users to update the developer rewards address', async function () {
    expect(await generator.devaddr()).to.equal(dev.address);

    await expect(generator.connect(bob).dev(bob.address)).to.be.reverted;

    await generator.addAuthorized(dev.address);
    await generator.connect(dev).dev(bob.address);
    expect(await generator.devaddr()).to.equal(bob.address);

    await generator.addAuthorized(bob.address);
    await generator.connect(bob).dev(alice.address);
    expect(await generator.devaddr()).to.equal(alice.address);
  });

  it('should allow only authorized users to update the liquidity provider rewards address', async function () {
    expect(await generator.liquidityaddr()).to.equal(liquidityFund.address);

    await expect(generator.connect(bob).lpUpdate(bob.address)).to.be.reverted;

    await generator.addAuthorized(liquidityFund.address);
    await generator.connect(liquidityFund).lpUpdate(bob.address);
    expect(await generator.liquidityaddr()).to.equal(bob.address);

    await generator.addAuthorized(bob.address);
    await generator.connect(bob).lpUpdate(alice.address);
    expect(await generator.liquidityaddr()).to.equal(alice.address);
  });

  it('should allow only authorized users to update the community fund rewards address', async function () {
    expect(await generator.comfundaddr()).to.equal(communityFund.address);

    await expect(generator.connect(bob).comUpdate(bob.address)).to.be.reverted;

    await generator.addAuthorized(communityFund.address);
    await generator.connect(communityFund).comUpdate(bob.address);
    expect(await generator.comfundaddr()).to.equal(bob.address);

    await generator.addAuthorized(bob.address);
    await generator.connect(bob).comUpdate(alice.address);
    expect(await generator.comfundaddr()).to.equal(alice.address);
  });

  it('should allow only authorized users to update the founder rewards address', async function () {
    expect(await generator.founderaddr()).to.equal(founderFund.address);

    await expect(generator.connect(bob).founderUpdate(bob.address)).to.be
      .reverted;

    await generator.addAuthorized(founderFund.address);
    await generator.connect(founderFund).founderUpdate(bob.address);
    expect(await generator.founderaddr()).to.equal(bob.address);

    await generator.addAuthorized(bob.address);
    await generator.connect(bob).founderUpdate(alice.address);
    expect(await generator.founderaddr()).to.equal(alice.address);
  });
});
