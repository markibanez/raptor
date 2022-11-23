const { time, loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const { parseUnits, parseEther } = ethers.utils;

describe('Accounts', function () {
    async function initializeFixture() {
        const [deployer, public1, admin1] = await ethers.getSigners();
        const RaptorV1 = await ethers.getContractFactory('RaptorV1');
        const raptorV1 = await upgrades.deployProxy(RaptorV1, []);

        return { deployer, public1, admin1, raptorV1 };
    }

    it('createAccountPrice should be equal to 5 ether', async function () {
        const { raptorV1 } = await loadFixture(initializeFixture);
        expect(await raptorV1.createAccountPrice()).to.equal(parseEther('5'));
    });

    it('public1 should not be able to setCreateAccountPrice', async function () {
        const { raptorV1, public1 } = await loadFixture(initializeFixture);
        await expect(raptorV1.connect(public1).setCreateAccountPrice(parseEther('10'))).to.be.revertedWithCustomError(
            raptorV1,
            'NotAdmin'
        );
    });

    it('createAccountPrice should still be 5 ether', async function () {
        const { raptorV1 } = await loadFixture(initializeFixture);
        expect(await raptorV1.createAccountPrice()).to.equal(parseEther('5'));
    });

    // it('admin1 should not yet be able to setCreateAccountPrice', async function () {
    //     const { raptorV1, admin1 } = await loadFixture(initializeFixture);
    //     await expect(raptorV1.connect(admin1).setCreateAccountPrice(parseEther('10'))).to.be.revertedWithCustomError(
    //         raptorV1,
    //         'NotAdmin'
    //     );
    // });

    // it('Grant admin1 admin role', async function () {
    //     const { raptorV1, admin1, deployer } = await loadFixture(initializeFixture);
    //     await raptorV1.connect(deployer).grantRole(await raptorV1.DEFAULT_ADMIN_ROLE(), admin1.address);
    // });

    // it('admin1 should have DEFAULT_ADMIN_ROLE', async function () {
    //     const { raptorV1, admin1 } = await loadFixture(initializeFixture);
    //     expect(await raptorV1.hasRole(await raptorV1.DEFAULT_ADMIN_ROLE(), admin1.address)).to.equal(true);
    // });

    // it('admin1 should be able to setCreateAccountPrice', async function () {
    //     const { raptorV1, admin1 } = await loadFixture(initializeFixture);
    //     await raptorV1.connect(admin1).setCreateAccountPrice(parseEther('10'));
    // });

    it('Deployer sets createAccountPrice to 10 ether', async function () {
        const { raptorV1, deployer } = await loadFixture(initializeFixture);
        await raptorV1.connect(deployer).setCreateAccountPrice(parseEther('10'));
        expect(await raptorV1.createAccountPrice()).to.equal(parseEther('10'));
    });

    // it('createAccountPrice should be equal to 10 ether', async function () {
    //     const { raptorV1 } = await loadFixture(initializeFixture);
    //     expect(await raptorV1.createAccountPrice()).to.equal(parseEther('10'));
    // });
});
