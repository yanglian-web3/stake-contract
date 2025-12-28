// scripts/deploy/deploy-dex.js
const { ethers } = require("hardhat");
const ConfigManager = require("../utils/config-manager");

async function deployDexSystem(deployer, existingTokens = {}) {
    console.log("\n🚀 部署 DEX 系统...");

    const deploymentResult = {
        simpleDex: null,
        tokens: {},
        timestamp: new Date().toISOString()
    };

    try {
        // 检查是否已有代币，如果没有则部署新代币
        let tokenA, tokenB;
        let useExistingTokens = false;

        if (existingTokens.TKNA && existingTokens.TKNB) {
            console.log("使用现有代币进行 DEX 部署...");

            // 检查代币余额
            const tokenAContract = await ethers.getContractAt("ERC20", existingTokens.TKNA.address);
            const tokenBContract = await ethers.getContractAt("ERC20", existingTokens.TKNB.address);

            const tokenABalance = await tokenAContract.balanceOf(deployer.address);
            const tokenBBalance = await tokenBContract.balanceOf(deployer.address);

            console.log(`TKNA 余额: ${ethers.formatUnits(tokenABalance, existingTokens.TKNA.decimals)}`);
            console.log(`TKNB 余额: ${ethers.formatUnits(tokenBBalance, existingTokens.TKNB.decimals)}`);

            // 检查余额是否足够
            const requiredTokenA = ethers.parseEther("100"); // 需要 100 TKNA
            const requiredTokenB = ethers.parseUnits("50", 6); // 需要 50 TKNB

            if (tokenABalance < requiredTokenA) {
                console.warn(`⚠️ TKNA 余额不足，需要: ${ethers.formatEther(requiredTokenA)}，当前: ${ethers.formatUnits(tokenABalance, existingTokens.TKNA.decimals)}`);
                console.log("将部署新的 TKNA 代币...");
                useExistingTokens = false;
            } else if (tokenBBalance < requiredTokenB) {
                console.warn(`⚠️ TKNB 余额不足，需要: ${ethers.formatUnits(requiredTokenB, 6)}，当前: ${ethers.formatUnits(tokenBBalance, existingTokens.TKNB.decimals)}`);
                console.log("将部署新的 TKNB 代币...");
                useExistingTokens = false;
            } else {
                tokenA = {
                    address: existingTokens.TKNA.address,
                    symbol: existingTokens.TKNA.symbol || "TKNA",
                    decimals: existingTokens.TKNA.decimals || 18,
                    contract: tokenAContract
                };
                tokenB = {
                    address: existingTokens.TKNB.address,
                    symbol: existingTokens.TKNB.symbol || "TKNB",
                    decimals: existingTokens.TKNB.decimals || 6,
                    contract: tokenBContract
                };
                useExistingTokens = true;
            }
        } else {
            console.log("未提供现有代币，部署新的 DEX 测试代币...");
            useExistingTokens = false;
        }

        if (!useExistingTokens) {
            console.log("部署新的 DEX 测试代币...");

            // 部署两个测试代币
            const SimpleToken = await ethers.getContractFactory("SimpleToken");

            // 代币 A (TKNA)
            const tokenAContract = await SimpleToken.deploy(
                "Token A",
                "TKNA",
                18,
                1000000,
                deployer.address
            );
            await tokenAContract.waitForDeployment();
            const tokenAAddress = await tokenAContract.getAddress();

            tokenA = {
                address: tokenAAddress,
                symbol: await tokenAContract.symbol(),
                name: await tokenAContract.name(),
                decimals: await tokenAContract.decimals(),
                contract: tokenAContract
            };

            // 代币 B (TKNB)
            const tokenBContract = await SimpleToken.deploy(
                "Token B",
                "TKNB",
                6,
                1000000,
                deployer.address
            );
            await tokenBContract.waitForDeployment();
            const tokenBAddress = await tokenBContract.getAddress();

            tokenB = {
                address: tokenBAddress,
                symbol: await tokenBContract.symbol(),
                name: await tokenBContract.name(),
                decimals: await tokenBContract.decimals(),
                contract: tokenBContract
            };
        }

        // 保存代币信息
        deploymentResult.tokens = {
            TKNA: {
                address: tokenA.address,
                symbol: tokenA.symbol,
                name: tokenA.name || tokenA.symbol,
                decimals: tokenA.decimals
            },
            TKNB: {
                address: tokenB.address,
                symbol: tokenB.symbol,
                name: tokenB.name || tokenB.symbol,
                decimals: tokenB.decimals
            }
        };

        // 部署 SimpleDEX
        console.log("\n部署 SimpleDEX 合约...");
        const SimpleDEX = await ethers.getContractFactory("SimpleDEX");
        const dex = await SimpleDEX.deploy(tokenA.address, tokenB.address);
        await dex.waitForDeployment();
        const dexAddress = await dex.getAddress();

        console.log(`✅ SimpleDEX 地址: ${dexAddress}`);

        deploymentResult.simpleDex = {
            address: dexAddress,
            name: "SimpleDEX",
            tokenA: tokenA.address,
            tokenB: tokenB.address
        };

        // 设置 DEX 初始状态
        console.log("\n设置 DEX 初始状态...");

        // 检查部署者余额
        console.log("检查部署者代币余额...");
        const tokenABalance = await tokenA.contract.balanceOf(deployer.address);
        const tokenBBalance = await tokenB.contract.balanceOf(deployer.address);

        console.log(`${tokenA.symbol} 余额: ${ethers.formatUnits(tokenABalance, tokenA.decimals)}`);
        console.log(`${tokenB.symbol} 余额: ${ethers.formatUnits(tokenBBalance, tokenB.decimals)}`);

        // 授权代币给 DEX
        console.log("\n授权代币给 DEX...");
        const approveAmountA = ethers.parseEther("1000");
        const approveAmountB = ethers.parseUnits("1000", 6);

        if (tokenABalance >= ethers.parseEther("100")) {
            await tokenA.contract.approve(dexAddress, approveAmountA);
            console.log(`✅ ${tokenA.symbol} 授权完成`);
        } else {
            console.warn(`⚠️ ${tokenA.symbol} 余额不足，无法授权`);
        }

        if (tokenBBalance >= ethers.parseUnits("50", 6)) {
            await tokenB.contract.approve(dexAddress, approveAmountB);
            console.log(`✅ ${tokenB.symbol} 授权完成`);
        } else {
            console.warn(`⚠️ ${tokenB.symbol} 余额不足，无法授权`);
        }

        // 添加初始流动性
        console.log("\n添加初始流动性...");
        let amountA = ethers.parseEther("100");
        let amountB = ethers.parseUnits("50", 6);

        // 检查余额是否足够添加流动性
        if (tokenABalance >= amountA && tokenBBalance >= amountB) {
            console.log(`添加 ${ethers.formatEther(amountA)} ${tokenA.symbol} 和 ${ethers.formatUnits(amountB, 6)} ${tokenB.symbol}`);

            const addLiquidityTx = await dex.addLiquidity(amountA, amountB);
            await addLiquidityTx.wait();
            console.log("✅ 流动性添加成功");
        } else {
            console.warn("⚠️  余额不足，跳过添加流动性");
            console.log(`需要 ${ethers.formatEther(amountA)} ${tokenA.symbol}，当前: ${ethers.formatUnits(tokenABalance, tokenA.decimals)}`);
            console.log(`需要 ${ethers.formatUnits(amountB, 6)} ${tokenB.symbol}，当前: ${ethers.formatUnits(tokenBBalance, tokenB.decimals)}`);

            // 添加小量流动性用于测试
            const smallAmountA = ethers.parseEther("10");
            const smallAmountB = ethers.parseUnits("5", 6);

            if (tokenABalance >= smallAmountA && tokenBBalance >= smallAmountB) {
                console.log(`尝试添加少量流动性: ${ethers.formatEther(smallAmountA)} ${tokenA.symbol} 和 ${ethers.formatUnits(smallAmountB, 6)} ${tokenB.symbol}`);

                // 授权小量代币
                await tokenA.contract.approve(dexAddress, smallAmountA);
                await tokenB.contract.approve(dexAddress, smallAmountB);

                const smallLiquidityTx = await dex.addLiquidity(smallAmountA, smallAmountB);
                await smallLiquidityTx.wait();
                console.log("✅ 少量流动性添加成功");

                amountA = smallAmountA;
                amountB = smallAmountB;
            }
        }

        // 检查 DEX 状态
        console.log("\n检查 DEX 状态...");
        try {
            const [reserveA, reserveB] = await dex.getReserves();
            const price = await dex.getPrice();

            deploymentResult.simpleDex.reserves = {
                tokenA: ethers.formatEther(reserveA),
                tokenB: ethers.formatUnits(reserveB, 6)
            };
            deploymentResult.simpleDex.price = ethers.formatUnits(price, 6);

            console.log(`📊 DEX 状态:`);
            console.log(`   ${tokenA.symbol} 储备: ${ethers.formatEther(reserveA)}`);
            console.log(`   ${tokenB.symbol} 储备: ${ethers.formatUnits(reserveB, 6)}`);
            console.log(`   当前价格: 1 ${tokenA.symbol} = ${ethers.formatUnits(price, 6)} ${tokenB.symbol}`);
        } catch (error) {
            console.warn(`⚠️  无法获取 DEX 状态: ${error.message}`);
            deploymentResult.simpleDex.reserves = { tokenA: "0", tokenB: "0" };
            deploymentResult.simpleDex.price = "0";
        }

        console.log("\n✅ DEX 系统部署完成！");
        return deploymentResult;

    } catch (error) {
        console.error("❌ DEX 系统部署失败:", error.message);
        console.log("将返回部分部署结果...");
        return deploymentResult; // 返回部分结果，而不是抛出错误
    }
}

