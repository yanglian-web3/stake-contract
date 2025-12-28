// 账户管理
const { ethers } = require("hardhat");

class AccountManager {
    constructor() {
        this.testAccounts = [
            '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
            '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
            '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
            '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
            '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc'
        ];
    }

    // 分发 ETH 给测试账户
    async distributeETH(deployer, accounts, amountETH = "10") {
        console.log(`\n💰 分发 ETH 给测试账户...`);
        const amountWei = ethers.parseEther(amountETH);
        const results = [];

        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            if (account.toLowerCase() === deployer.address.toLowerCase()) {
                continue;
            }

            const balanceBefore = await ethers.provider.getBalance(account);
            console.log(`\n处理账户 ${i + 1}/${accounts.length}: ${account}`);
            console.log(`   当前余额: ${ethers.formatEther(balanceBefore)} ETH`);

            if (balanceBefore >= amountWei) {
                console.log(`   ✅ 已有足够 ETH，跳过`);
                results.push({ account, success: true, skipped: true });
                continue;
            }

            try {
                const tx = await deployer.sendTransaction({
                    to: account,
                    value: amountWei
                });
                await tx.wait();
                const balanceAfter = await ethers.provider.getBalance(account);
                console.log(`   ✅ 发送 ${ethers.formatEther(amountWei)} ETH 成功`);
                console.log(`   更新后余额: ${ethers.formatEther(balanceAfter)} ETH`);
                results.push({ account, success: true, txHash: tx.hash });
            } catch (error) {
                console.error(`   ❌ 发送 ETH 失败:`, error.message);
                results.push({ account, success: false, error: error.message });
            }
        }

        return results;
    }

    // 为测试账户分配代币
    async distributeTokens(deployer, tokenContract, accounts, amountPerAccount, decimals = 18) {
        console.log(`\n分发代币给测试账户...`);
        const amountWei = ethers.parseUnits(amountPerAccount, decimals);
        const results = [];

        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];

            try {
                const tx = await tokenContract.transfer(account, amountWei);
                await tx.wait();
                console.log(`   ✅ 转账 ${amountPerAccount} 到 ${account.slice(0, 8)}...`);
                results.push({ account, success: true, txHash: tx.hash });
            } catch (error) {
                console.log(`   ❌ 转账失败: ${error.message}`);
                results.push({ account, success: false, error: error.message });
            }
        }

        return results;
    }

    getTestAccounts() {
        return this.testAccounts;
    }
}

module.exports = AccountManager;