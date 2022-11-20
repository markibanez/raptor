const hre = require('hardhat');
const { ethers, upgrades } = hre;

async function main() {
    const LockV2 = await ethers.getContractFactory('LockV2');
    const lockV2 = await upgrades.upgradeProxy('0x39610D5562a3350A61d6739981dd88634c92a15a', LockV2);
    console.log('Lock contract upgraded');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