// 添加独立的 main 函数用于单独运行
async function main() {
    console.log("🚀 开始单独部署 DEX 系统...");

    const [deployer] = await ethers.getSigners();
    console.log(`部署账户: ${deployer.address}`);

    // 可以选择使用现有代币或部署新代币
    const useExistingTokens = false; // 设置为 false 部署独立代币

    let dexTokens = {};
    if (useExistingTokens) {
        // 加载已有代币配置
        const ConfigManager = require("../utils/config-manager");
        const configManager = new ConfigManager();
        const tokens = configManager.loadConfig('tokens');

        if (!tokens || Object.keys(tokens).length === 0) {
            console.log("❌ 没有找到代币配置，将部署独立的 DEX 代币");
        } else {
            console.log("使用现有代币 USDC 和 DAI 作为 DEX 交易对...");
            dexTokens = {
                TKNA: tokens.USDC,
                TKNB: tokens.DAI
            };
        }
    } else {
        console.log("部署独立的 DEX 测试代币...");
    }

    const dexResult = await deployDexSystem(deployer, dexTokens);

    // 保存配置
    const configManager = new ConfigManager();
    configManager.saveConfig('dex', dexResult);

    console.log("\n🎉 DEX 系统部署完成！");
    if (dexResult.simpleDex) {
        console.log(`SimpleDEX 地址: ${dexResult.simpleDex.address}`);
        console.log(`交易对: ${dexResult.tokens.TKNA.symbol}/${dexResult.tokens.TKNB.symbol}`);
        console.log(`价格: 1 ${dexResult.tokens.TKNA.symbol} = ${dexResult.simpleDex.price || "未知"} ${dexResult.tokens.TKNB.symbol}`);
    }

    return dexResult;
}

// 如果直接运行此脚本
if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = deployDexSystem;