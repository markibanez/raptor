const hre = require('hardhat');
const { upgrades } = hre;

async function main() {
    const Lock = await hre.ethers.getContractFactory('Lock');
    const lock = await upgrades.deployProxy(Lock, []);
    await lock.deployed();

    console.log(`Lock contract deployed to ${lock.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
