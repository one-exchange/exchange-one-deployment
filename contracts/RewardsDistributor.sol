// SPDX-License-Identifier: MIT

// P1 - P3: OK
pragma solidity 0.6.12;

import "@exchange-one/core/contracts/interfaces/IUniswapV2Factory.sol";
import "@exchange-one/core/contracts/interfaces/IUniswapV2Pair.sol";
import "@exchange-one/core/contracts/interfaces/IUniswapV2ERC20.sol";

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// This contract handles "serving up" rewards for xONEx holders by trading tokens collected from fees for ONEx.

// T1 - T4: OK
contract RewardsDistributor is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // V1 - V5: OK
    IUniswapV2Factory public immutable factory;
    //0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac
    // V1 - V5: OK
    address public immutable stakingPool;
    //0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272
    // V1 - V5: OK
    address private immutable oneXToken;
    //0x6B3595068778DD592e39A122f4f5a5cF09C90fE2
    // V1 - V5: OK
    address private immutable weth;
    //0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

    // V1 - V5: OK
    mapping(address => address) internal _bridges;

    // E1: OK
    event LogBridgeSet(address indexed token, address indexed bridge);
    // E1: OK
    event LogConvert(
        address indexed server,
        address indexed token0,
        address indexed token1,
        uint256 amount0,
        uint256 amount1,
        uint256 amountONEx
    );

    constructor(
        address _factory,
        address _stakingPool,
        address _oneXToken,
        address _weth
    ) public {
        factory = IUniswapV2Factory(_factory);
        stakingPool = _stakingPool;
        oneXToken = _oneXToken;
        weth = _weth;
    }

    // F1 - F10: OK
    // C1 - C24: OK
    function bridgeFor(address token) public view returns (address bridge) {
        bridge = _bridges[token];
        if (bridge == address(0)) {
            bridge = weth;
        }
    }

    // F1 - F10: OK
    // C1 - C24: OK
    function setBridge(address token, address bridge) external onlyOwner {
        // Checks
        require(token != oneXToken && token != weth && token != bridge, "RewardsDistributor: Invalid bridge");

        // Effects
        _bridges[token] = bridge;
        emit LogBridgeSet(token, bridge);
    }

    // M1 - M5: OK
    // C1 - C24: OK
    // C6: It's not a fool proof solution, but it prevents flash loans, so here it's ok to use tx.origin
    modifier onlyEOA() {
        // Try to make flash-loan exploit harder to do by only allowing externally owned addresses.
        require(msg.sender == tx.origin, "RewardsDistributor: must use EOA");
        _;
    }

    // F1 - F10: OK
    // F3: _convert is separate to save gas by only checking the 'onlyEOA' modifier once in case of convertMultiple
    // F6: There is an exploit to add lots of ONEx to the stakingPool, run convert, then remove the ONEx again.
    //     As the size of the SushiBar has grown, this requires large amounts of funds and isn't super profitable anymore
    //     The onlyEOA modifier prevents this being done with a flash loan.
    // C1 - C24: OK
    function convert(address token0, address token1) external onlyEOA() {
        _convert(token0, token1);
    }

    // F1 - F10: OK, see convert
    // C1 - C24: OK
    // C3: Loop is under control of the caller
    function convertMultiple(address[] calldata token0, address[] calldata token1) external onlyEOA() {
        // TODO: This can be optimized a fair bit, but this is safer and simpler for now
        uint256 len = token0.length;
        for (uint256 i = 0; i < len; i++) {
            _convert(token0[i], token1[i]);
        }
    }

    // F1 - F10: OK
    // C1- C24: OK
    function _convert(address token0, address token1) internal {
        // Interactions
        // S1 - S4: OK
        IUniswapV2Pair pair = IUniswapV2Pair(factory.getPair(token0, token1));
        require(address(pair) != address(0), "RewardsDistributor: Invalid pair");
        // balanceOf: S1 - S4: OK
        // transfer: X1 - X5: OK
        IERC20(address(pair)).safeTransfer(address(pair), pair.balanceOf(address(this)));
        // X1 - X5: OK
        (uint256 amount0, uint256 amount1) = pair.burn(address(this));
        if (token0 != pair.token0()) {
            (amount0, amount1) = (amount1, amount0);
        }
        emit LogConvert(msg.sender, token0, token1, amount0, amount1, _convertStep(token0, token1, amount0, amount1));
    }

    // F1 - F10: OK
    // C1 - C24: OK
    // All safeTransfer, _swap, _toONEx, _convertStep: X1 - X5: OK
    function _convertStep(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1
    ) internal returns (uint256 oneXTokenOut) {
        // Interactions
        if (token0 == token1) {
            uint256 amount = amount0.add(amount1);
            if (token0 == oneXToken) {
                IERC20(oneXToken).safeTransfer(stakingPool, amount);
                oneXTokenOut = amount;
            } else if (token0 == weth) {
                oneXTokenOut = _toONEx(weth, amount);
            } else {
                address bridge = bridgeFor(token0);
                amount = _swap(token0, bridge, amount, address(this));
                oneXTokenOut = _convertStep(bridge, bridge, amount, 0);
            }
        } else if (token0 == oneXToken) {
            // eg. ONEx - ETH
            IERC20(oneXToken).safeTransfer(stakingPool, amount0);
            oneXTokenOut = _toONEx(token1, amount1).add(amount0);
        } else if (token1 == oneXToken) {
            // eg. USDT - ONEx
            IERC20(oneXToken).safeTransfer(stakingPool, amount1);
            oneXTokenOut = _toONEx(token0, amount0).add(amount1);
        } else if (token0 == weth) {
            // eg. ETH - USDC
            oneXTokenOut = _toONEx(weth, _swap(token1, weth, amount1, address(this)).add(amount0));
        } else if (token1 == weth) {
            // eg. USDT - ETH
            oneXTokenOut = _toONEx(weth, _swap(token0, weth, amount0, address(this)).add(amount1));
        } else {
            // eg. MIC - USDT
            address bridge0 = bridgeFor(token0);
            address bridge1 = bridgeFor(token1);
            if (bridge0 == token1) {
                // eg. MIC - USDT - and bridgeFor(MIC) = USDT
                oneXTokenOut = _convertStep(bridge0, token1, _swap(token0, bridge0, amount0, address(this)), amount1);
            } else if (bridge1 == token0) {
                // eg. WBTC - DSD - and bridgeFor(DSD) = WBTC
                oneXTokenOut = _convertStep(token0, bridge1, amount0, _swap(token1, bridge1, amount1, address(this)));
            } else {
                oneXTokenOut = _convertStep(
                    bridge0,
                    bridge1, // eg. USDT - DSD - and bridgeFor(DSD) = WBTC
                    _swap(token0, bridge0, amount0, address(this)),
                    _swap(token1, bridge1, amount1, address(this))
                );
            }
        }
    }

    // F1 - F10: OK
    // C1 - C24: OK
    // All safeTransfer, swap: X1 - X5: OK
    function _swap(
        address fromToken,
        address toToken,
        uint256 amountIn,
        address to
    ) internal returns (uint256 amountOut) {
        // Checks
        // X1 - X5: OK
        IUniswapV2Pair pair = IUniswapV2Pair(factory.getPair(fromToken, toToken));
        require(address(pair) != address(0), "RewardsDistributor: Cannot convert");

        // Interactions
        // X1 - X5: OK
        (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();
        uint256 amountInWithFee = amountIn.mul(997);
        if (fromToken == pair.token0()) {
            amountOut = amountIn.mul(997).mul(reserve1) / reserve0.mul(1000).add(amountInWithFee);
            IERC20(fromToken).safeTransfer(address(pair), amountIn);
            pair.swap(0, amountOut, to, new bytes(0));
            // TODO: Add maximum slippage?
        } else {
            amountOut = amountIn.mul(997).mul(reserve0) / reserve1.mul(1000).add(amountInWithFee);
            IERC20(fromToken).safeTransfer(address(pair), amountIn);
            pair.swap(amountOut, 0, to, new bytes(0));
            // TODO: Add maximum slippage?
        }
    }

    // F1 - F10: OK
    // C1 - C24: OK
    function _toONEx(address token, uint256 amountIn) internal returns (uint256 amountOut) {
        // X1 - X5: OK
        amountOut = _swap(token, oneXToken, amountIn, stakingPool);
    }
}
