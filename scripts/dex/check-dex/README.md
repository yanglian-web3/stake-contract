
运行测试dex脚本

````textmate

# 1. 先运行调试脚本
npx hardhat run scripts/check-dex/debug-dex.js --network localhost

# 2. 然后运行修复后的检查脚本
npx hardhat run scripts/check-dex/check-dex.js --network localhost

# 3. 如果还有问题，运行这个最小测试
npx hardhat run scripts/check-dex/minimal-dex-test.js --network localhost
````