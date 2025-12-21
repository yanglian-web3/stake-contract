const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 验证代币余额...\n");

    // Hardhat 测试账户
    const testAccounts = [
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Account 0
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Account 1
        "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Account 2
    ];

    // 你的代币地址
    const tokens = {
        MNT: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
        USDC: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
        DAI: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
        LINK: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
    };

    // ERC20 ABI（只需要 balanceOf）
    const erc20Abi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
        "function name() view returns (string)"
    ];

    for (const [tokenName, tokenAddress] of Object.entries(tokens)) {
        console.log(`\n📊 ${tokenName} (${tokenAddress}):`);

        try {
            const token = await ethers.getContractAt(erc20Abi, tokenAddress);

            // 获取代币信息
            const symbol = await token.symbol();
            const decimals = await token.decimals();

            console.log(`   符号: ${symbol}, 小数位: ${decimals}`);

            // 检查每个账户的余额
            for (let i = 0; i < testAccounts.length; i++) {
                const balance = await token.balanceOf(testAccounts[i]);
                const formatted = ethers.formatUnits(balance, decimals);
                console.log(`   账户${i}: ${formatted} ${symbol}`);
            }

        } catch (error) {
            console.log(`   ❌ 查询失败: ${error.message}`);
        }
    }

    // 检查 ETH 余额
    console.log("\n💰 ETH 余额:");
    for (let i = 0; i < testAccounts.length; i++) {
        const ethBalance = await ethers.provider.getBalance(testAccounts[i]);
        console.log(`   账户${i}: ${ethers.formatEther(ethBalance)} ETH`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });