import {ethers} from 'hardhat';
import {Contract, ContractFactory} from 'ethers';

//import {MaxUint256} from 'ethers/constants';
import {expandTo18Decimals} from '../shared/utilities';

import {deployRewardsGenerator, deployOneX} from '../shared/deploy';

import chai, {expect} from 'chai';
import {waffleChai} from '@ethereum-waffle/chai';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
chai.use(waffleChai);

// Referrals aren't actively used by the MasterBreeder contract - no automatic payouts will be handed out to the referrer on deposits & withdrawals
// The referral tracking system can be used for a later stage airdrop (e.g. airdropping funds from the community funds address to referrers) or other initiatives
describe('RewardsGenerator::Referrals', () => {
  let signers: SignerWithAddress[];
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;
  let minter: SignerWithAddress;

  let ERC20Mock: ContractFactory;
  let govToken: Contract;
  let lp: Contract;
  let generator: Contract;

  before(async function () {
    signers = await ethers.getSigners();
    alice = signers[0];
    bob = signers[1];
    carol = signers[2];
    minter = signers[3];

    ERC20Mock = await ethers.getContractFactory('ERC20Mock', minter);
  });

  beforeEach(async () => {
    govToken = await deployOneX(alice);

    lp = await ERC20Mock.deploy('LPToken', 'LP', expandTo18Decimals(1000000));
    await lp.transfer(alice.address, expandTo18Decimals(1000));
    await lp.transfer(bob.address, expandTo18Decimals(1000));
    await lp.transfer(carol.address, expandTo18Decimals(1000));

    // 1 ONEx per block farming rate starting at block 100 with the first halvening block starting 1000 blocks after the start block
    const rewardsPerBlock = 1;
    const rewardsStartAtBlock = 100;
    generator = await deployRewardsGenerator(
      signers,
      govToken,
      expandTo18Decimals(rewardsPerBlock),
      rewardsStartAtBlock,
      1000
    );

    await govToken.transferOwnership(generator.address);

    expect(await govToken.totalSupply()).to.equal(0);

    await generator.add(rewardsPerBlock, lp.address, true);
  });

  it('should properly track referrals', async function () {
    // Alice refers Bob who deposits
    await lp.connect(bob).approve(generator.address, expandTo18Decimals(1000));
    await generator
      .connect(bob)
      .deposit(0, expandTo18Decimals(100), alice.address);

    // The contract should now keep track of Alice's referral
    let refValue = await generator.getRefValueOf(alice.address, bob.address);
    let globalRefValue = await generator.getGlobalRefAmount(alice.address);
    expect(refValue).to.eq(expandTo18Decimals(100));
    expect(globalRefValue).to.eq(expandTo18Decimals(100));
    expect(await generator.getTotalRefs(alice.address)).to.eq(1);

    // Alice now also refers Carol
    await lp
      .connect(carol)
      .approve(generator.address, expandTo18Decimals(1000));
    await generator
      .connect(carol)
      .deposit(0, expandTo18Decimals(100), alice.address);

    refValue = await generator.getRefValueOf(alice.address, carol.address);
    globalRefValue = await generator.getGlobalRefAmount(alice.address);
    expect(refValue).to.eq(expandTo18Decimals(100));
    expect(globalRefValue).to.eq(expandTo18Decimals(200));
    expect(await generator.getTotalRefs(alice.address)).to.eq(2);

    // calculate the user's deposit
    const userDepositFee = await generator.userDepFee();
    const likelyDeposit = expandTo18Decimals(10).sub(
      expandTo18Decimals(10).mul(userDepositFee).div(10000)
    );
    await generator.connect(bob).withdraw(0, likelyDeposit, alice.address);

    // Bob withdraws from the pool and Alice's referral value/score should be lowered as a consequence
    expect(await generator.getRefValueOf(alice.address, bob.address)).to.lt(
      refValue
    );
    expect(await generator.getGlobalRefAmount(alice.address)).to.lt(
      globalRefValue
    );

    // Total referrals should still remain intact
    expect(await generator.getTotalRefs(alice.address)).to.eq(2);
  });
});
