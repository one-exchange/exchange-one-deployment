import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, log} = deployments;
  const {deployer} = await getNamedAccounts();

  const RewardsGenerator = await deployments.get('RewardsGenerator');

  const rewardsPercentageCommunity = 0;
  const rewardsPercentageDeveloper = 0;
  const rewardsPercentageFounder = 0;
  const rewardsPercentageLiquidityProvider = 0;

  log(
    `\nAdding deployer address ${deployer} as an authorized user for RewardsGenerator ...`
  );
  await execute(
    'RewardsGenerator',
    {from: deployer, log: true},
    'addAuthorized',
    deployer
  );
  const isAuthorized = await read('RewardsGenerator', 'authorized', deployer);
  log(
    `deployer address ${deployer} is authorized for RewardsGenerator: ${isAuthorized}`
  );

  log(`\nChanging the owner of OneX token to RewardsGenerator ...`);
  await execute(
    'OneX',
    {from: deployer, log: true},
    'transferOwnership',
    RewardsGenerator.address
  );
  const newOwner = await read('OneX', 'owner');
  log(`The new owner of the OneX token is: ${newOwner}`);

  log(`\nConfiguring lock settings ...`);
  const lockRatio = 95;
  log(
    `\nLocking ${lockRatio}% of rewards between OneX token's _lockFromBlock and _lockToBlock ...`
  );
  await execute(
    'RewardsGenerator',
    {from: deployer, log: true},
    'lockUpdate',
    lockRatio
  );
  const percentLockBonusReward = await read(
    'RewardsGenerator',
    'PERCENT_LOCK_BONUS_REWARD'
  );
  log(
    `PERCENT_LOCK_BONUS_REWARD has now been set to ${percentLockBonusReward} ...`
  );

  log(`\nConfiguring reward settings ...`);

  log(
    `\nSetting community rewards percentage to ${rewardsPercentageCommunity}% ...`
  );
  await execute(
    'RewardsGenerator',
    {from: deployer, log: true},
    'lockcomUpdate',
    rewardsPercentageCommunity
  );
  const communityRewardsPercentage = await read(
    'RewardsGenerator',
    'PERCENT_FOR_COM'
  );
  log(`PERCENT_FOR_COM has now been set to ${communityRewardsPercentage} ...`);

  log(
    `\nSetting developer rewards percentage to ${rewardsPercentageDeveloper}% ...`
  );
  await execute(
    'RewardsGenerator',
    {from: deployer, log: true},
    'lockdevUpdate',
    rewardsPercentageDeveloper
  );
  const developerRewardsPercentage = await read(
    'RewardsGenerator',
    'PERCENT_FOR_DEV'
  );
  log(`PERCENT_FOR_DEV has now been set to ${developerRewardsPercentage} ...`);

  log(
    `\nSetting founder rewards percentage to ${rewardsPercentageFounder}% ...`
  );
  await execute(
    'RewardsGenerator',
    {from: deployer, log: true},
    'lockfounderUpdate',
    rewardsPercentageFounder
  );
  const founderRewardsPercentage = await read(
    'RewardsGenerator',
    'PERCENT_FOR_FOUNDERS'
  );
  log(
    `PERCENT_FOR_FOUNDERS has now been set to ${founderRewardsPercentage} ...`
  );

  log(
    `\nSetting liquidity provider rewards percentage to ${rewardsPercentageLiquidityProvider}% ...`
  );
  await execute(
    'RewardsGenerator',
    {from: deployer, log: true},
    'locklpUpdate',
    rewardsPercentageLiquidityProvider
  );
  const lpRewardsPercentage = await read('RewardsGenerator', 'PERCENT_FOR_LP');
  log(`\nPERCENT_FOR_LP has now been set to ${lpRewardsPercentage} ...`);
};
func.tags = ['RewardsGenerator'];
export default func;
