import { ethers } from 'hardhat'
import { BigNumber, BigNumberish } from 'ethers'
import { Contract } from 'ethers'
const BASE_TEN = 10

export function expandTo18Decimals(n: number): BigNumber {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(18))
}

export async function advanceBlock() {
  return ethers.provider.send('evm_mine', [])
}

export async function advanceBlockTo(blockNumber: number) {
  for (let i = await ethers.provider.getBlockNumber(); i < blockNumber; i++) {
    await advanceBlock()
  }
}

export async function advanceBlockWith(blockCount: number) {
  const currentBlockNumber = await ethers.provider.getBlockNumber()
  const newBlockNumber = currentBlockNumber + blockCount
  await advanceBlockTo(newBlockNumber)
}

export async function increase(value: number) {
  await ethers.provider.send('evm_increaseTime', [value])
  await advanceBlock()
}

export async function latestBlock() {
  return ethers.provider.getBlock('latest')
  //return new BigNumber(block.timestamp)
}

export const duration = {
  seconds: function (val: BigNumberish): BigNumber {
    return BigNumber.from(val)
  },
  minutes: function (val: BigNumberish): BigNumber {
    return BigNumber.from(val).mul(this.seconds('60'))
  },
  hours: function (val: BigNumberish): BigNumber {
    return BigNumber.from(val).mul(this.minutes('60'))
  },
  days: function (val: BigNumberish): BigNumber {
    return BigNumber.from(val).mul(this.hours('24'))
  },
  weeks: function (val: BigNumberish): BigNumber {
    return BigNumber.from(val).mul(this.days('7'))
  },
  years: function (val: BigNumberish): BigNumber {
    return BigNumber.from(val).mul(this.days('365'))
  },
}

// Defaults to e18 using amount * 10^18
export function getBigNumber(amount: BigNumberish, decimals = 18): BigNumber {
  return BigNumber.from(amount).mul(BigNumber.from(BASE_TEN).pow(decimals))
}

export function encodePrice(reserve0: BigNumber, reserve1: BigNumber): BigNumber[] {
  return [
    reserve1.mul(BigNumber.from(2).pow(112)).div(reserve0),
    reserve0.mul(BigNumber.from(2).pow(112)).div(reserve1),
  ]
}

export async function humanBalance(
  token: Contract,
  method = 'balanceOf',
  address?: string | null | undefined,
  label?: string | null | undefined,
  log = true
): Promise<string | undefined> {
  const tokenName = await token.name()
  const tokenSymbol = await token.symbol()
  let balance: BigNumber = BigNumber.from(0)
  const currentBlock = await latestBlock()

  try {
    const args = address ? [address] : []
    balance = await token.functions[method](...args)
  } catch (error) {
    //
  }

  let formattedBalance: string | undefined

  try {
    formattedBalance = ethers.utils.formatEther(balance.toString())
    label = label ? label : address
    label = label ? label : ''

    if (log) {
      console.log(
        `${tokenName}.${method}(${label}): ${formattedBalance} ${tokenSymbol} (block: ${currentBlock.number})\n`
      )
    }
  } catch (error) {
    //
  }

  return formattedBalance
}
