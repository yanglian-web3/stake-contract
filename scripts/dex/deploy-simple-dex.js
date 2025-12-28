// scripts/dex/deploy-simple-dex.js
const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🚀 部署最简单的 DEX\n");

    const [deployer] = await ethers.getSigners();
    console.log(`部署者地址: ${deployer.address}`);

    // 1. 编译合约（确保合约存在）
    console.log("\n1. 编译合约...");
    try {
        await hre.run("compile");
        console.log("   ✅ 编译完成");
    } catch (compileError) {
        console.log(`   ⚠️  编译警告: ${compileError.message}`);
    }

    // 2. 部署两个测试代币
    console.log("\n2. 部署测试代币...");

    const SimpleToken = await ethers.getContractFactory("SimpleToken");

    // 代币 A (TKNA)
    const tokenA = await SimpleToken.deploy(
        "Token A",
        "TKNA",
        18,
        1000000,
        deployer.address
    );
    await tokenA.waitForDeployment();
    const tokenAAddress = await tokenA.getAddress();
    console.log(`   ✅ Token A: ${tokenAAddress}`);

    const tokenASymbol = await tokenA.symbol();
    const tokenAName = await tokenA.name();
    const tokenADecimals = await tokenA.decimals();

    // 代币 B (TKNB)
    const tokenB = await SimpleToken.deploy(
        "Token B",
        "TKNB",
        6,
        1000000,
        deployer.address
    );
    await tokenB.waitForDeployment();
    const tokenBAddress = await tokenB.getAddress();
    console.log(`   ✅ Token B: ${tokenBAddress}`);

    const tokenBSymbol = await tokenB.symbol();
    const tokenBName = await tokenB.name();
    const tokenBDecimals = await tokenB.decimals();

    // 3. 部署 DEX 合约
    console.log("\n3. 部署 DEX 合约...");

    const SimpleDEX = await ethers.getContractFactory("SimpleDEX");
    const dex = await SimpleDEX.deploy(tokenAAddress, tokenBAddress);
    await dex.waitForDeployment();
    const dexAddress = await dex.getAddress();

    console.log(`   ✅ SimpleDEX 地址: ${dexAddress}`);

    // 4. 设置 DEX 初始状态
    console.log("\n4. 设置 DEX 初始状态...");

    console.log("   授权代币给 DEX...");
    await tokenA.approve(dexAddress, ethers.parseEther("1000"));
    await tokenB.approve(dexAddress, ethers.parseUnits("1000", 6));
    console.log("   ✅ 授权完成");

    console.log("   添加初始流动性...");
    const amountA = ethers.parseEther("100");
    const amountB = ethers.parseUnits("50", 6);

    const addLiquidityTx = await dex.addLiquidity(amountA, amountB);
    await addLiquidityTx.wait();
    console.log(`   ✅ 添加 ${ethers.formatEther(amountA)} ${tokenASymbol} 和 ${ethers.formatUnits(amountB, 6)} ${tokenBSymbol}`);

    // 5. 检查 DEX 状态
    console.log("\n5. 检查 DEX 状态...");

    const [reserveA, reserveB] = await dex.getReserves();
    const price = await dex.getPrice();

    const reserveAStr = ethers.formatEther(reserveA);
    const reserveBStr = ethers.formatUnits(reserveB, 6);
    const priceNum = Number(ethers.formatUnits(price, 6));

    console.log(`\n   📊 DEX 初始状态:`);
    console.log(`      ${tokenASymbol} 储备: ${reserveAStr}`);
    console.log(`      ${tokenBSymbol} 储备: ${reserveBStr}`);
    console.log(`      当前价格: 1 ${tokenASymbol} = ${priceNum.toFixed(6)} ${tokenBSymbol}`);

    // 测试价格计算
    console.log("\n   💱 测试价格计算:");
    const testAmount = ethers.parseEther("1");
    const amountOut = await dex.getAmountOut(testAmount, tokenAAddress);
    console.log(`      1 ${tokenASymbol} ≈ ${ethers.formatUnits(amountOut, 6)} ${tokenBSymbol}`);

    const testAmountB = ethers.parseUnits("1", 6);
    const amountOutB = await dex.getAmountOut(testAmountB, tokenBAddress);
    console.log(`      1 ${tokenBSymbol} ≈ ${ethers.formatEther(amountOutB)} ${tokenASymbol}`);

    // 6. 保存配置（确保 BigInt 被转换为字符串）
    console.log("\n6. 保存配置...");
    const config = {
        network: "localhost",
        chainId: 31337,
        simpleDex: dexAddress,
        tokens: [
            {
                address: tokenAAddress,
                symbol: tokenASymbol,
                name: tokenAName,
                decimals: Number(tokenADecimals).toString()  // 转换为字符串
            },
            {
                address: tokenBAddress,
                symbol: tokenBSymbol,
                name: tokenBName,
                decimals: Number(tokenBDecimals).toString()  // 转换为字符串
            }
        ],
        initialLiquidity: {
            tokenA: ethers.formatEther(amountA),
            tokenB: ethers.formatUnits(amountB, 6)
        },
        currentReserves: {
            tokenA: reserveAStr,
            tokenB: reserveBStr
        },
        currentPrice: priceNum.toString(),
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        note: "简单的 DEX 部署"
    };

    // 使用自定义的 JSON 序列化来处理 BigInt
    const jsonString = JSON.stringify(config, (key, value) => {
        if (typeof value === 'bigint') {
            return value.toString();
        }
        return value;
    }, 2);

    fs.writeFileSync('simple-dex-config.json', jsonString);
    console.log("   ✅ 配置已保存到: simple-dex-config.json");

    // 7. 生成 ABI 文件
    console.log("\n7. 生成 ABI 文件...");

    const simpleDexABI = [
        "function tokenA() view returns (address)",
        "function tokenB() view returns (address)",
        "function reserveA() view returns (uint256)",
        "function reserveB() view returns (uint256)",
        "function addLiquidity(uint256 amountA, uint256 amountB) external",
        "function removeLiquidity(uint256 amountA, uint256 amountB) external",
        "function swap(uint256 amountIn, address fromToken, uint256 minAmountOut) external returns (uint256)",
        "function getAmountOut(uint256 amountIn, address fromToken) view returns (uint256)",
        "function getPrice() view returns (uint256)",
        "function getReserves() view returns (uint256, uint256)",
        "event Swap(address indexed sender, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)",
        "event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB)",
        "event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB)"
    ];

    const simpleTokenABI = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address account) view returns (uint256)",
        "function transfer(address recipient, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function transferFrom(address sender, address recipient, uint256 amount) returns (bool)",
        "event Transfer(address indexed from, address indexed to, uint256 value)",
        "event Approval(address indexed owner, address indexed spender, uint256 value)"
    ];

    fs.writeFileSync('simple-dex-abi.json', JSON.stringify(simpleDexABI, null, 2));
    fs.writeFileSync('simple-token-abi.json', JSON.stringify(simpleTokenABI, null, 2));
    console.log("   ✅ ABI 文件已生成");

    // 8. 创建前端配置文件
    console.log("\n8. 创建前端配置文件...");

    const frontendConfig = {
        chainId: 31337,
        networkName: "localhost",
        rpcUrl: "http://localhost:8545",
        simpleDex: {
            address: dexAddress,
            name: "SimpleDEX",
            abi: simpleDexABI
        },
        tokens: [
            {
                address: tokenAAddress,
                symbol: tokenASymbol,
                name: tokenAName,
                decimals: Number(tokenADecimals).toString(),
                abi: simpleTokenABI
            },
            {
                address: tokenBAddress,
                symbol: tokenBSymbol,
                name: tokenBName,
                decimals: Number(tokenBDecimals).toString(),
                abi: simpleTokenABI
            }
        ],
        defaultFromToken: tokenAAddress,
        defaultToToken: tokenBAddress,
        initialLiquidity: {
            [tokenASymbol]: ethers.formatEther(amountA),
            [tokenBSymbol]: ethers.formatUnits(amountB, 6)
        }
    };

    const frontendJsonString = JSON.stringify(frontendConfig, (key, value) => {
        if (typeof value === 'bigint') {
            return value.toString();
        }
        return value;
    }, 2);

    fs.writeFileSync('frontend-dex-config.json', frontendJsonString);
    console.log("   ✅ 前端配置文件已生成: frontend-dex-config.json");

    // 9. 显示部署摘要
    console.log("\n🎉 DEX 部署完成！");
    console.log("\n📋 部署摘要:");
    console.log(`   DEX 合约: ${dexAddress}`);
    console.log(`   ${tokenASymbol}: ${tokenAAddress}`);
    console.log(`   ${tokenBSymbol}: ${tokenBAddress}`);
    console.log(`   流动性: ${reserveAStr} ${tokenASymbol} + ${reserveBStr} ${tokenBSymbol}`);
    console.log(`   初始价格: 1 ${tokenASymbol} = ${priceNum.toFixed(6)} ${tokenBSymbol}`);
    console.log(`   测试价格: 1 ${tokenASymbol} ≈ ${ethers.formatUnits(amountOut, 6)} ${tokenBSymbol} (含0.3%手续费)`);

    console.log("\n🚀 现在可以测试:");
    console.log(`   npx hardhat run scripts/dex/test-simple-dex.js --network localhost`);

    console.log("\n📁 生成的文件:");
    console.log(`   • simple-dex-config.json - 完整的部署配置`);
    console.log(`   • simple-dex-abi.json - DEX 合约 ABI`);
    console.log(`   • simple-token-abi.json - 代币合约 ABI`);
    console.log(`   • frontend-dex-config.json - 前端配置`);
}

main().catch(console.error);