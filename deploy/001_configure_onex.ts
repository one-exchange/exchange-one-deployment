import {ethers} from 'hardhat';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, log} = deployments;
  const {deployer} = await getNamedAccounts();

  log(`\nAdding ${deployer} as an authorized user for OneX token ...`);
  await execute('OneX', {from: deployer, log: true}, 'addAuthorized', deployer);
  const isAuthorized = await read('OneX', 'authorized', deployer);
  log(`${deployer} is authorized for OneX token: ${isAuthorized}`);

  const fundsReceiver = deployer;

  if (hre.network.name.match(/_testnet/)) {
    log(
      `\nMinting 1,000,000 OneX to the deployer address for testing purposes ...`
    );
    await execute(
      'OneX',
      {from: deployer, log: true},
      'mint',
      deployer,
      '1000000000000000000000000'
    );
    const totalSupply = await read('OneX', 'totalSupply');
    const balance = await read('OneX', 'balanceOf', deployer);
    log(
      `OneX balance for the deployer address is now: ${ethers.utils.formatEther(
        balance
      )}`
    );
    log(
      `Total supply of OneX is now: ${ethers.utils.formatEther(totalSupply)}`
    );
  }

  log(
    `\nStarting pre-minting process - a total of 4,935,000 ONEx tokens will be pre-minted ...`
  );

  // Airdrop
  log(
    `\nPre-minting 2.1m OneX for the initial airdrop/liquidity mining program ...`
  );
  await execute(
    'OneX',
    {from: deployer, log: true},
    'mint',
    fundsReceiver,
    '2100000000000000000000000'
  );

  let totalSupply = await read('OneX', 'totalSupply');
  let balance = await read('OneX', 'balanceOf', deployer);
  log(
    `OneX balance for the funds receiver ${fundsReceiver} is now: ${ethers.utils.formatEther(
      balance
    )}`
  );
  log(`Total supply of OneX is now: ${ethers.utils.formatEther(totalSupply)}`);

  // xONEx staking program
  log(
    `\nPre-minting 1,890,000 OneX required to fund the xONEx staking incentives program ...`
  );
  await execute(
    'OneX',
    {from: deployer, log: true},
    'mint',
    fundsReceiver,
    '1890000000000000000000000'
  );

  totalSupply = await read('OneX', 'totalSupply');
  balance = await read('OneX', 'balanceOf', deployer);
  log(
    `OneX balance for the funds receiver ${fundsReceiver} is now: ${ethers.utils.formatEther(
      balance
    )}`
  );
  log(`Total supply of OneX is now: ${ethers.utils.formatEther(totalSupply)}`);

  // Trading incentives
  log(
    `\nPre-minting 945,000 OneX required to fund the tradings incentives program ...`
  );
  await execute(
    'OneX',
    {from: deployer, log: true},
    'mint',
    fundsReceiver,
    '945000000000000000000000'
  );

  totalSupply = await read('OneX', 'totalSupply');
  balance = await read('OneX', 'balanceOf', deployer);
  log(
    `OneX balance for the funds receiver ${fundsReceiver} is now: ${ethers.utils.formatEther(
      balance
    )}`
  );
  log(
    `Total supply of OneX is now: ${ethers.utils.formatEther(totalSupply)}\n`
  );
};
export default func;
