// ignition/modules/SimpleSwap.js
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const SimpleSwapModule = buildModule("SimpleSwapModule", (deployer) => {
  const tokenA = "0xE893eB464b251d3174f4E2210aB537918cC4FFF6"; 
  const tokenB = "0x18d27f72Bc6B7CE5cf1998d4e4fA746630cA3C40";

  const swap = deployer.contract("SimpleSwap", [tokenA, tokenB]);

  return { swap };
});

module.exports = SimpleSwapModule;