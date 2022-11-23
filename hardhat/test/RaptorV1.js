const { time, loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const { parseUnits, parseEther } = ethers.utils;

describe('Accounts', function () {
    async function initializeFixture() {
        const [deployer, public1, admin1, user1, user2] = await ethers.getSigners();
        const RaptorV1 = await ethers.getContractFactory('RaptorV1');
        const raptorV1 = await upgrades.deployProxy(RaptorV1, []);

        return { deployer, public1, admin1, user1, user2, raptorV1 };
    }

    it('createAccountPrice should be equal to 5 ether', async function () {
        const { raptorV1 } = await loadFixture(initializeFixture);
        expect(await raptorV1.createAccountPrice()).to.equal(parseEther('5'));
    });

    it('public1 and admin1 should not be able to setCreateAccountPrice', async function () {
        const { raptorV1, public1, admin1 } = await loadFixture(initializeFixture);

        await expect(raptorV1.connect(public1).setCreateAccountPrice(parseEther('10'))).to.be.revertedWithCustomError(
            raptorV1,
            'NotAdmin'
        );

        await expect(raptorV1.connect(admin1).setCreateAccountPrice(parseEther('10'))).to.be.revertedWithCustomError(
            raptorV1,
            'NotAdmin'
        );
    });

    it('Grant admin1 admin role and should now be able to set create account price', async function () {
        const { raptorV1, admin1, deployer } = await loadFixture(initializeFixture);
        await raptorV1.connect(deployer).grantRole(await raptorV1.DEFAULT_ADMIN_ROLE(), admin1.address);
        await raptorV1.connect(admin1).setCreateAccountPrice(parseEther('10'));
        expect(await raptorV1.createAccountPrice()).to.equal(parseEther('10'));
    });

    it('user1 attempts to create an account with 4.5 ether and should fail', async function () {
        const { raptorV1, user1 } = await loadFixture(initializeFixture);
        await expect(raptorV1.connect(user1).createAccount({ value: parseEther('4.5') })).to.be.revertedWithCustomError(
            raptorV1,
            'DidNotPayEnough'
        );
    });

    it('user1 and user2 creates, updates and deletes their accounts', async function () {
        const { raptorV1, user1, user2 } = await loadFixture(initializeFixture);

        // call createAccount
        await expect(raptorV1.connect(user1).createAccount('test-metadata-cid-1', { value: parseEther('5') }))
            .to.emit(raptorV1, 'AccountCreated')
            .withArgs(user1.address, 'test-metadata-cid-1');
        await expect(raptorV1.connect(user2).createAccount('test-metadata-cid-2', { value: parseEther('5') }))
            .to.emit(raptorV1, 'AccountCreated')
            .withArgs(user2.address, 'test-metadata-cid-2');

        // check account exists by getting cid string from accounts mapping
        expect(await raptorV1.accounts(user1.address)).to.equal('test-metadata-cid-1');
        expect(await raptorV1.accounts(user2.address)).to.equal('test-metadata-cid-2');

        // call updateAccount
        await expect(raptorV1.connect(user1).updateAccount('test-metadata-cid-1-updated'))
            .to.emit(raptorV1, 'AccountUpdated')
            .withArgs(user1.address, 'test-metadata-cid-1-updated');
        await expect(raptorV1.connect(user2).updateAccount('test-metadata-cid-2-updated'))
            .to.emit(raptorV1, 'AccountUpdated')
            .withArgs(user2.address, 'test-metadata-cid-2-updated');

        // check account exists by getting cid string from accounts mapping
        expect(await raptorV1.accounts(user1.address)).to.equal('test-metadata-cid-1-updated');
        expect(await raptorV1.accounts(user2.address)).to.equal('test-metadata-cid-2-updated');

        // call deleteAccount
        await expect(raptorV1.connect(user1).deleteAccount())
            .to.emit(raptorV1, 'AccountDeleted')
            .withArgs(user1.address);
        await expect(raptorV1.connect(user2).deleteAccount())
            .to.emit(raptorV1, 'AccountDeleted')
            .withArgs(user2.address);

        // check account does not exist by getting cid string from accounts mapping
        expect(await raptorV1.accounts(user1.address)).to.equal('');
        expect(await raptorV1.accounts(user2.address)).to.equal('');
    });


});
