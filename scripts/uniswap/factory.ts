import hre from 'hardhat';
import {parseTokens, findTokensBy} from '../../utils/tokens';

const ethers = hre.ethers;
const tokens = parseTokens(hre.network.config.chainId, 'all');

async function main() {
  const factory = await ethers.getContract('UniswapV2Factory');

  const allPairsLength = await factory.allPairsLength();
  console.log(
    `There is a total of ${allPairsLength} pairs created by the factory ${factory.address} \n`
  );

  for (let index = 0; index < allPairsLength; index++) {
    console.log(
      `Fetching pair address for the token pair via index ${index} ...`
    );
    const pairAddress = await factory.allPairs(index);
    console.log(
      `The pair address for the token pair at index ${index} is: ${pairAddress}\n`
    );

    await pairDetails(pairAddress);
  }
}

async function pairDetails(address: string) {
  const pairContract = await ethers.getContractAt('IUniswapV2Pair', address);

  const name = await pairContract.name();
  console.log(`The name for the pair contract ${address} is: ${name}\n`);

  const symbol = await pairContract.symbol();
  console.log(`The symbol for the pair contract ${address} is: ${symbol}\n`);

  const decimals = await pairContract.decimals();
  console.log(
    `The decimals for the pair contract ${address} is: ${decimals}\n`
  );

  const totalSupply = await pairContract.totalSupply();
  console.log(
    `The total supply for the pair contract ${address} is: ${ethers.utils.formatEther(
      totalSupply
    )}\n`
  );

  const minimumLiquidity = await pairContract.MINIMUM_LIQUIDITY();
  console.log(
    `The minimum liqudity for the pair contract ${address} is: ${ethers.utils.formatEther(
      minimumLiquidity
    )}\n`
  );

  const liquidity = await pairContract.balanceOf(address);
  console.log(
    `The current liquidity for the pair contract ${address} is: ${ethers.utils.formatEther(
      liquidity
    )}\n`
  );

  const factory = await pairContract.factory();
  console.log(
    `The factory address for the pair contract ${address} is: ${factory}\n`
  );

  const token0Address = await pairContract.token0();
  const token0 = findTokensBy(tokens, 'address', token0Address)[0];
  const token0Symbol = token0 ? token0.symbol : '';
  const token0Contract = await ethers.getContractAt(
    '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
    token0Address
  );
  const token0UnderlyingBalance = await token0Contract.balanceOf(address);
  console.log(
    `The token0 address for the pair contract ${address} is: ${token0Address} - ${token0Symbol}. Underlying balance: ${ethers.utils.formatEther(
      token0UnderlyingBalance
    )} ${token0Symbol}.\n`
  );

  const token1Address = await pairContract.token1();
  const token1 = findTokensBy(tokens, 'address', token1Address)[0];
  const token1Symbol = token1 ? token1.symbol : '';
  const token1Contract = await ethers.getContractAt(
    '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
    token1Address
  );
  const token1UnderlyingBalance = await token1Contract.balanceOf(address);
  console.log(
    `The token1 address for the pair contract ${address} is: ${token1Address} - ${token1Symbol}. Underlying balance: ${ethers.utils.formatEther(
      token1UnderlyingBalance
    )} ${token1Symbol}.\n`
  );

  const {
    reserve0,
    reserve1,
    blockTimestampLast,
  } = await pairContract.getReserves();
  const totalReserves = ethers.BigNumber.from(reserve0).add(
    ethers.BigNumber.from(reserve1)
  );

  console.log(`The reserves for the pair contract ${address} is:`);
  console.log(
    `  Reserve 0: ${ethers.utils.formatEther(
      reserve0
    )} (${reserve0}) - ${token0Address} - ${token0Symbol}`
  );
  console.log(
    `  Reserve 1: ${ethers.utils.formatEther(
      reserve1
    )} (${reserve1}) - ${token1Address} - ${token1Symbol}`
  );
  console.log(
    `  Total reserves: ${ethers.utils.formatEther(totalReserves.toString())}`
  );
  console.log(`  BlockTimestampLast: ${blockTimestampLast}\n\n`);

  console.log(
    '----------------------------------------------------------------------------------------------\n\n'
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
