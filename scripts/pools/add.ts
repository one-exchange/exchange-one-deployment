import {ethers} from 'hardhat';

async function main() {
  const lpTokenAddress = '0xC9C824F974184A95655d49CF3D6E8C7737f4e9F4';
  const poolWeight = 1000;

  const rewardsGenerator = await ethers.getContract('RewardsGenerator');

  console.log(
    `Adding pool for token ${lpTokenAddress}, weight/alloc points: ${poolWeight} to RewardsGenerator ${rewardsGenerator.address}`
  );
  let poolLength = await rewardsGenerator.poolLength();
  console.log(
    `Current number of pools in the RewardsGenerator contract (${rewardsGenerator.address}): ${poolLength}`
  );
  const result = await rewardsGenerator.add(poolWeight, lpTokenAddress, true);
  console.log({result});
  poolLength = await rewardsGenerator.poolLength();
  console.log(
    `Current number of pools in the RewardsGenerator contract (${rewardsGenerator.address}): ${poolLength}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
