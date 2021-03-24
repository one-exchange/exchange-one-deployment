import {ethers} from 'hardhat';
import {Contract, BigNumberish} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {expandTo18Decimals} from './utilities';

const overrides = {
  gasLimit: 9500000,
};

export const LOCK_FROM_BLOCK = 100;
export const LOCK_TO_BLOCK = 200;

export async function deployOneX(
  wallet: SignerWithAddress,
  lockFromBlock = LOCK_FROM_BLOCK,
  lockToBlock = LOCK_TO_BLOCK
): Promise<Contract> {
  const OneX = await ethers.getContractFactory('OneX', wallet);
  const constructorArgs = [lockFromBlock, lockToBlock];
  const token = await OneX.deploy(...constructorArgs);
  return token;
}

export async function deployRewardsGenerator(
  wallets: SignerWithAddress[],
  token: Contract,
  rewardPerBlock: BigNumberish,
  startBlock: BigNumberish,
  halvingAfterBlock: BigNumberish,
  initializeLocks = true
): Promise<Contract> {
  const userDepFee = 75; // uint256 - 0.75% deposit fee - user.amount = user.amount.add(_amount.sub(_amount.mul(userDepFee).div(10000)));
  const devDepFee = 9925; // uint256 - devr.amount = devr.amount.add(_amount.sub(_amount.mul(devDepFee).div(10000)));

  // Block deltas represent block ranges expected to represent certain periods of time
  // The values below are the original Bao values on Ethereum (~13s block time)
  // These values need to be adjusted for other blockchains with faster blocks so that they sync up with the expected time periods in fee ruleset
  const blockDeltaStartStage = [0, 1, 275, 6601, 19801, 33001, 90721, 181441]; // uint256
  const blockDeltaEndStage = [274, 6600, 19800, 33000, 90720, 181440]; // uint256
  // e.g: user.blockdelta >= blockDeltaStartStage[1] && user.blockdelta <= blockDeltaEndStage[0]
  // = between blocks 1 and 274 = 13 to 3562 seconds = minute 0 to minute 59
  // -> 8% fee if a user deposits and withdraws in between same block and 59 minutes.

  // userFeeStage[0] = 25% fee for withdrawals of LP tokens in the same block to prevent abuse from flashloans
  // userFeeStage[1] = 8% fee if a user deposits and withdraws in between same block and 59 minutes.
  // userFeeStage[2] = 4% fee if a user deposits and withdraws after 1 hour but before 1 day.
  // userFeeStage[3] = 2% fee if a user deposits and withdraws between after 1 day but before 3 days.
  // userFeeStage[4] = 1% fee if a user deposits and withdraws after 3 days but before 5 days.
  // userFeeStage[5] = 0.5% fee if a user deposits and withdraws if the user withdraws after 5 days but before 2 weeks.
  // userFeeStage[6] = 0.25% fee if a user deposits and withdraws after 2 weeks.
  // userFeeStage[7] = 0.1% fee if a user deposits and withdraws after 4 weeks.
  const userFeeStage = [75, 92, 96, 98, 99, 995, 9975, 9999]; // uint256
  const devFeeStage = [25, 8, 4, 2, 1, 5, 25, 1]; // uint256
  // e.g. withdraw during userFeeStage[0] - user receives 75% of his original LP, 25% gets sent to the dev fund address

  // 2 years (52 x 2 weeks) worth of reward multipliers
  const rewardMultipliers = [
    256,
    128,
    64,
    32,
    32,
    16,
    16,
    8,
    8,
    8,
    8,
    8,
    8,
    8,
    8,
    8,
    8,
    8,
    8,
    8,
    8,
    4,
    4,
    4,
    4,
    4,
    4,
    2,
    2,
    2,
    2,
    2,
    1,
    1,
    1,
    1,
    1,
    1,
    2,
    2,
    2,
    2,
    2,
    4,
    4,
    4,
    8,
    8,
    8,
    8,
    8,
    16,
    16,
    16,
    16,
    16,
    16,
    16,
    16,
    16,
    16,
    8,
    8,
    8,
    8,
    8,
    8,
    4,
    4,
    2,
    2,
    1,
    1,
    1,
    1,
    1,
    1,
    2,
    2,
    4,
    4,
    4,
    4,
    8,
    8,
    8,
    8,
    8,
    16,
    16,
    32,
    32,
    32,
    32,
    16,
    8,
    4,
    2,
    1,
    1,
    1,
    1,
    2,
    2,
  ];

  const [
    alice,
    bob,
    carol,
    minter,
    dev,
    liquidityFund,
    communityFund,
    founderFund,
  ] = wallets;

  const constructorArgs = [
    token.address,
    dev.address,
    liquidityFund.address,
    communityFund.address,
    founderFund.address,
    rewardPerBlock,
    startBlock,
    halvingAfterBlock,
    userDepFee,
    devDepFee,
    rewardMultipliers,
    blockDeltaStartStage,
    blockDeltaEndStage,
    userFeeStage,
    devFeeStage,
  ];

  const RewardsGenerator = await ethers.getContractFactory('RewardsGenerator');
  const contract = await RewardsGenerator.deploy(...constructorArgs);

  //Init contract
  if (initializeLocks) {
    await contract.lockUpdate(33); // 95% of rewards will be locked between the OneX token's _lockFromBlock and _lockToBlock
    await contract.lockcomUpdate(0); // 0% rewards to community rewards pool
    await contract.lockdevUpdate(0); // 0% rewards to dev rewards pool
    await contract.lockfounderUpdate(0); // 0% rewards to founder rewards pool
    await contract.locklpUpdate(0); // 0% rewards to lp rewards pool
  }

  await contract.addAuthorized(alice.address);

  return contract;
}
