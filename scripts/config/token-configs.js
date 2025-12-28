// 代币配置
// scripts/config/token-configs.js
const tokenConfigs = {
    stakeTokens: [
        {
            name: "MetaNode Token",
            symbol: "MNT",
            initialAmount: "1000000", // 1,000,000 个，18位小数 = 1,000,000 * 10^18
            decimals: 18,
            color: "neon",
            isRewardToken: true
        },
        {
            name: "Test USDC",
            symbol: "USDC",
            initialAmount: "1000000", // 应该是 1,000,000 个，6位小数 = 1,000,000 * 10^6
            decimals: 6,
            color: "blue"
        },
        {
            name: "Test DAI",
            symbol: "DAI",
            initialAmount: "200000", // 200,000 个，18位小数
            decimals: 18,
            color: "green"
        },
        {
            name: "Test LINK",
            symbol: "LINK",
            initialAmount: "100000", // 100,000 个，18位小数
            decimals: 18,
            color: "purple"
        }
    ],

    dexTokens: [
        {
            name: "Token A",
            symbol: "TKNA",
            initialAmount: "1000000", // 1,000,000 个，18位小数
            decimals: 18,
            forDex: true
        },
        {
            name: "Token B",
            symbol: "TKNB",
            initialAmount: "1000000", // 1,000,000 个，6位小数
            decimals: 6,
            forDex: true
        }
    ]
};

module.exports = tokenConfigs;