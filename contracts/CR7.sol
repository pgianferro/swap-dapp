// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title CR7 Token
/// @author Pablo Gianferro
/// @notice This token is used for swapping with M10 in the SimpleSwap contract
/// @dev Inherits standard ERC20 functionality from OpenZeppelin
contract CR7 is ERC20 {
    /// @notice Mints 1,000,000 CR7 tokens to the deployer on deployment
    constructor() ERC20("Cristiano Token", "CR7") {
        _mint(msg.sender, 1_000_000 ether);
    }
}