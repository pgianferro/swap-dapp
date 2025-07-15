// SPDX-License-Identifier: MIT
pragma solidity >0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./LPToken.sol";

/// @title SimpleSwap
/// @author Pablo Gianferro
/// @notice A minimalistic Uniswap-like DEX for two ERC20 tokens (tokenA and tokenB).
/// @dev Manages a liquidity pool with constant product formula and issues ERC20 LP tokens using a separate contract.
contract SimpleSwap {
    /// @notice Address of the LP token contract used to mint/burn liquidity tokens
    LPToken public lpToken;

    /// @notice Address of token A in the pair
    address public tokenA;

    /// @notice Address of token B in the pair
    address public tokenB;

    /// @notice Current reserve amount of token A held by the contract
    uint256 public reserveA;

    /// @notice Current reserve amount of token B held by the contract
    uint256 public reserveB;

    /// @notice Address of the contract owner (set at deployment)
    address public owner;

    /// @notice Initializes the SimpleSwap contract with the two token addresses and creates LP token instance
    /// @param _tokenA Address of token A
    /// @param _tokenB Address of token B
    constructor(address _tokenA, address _tokenB) {
        lpToken = new LPToken("SimpleSwap LP Token", "SSLP", address(this));
        tokenA = _tokenA;
        tokenB = _tokenB;
        owner = msg.sender;
    }

    /// @notice Struct to group tokenA and tokenB as a pair
    struct TokenPair {
        address tokenA;
        address tokenB;
    }

    /// @notice Emitted when the first liquidity is added to the pool
    /// @param provider Address of the liquidity provider
    /// @param amountA Amount of token A deposited
    /// @param amountB Amount of token B deposited
    /// @param liquidityMinted Amount of LP tokens minted
    event InitialLiquidityAdded(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityMinted
    );

    /// @notice Emitted when additional liquidity is added
    /// @param provider Address of the liquidity provider
    /// @param amountA Amount of token A deposited
    /// @param amountB Amount of token B deposited
    /// @param liquidityMinted Amount of LP tokens minted
    event LiquidityAdded(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityMinted
    );

    /// @notice Emitted when liquidity is removed from the pool
    /// @param provider Address of the liquidity provider
    /// @param amountA Amount of token A returned to the user
    /// @param amountB Amount of token B returned to the user
    /// @param liquidityBurned Amount of LP tokens burned
    event LiquidityRemoved(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityBurned
    );

    /// @notice Emitted when a user performs a token swap
    /// @param swapper Address performing the swap
    /// @param tokenIn Address of the input token
    /// @param amountIn Amount of input token
    /// @param tokenOut Address of the output token
    /// @param amountOut Amount of output token
    event TokensSwapped(
        address indexed swapper,
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOut
    );

    /// @notice Adds liquidity to the pool and mints LP tokens
    /// @param tokenA_ Address of token A (must match the pool)
    /// @param tokenB_ Address of token B (must match the pool)
    /// @param amountADesired Amount of token A to contribute
    /// @param amountBDesired Amount of token B to contribute
    /// @param amountAMin Minimum acceptable amount of token A
    /// @param amountBMin Minimum acceptable amount of token B
    /// @param to Address to receive the minted LP tokens
    /// @param deadline Expiration timestamp for the transaction
    /// @return amountA Actual amount of token A added
    /// @return amountB Actual amount of token B added
    /// @return liquidity Amount of LP tokens minted
    function addLiquidity(
        address tokenA_,
        address tokenB_,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        TokenPair memory tokens = TokenPair(tokenA, tokenB);

        require(deadline > block.timestamp, "Transact expired");
        require(
            tokenA_ == tokens.tokenA && tokenB_ == tokens.tokenB,
            "bad pair"
        );

        uint256 _reserveA = reserveA;
        uint256 _reserveB = reserveB;
        uint256 _supply = lpToken.totalSupply();

        if (_reserveA == 0 && _reserveB == 0) {
            // First add: use amountDesired for A and B
            amountA = amountADesired;
            amountB = amountBDesired;
        } else {
            {
                //Mantain pool proportion
                uint256 amountBOptimal = (amountADesired * _reserveB) /
                    _reserveA;

                if (amountBOptimal <= amountBDesired) {
                    require(amountBOptimal >= amountBMin, "B low");
                    amountA = amountADesired;
                    amountB = amountBOptimal;
                } else {
                    {
                        uint256 amountAOptimal = (amountBDesired * _reserveA) /
                            _reserveB;
                        require(amountAOptimal <= amountADesired, "A high");
                        require(amountAOptimal >= amountAMin, "A low");
                        amountA = amountAOptimal;
                        amountB = amountBDesired;
                    }
                }
            }
        }

        IERC20(tokens.tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokens.tokenB).transferFrom(msg.sender, address(this), amountB);

        if (_supply == 0) {
            liquidity = Math.sqrt(amountA * amountB);
        } else {
            liquidity = Math.min(
                (amountA * _supply) / _reserveA,
                (amountB * _supply) / _reserveB
            );
        }

        require(liquidity > 0, "zero liq");

        // Update reserves
        reserveA += amountA;
        reserveB += amountB;

        //Mint LP tokens using ERC20-compliant LPToken contract
        lpToken.mint(to, liquidity);

        emit LiquidityAdded(msg.sender, amountA, amountB, liquidity);
        return (amountA, amountB, liquidity);
    }

    /// @notice Removes liquidity from the pool and burns LP tokens
    /// @param tokenA_ Address of token A (must match the pool)
    /// @param tokenB_ Address of token B (must match the pool)
    /// @param liquidity Amount of LP tokens to burn
    /// @param amountAMin Minimum acceptable amount of token A
    /// @param amountBMin Minimum acceptable amount of token B
    /// @param to Address to receive the returned tokens
    /// @param deadline Expiration timestamp for the transaction
    /// @return amountA Actual amount of token A returned
    /// @return amountB Actual amount of token B returned
    function removeLiquidity(
        address tokenA_,
        address tokenB_,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB) {
        require(deadline > block.timestamp, "Transact expired");

        TokenPair memory tokens = TokenPair(tokenA, tokenB);
        require(
            tokenA_ == tokens.tokenA && tokenB_ == tokens.tokenB,
            "bad pair"
        );

        uint256 _reserveA = reserveA;
        uint256 _reserveB = reserveB;
        uint256 _supply = lpToken.totalSupply();

        //Calculates amount of token A and B to return to user
        amountA = (liquidity * _reserveA) / _supply;
        amountB = (liquidity * _reserveB) / _supply;

        require(amountA >= amountAMin, "A < min");
        require(amountB >= amountBMin, "B < min");
        require(lpToken.balanceOf(msg.sender) >= liquidity, "LP low");
        require(_reserveA >= amountA && _reserveB >= amountB, "reserves low");

        //Burns the LP tokens equivalent to the liquidity param from user
        lpToken.burnFrom(msg.sender, liquidity);

        //Transfers the tokens to user
        IERC20(tokens.tokenA).transfer(to, amountA);
        IERC20(tokens.tokenB).transfer(to, amountB);

        //State
        reserveA = _reserveA - amountA;
        reserveB = _reserveB - amountB;

        emit LiquidityRemoved(msg.sender, amountA, amountB, liquidity);

        return (amountA, amountB);
    }

    /// @notice Exchanges one token for another in the exact amount.
    /// @param amountIn Amount of input tokens.
    /// @param amountOutMin: Minimum acceptable number of output tokens.
    /// @param path: Array of token addresses. (input token, output token)
    /// @param to: Recipient address.
    /// @param deadline: Timestamp for the transaction.
    /// @return amounts : Array with input and output amounts.
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(deadline > block.timestamp, "Transact expired");
        require(path.length == 2 && path[0] != path[1], "invalid tokens");
        require(amountIn > 0, "amountIn 0");

        TokenPair memory tokens = TokenPair(tokenA, tokenB);
        uint256 _reserveA = reserveA;
        uint256 _reserveB = reserveB;

        require(
            (path[0] == tokens.tokenA && path[1] == tokens.tokenB) ||
                (path[0] == tokens.tokenB && path[1] == tokens.tokenA),
            "invalid tokens"
        );

        uint256 amountOut;

        if (path[0] == tokens.tokenA) {
            IERC20(tokens.tokenA).transferFrom(
                msg.sender,
                address(this),
                amountIn
            );
            amountOut = (amountIn * _reserveB) / (_reserveA + amountIn);
            require(amountOut >= amountOutMin, "insufficient amountOut");
            IERC20(tokens.tokenB).transfer(to, amountOut);

            reserveA = _reserveA + amountIn;
            reserveB = _reserveB - amountOut;
        } else {
            IERC20(tokens.tokenB).transferFrom(
                msg.sender,
                address(this),
                amountIn
            );
            amountOut = (amountIn * _reserveA) / (_reserveB + amountIn);
            require(amountOut >= amountOutMin, "insufficient amountOut");
            IERC20(tokens.tokenA).transfer(to, amountOut);

            reserveA = _reserveA - amountOut;
            reserveB = _reserveB + amountIn;
        }

        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;

        emit TokensSwapped(msg.sender, path[0], amountIn, path[1], amountOut);

        return amounts;
    }

    /// @notice Gets the price of one token in terms of another.
    /// @param tokenA_ Address of the first ERC20 token to calculate a price for.
    /// @param tokenB_ Address of the second ERC20 token to calculate a price for.
    /// @return price Price of tokenA in terms of tokenB
    function getPrice(
        address tokenA_,
        address tokenB_
    ) external view returns (uint256 price) {
        TokenPair memory tokens = TokenPair(tokenA, tokenB);
        require(
            (tokenA_ == tokens.tokenA && tokenB_ == tokens.tokenB) ||
                (tokenA_ == tokens.tokenB && tokenB_ == tokens.tokenA),
            "Invalid tokens"
        );

        //Obtains reserves
        uint256 reserveA_ = reserveA;
        uint256 reserveB_ = reserveB;

        require(reserveA_ > 0, "No A reserve");

        // Calculates price
        price = (reserveB_ * 1e18) / reserveA_;

        return price;
    }

    /// @notice Calculates how many tokens will be received when exchanging
    /// @param amountIn: Amount of input tokens.
    /// @param reserveIn, reserveOut: Current reserves in the contract.
    /// @return amountOut : Amount of tokens to receive.
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountOut) {
        require(amountIn > 0, "amountIn < 0");
        require(reserveIn > 0 && reserveOut > 0, "Reserves < 0");

        amountOut = (amountIn * reserveOut) / (reserveIn + amountIn);

        return amountOut;
    }
}
