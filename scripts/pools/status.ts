import {ethers} from 'hardhat';

async function main() {
  const rewardsGenerator = await ethers.getContract('RewardsGenerator');

  const startRewardsAtBlock = await rewardsGenerator.START_BLOCK();
  console.log(
    `RewardsGenerator (${rewardsGenerator.address}) -> Current rewards start block number: ${startRewardsAtBlock}`
  );

  const endBonusAtBock = await rewardsGenerator.FINISH_BONUS_AT_BLOCK();
  console.log(
    `RewardsGenerator (${rewardsGenerator.address}) -> Current rewards bonus ends at block: ${endBonusAtBock}`
  );

  const defaultRewardPerBlock = await rewardsGenerator.REWARD_PER_BLOCK();
  console.log(
    `RewardsGenerator (${
      rewardsGenerator.address
    }) -> Default rewards per block: ${ethers.utils.formatEther(
      defaultRewardPerBlock
    )}`
  );

  const newRewardPerBlock = await rewardsGenerator.getNewRewardPerBlock(0);
  console.log(
    `RewardsGenerator (${
      rewardsGenerator.address
    }) -> Current new rewards per block: ${ethers.utils.formatEther(
      newRewardPerBlock
    )}`
  );

  const poolLength = await rewardsGenerator.poolLength();
  console.log(
    `RewardsGenerator (${rewardsGenerator.address}) -> Current number of pools: ${poolLength}`
  );

  for (let i = 0; i < poolLength; i++) {
    const [
      lpToken,
      allocPoint,
      lastRewardBlock,
      accGovTokenPerShare,
    ] = await rewardsGenerator.poolInfo(i);
    console.log(`Pool #${i} - lp token: ${lpToken}, allocPoint: ${allocPoint}`);
    //console.log({ poolInfo })
  }

  const displayRewardsSchedule = false;
  if (displayRewardsSchedule) {
    const periods = 104;

    for (let i = 0; i < periods; i++) {
      const halvingAtBlock = await rewardsGenerator.HALVING_AT_BLOCK(i);

      const blockBefore = halvingAtBlock.sub(1);
      const multiplier = await rewardsGenerator.getMultiplier(
        blockBefore,
        halvingAtBlock
      );

      console.log(
        `Week: ${
          i + 1
        } - halving at block number: ${halvingAtBlock} - multiplier: ${multiplier}`
      );
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
