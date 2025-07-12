# ⚽ Messi vs Ronaldo Swap DApp

A decentralized exchange (DEX) demo where users can swap between two custom ERC20 tokens: `M10` (Messi) and `CR7` (Ronaldo). Built with Solidity, Hardhat, OpenZeppelin, and a simple vanilla JS frontend.

---

## 📌 Description

This project implements a minimalistic Uniswap-like swap contract (`SimpleSwap`) allowing users to:

- Add/remove liquidity for M10 and CR7 tokens
- Perform token swaps using the constant product formula
- Automatically mint LP tokens to liquidity providers
- Connect and interact via a web frontend with Metamask

The project is educational and ideal for understanding AMM logic, testing, and basic front-end integration.

---

## 🚀 Live Demo

- 💻 Web App: [https://pgianferro.github.io/swap-dapp/](https://pgianferro.github.io/swap-dapp/)
- 📁 Repository: [https://github.com/pgianferro/swap-dapp](https://github.com/pgianferro/swap-dapp)

---

## 🛠️ Installation



---

## ⚙️ Usage

Once contracts are deployed and the frontend is live:

1. Connect your wallet using MetaMask.
2. Use the UI to:
   - Add liquidity for M10 and CR7 tokens.
   - Swap tokens using the **Swap** interface.
   - View balances and price estimations in real time.
3. The interface includes:
   - A live price quote using `getAmountOut`.
   - LP token minting on liquidity addition.
   - Transaction feedback via toasts and loading spinners.

💡 The frontend is styled with a sports-inspired theme and features a Messi & Ronaldo background to reflect the token branding.


---

## 🧪 Tests & Coverage

This project includes a comprehensive test suite covering all core functionalities of the `SimpleSwap` smart contract.

### ✅ Summary

- Frameworks: Hardhat + Mocha + Chai
- Coverage tool: `solidity-coverage` v0.8.16
- Network: Hardhat EVM v2.25.0
- Solidity compiler target: `evmVersion: paris`
- Test run: 21 passing assertions (avg: 320ms)


### 🧪 Unit Tests (21/21 Passed)

#### 1. Liquidity Provision

- **1.1** - Should allow initial liquidity provision correctly
- **1.2** - Should revert if the deadline has already passed
- **1.3** - Should revert if the token pair is provided in the wrong order
- **1.4** - Should revert if one of the tokens is not part of the expected pair
- **1.5** - Should revert if `amountBOptimal` is less than `amountBMin`

#### 2. Liquidity Removal

- **2.1** - Should allow removing liquidity correctly
- **2.2** - Should revert if deadline has expired
- **2.3** - Should revert if token order is inverted
- **2.4** - Should revert if using an unknown token
- **2.5** - Should revert if trying to remove more liquidity than available

#### 3. Price Calculation

- **3.1** - Should return correct price if reserves are valid
- **3.2** - Should revert if using an unknown token
- **3.3** - Should revert if reserveA is zero

#### 4. Swap Calculation (`getAmountOut`)

- **4.1** - Should return correct amountOut with realistic values
- **4.2** - Should fail if amountIn is 0
- **4.3** - Should fail if reserveIn is 0
- **4.4** - Should fail if reserveOut is 0
- **4.5** - Should fail if both reserves are 0

#### 5. LP Token Metadata

- **5.1** - Should return correct LP token name
- **5.2** - Should return correct LP token symbol
- **5.3** - Should return correct LP token decimals

---

### 📊 Coverage Report

| File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Lines     |
|------------------|---------|----------|---------|---------|---------------------|
| `CR7.sol`        | 100%    | 100%     | 100%    | 100%    | -                   |
| `M10.sol`        | 100%    | 100%     | 100%    | 100%    | -                   |
| `SimpleSwap.sol` | 68.25%  | 51.79%   | 88.89%  | 65%     | Lines 336, 338, 340 |
| **Total**        | **69.23%** | **51.79%** | **90.91%** | **65.69%** | - |

📁 Coverage reports available in `/coverage/` and `coverage.json`.

---

### 🔒 Notes for Auditors

- Coverage focuses on **swap**, **liquidity**, and **AMM math**
- Custom LP token logic is validated for state correctness
- All state-modifying functions check input consistency and deadline safety
- Custom errors (via `require`) are concise and consistent
- Integer math ensures behavior is deterministic (no floating point rounding)

ℹ️ Additional scenarios (e.g. edge-case slippage or flash loan prevention) can be added in extended test suites.