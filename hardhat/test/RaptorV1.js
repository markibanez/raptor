const { time, loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const { parseUnits, parseEther } = ethers.utils;

describe('RaptorV1', function () {
    describe('Accounts', function () {
        async function initializeFixture() {
            const signers = await ethers.getSigners();
            const [deployer, public1, admin1, user1, user2] = signers;

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

            await expect(
                raptorV1.connect(public1).setCreateAccountPrice(parseEther('10'))
            ).to.be.revertedWithCustomError(raptorV1, 'NotAdmin');

            await expect(
                raptorV1.connect(admin1).setCreateAccountPrice(parseEther('10'))
            ).to.be.revertedWithCustomError(raptorV1, 'NotAdmin');
        });

        it('Grant admin1 admin role and should now be able to set create account price', async function () {
            const { raptorV1, admin1, deployer } = await loadFixture(initializeFixture);
            await raptorV1.connect(deployer).grantRole(await raptorV1.DEFAULT_ADMIN_ROLE(), admin1.address);
            await raptorV1.connect(admin1).setCreateAccountPrice(parseEther('10'));
            expect(await raptorV1.createAccountPrice()).to.equal(parseEther('10'));
        });

        it('user1 attempts to create an account with 4.5 ether and should fail', async function () {
            const { raptorV1, user1 } = await loadFixture(initializeFixture);
            await expect(
                raptorV1.connect(user1).createAccount({ value: parseEther('4.5') })
            ).to.be.revertedWithCustomError(raptorV1, 'DidNotPayEnough');
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

    describe('Follow/Unfollow', function () {
        async function initializeFixture() {
            const signers = await ethers.getSigners();
            const [deployer, public1, admin1, user1, user2] = signers;

            const user1Followers = [signers[5], signers[6], signers[7]];
            const user2Followers = [signers[8], signers[9], signers[10]];

            const RaptorV1 = await ethers.getContractFactory('RaptorV1');
            const raptorV1 = await upgrades.deployProxy(RaptorV1, []);

            // create accounts for user1 and user2
            await raptorV1.connect(user1).createAccount('test-metadata-cid-1', { value: parseEther('5') });
            await raptorV1.connect(user2).createAccount('test-metadata-cid-2', { value: parseEther('5') });

            return { deployer, public1, admin1, user1, user2, user1Followers, user2Followers, raptorV1 };
        }

        it('Followers follow and unfollow user1 and user2', async function () {
            const { raptorV1, user1, user2, user1Followers, user2Followers } = await loadFixture(initializeFixture);

            // user1 followers follow user1
            for (const follower of user1Followers) {
                await expect(raptorV1.connect(follower).follow(user1.address))
                    .to.emit(raptorV1, 'AccountFollowed')
                    .withArgs(follower.address, user1.address);
            }

            // user2 followers follow user2
            for (const follower of user2Followers) {
                await expect(raptorV1.connect(follower).follow(user2.address))
                    .to.emit(raptorV1, 'AccountFollowed')
                    .withArgs(follower.address, user2.address);
            }

            // check user1 followers
            expect(await raptorV1.connect(user1).getFollowers()).to.have.members(user1Followers.map((f) => f.address));

            // check user1 followers count
            expect(await raptorV1.connect(user1).getFollowersCount()).to.equal(user1Followers.length);

            // check user1 followers at each index
            for (let i = 0; i < user1Followers.length; i++) {
                expect(await raptorV1.connect(user1).getFollowerAt(i)).to.equal(user1Followers[i].address);
                expect(await raptorV1.connect(follower).getFollow(i)).to.equal(user1Followers[i].address);
            }

            // check user2 followers
            expect(await raptorV1.connect(user2).getFollowers()).to.have.members(user2Followers.map((f) => f.address));

            // check user2 followers count
            expect(await raptorV1.connect(user2).getFollowersCount()).to.equal(user2Followers.length);

            // check user2 followers at each index
            for (let i = 0; i < user2Followers.length; i++) {
                expect(await raptorV1.connect(user2).getFollowerAt(i)).to.equal(user2Followers[i].address);
                expect(await raptorV1.connect(follower).getFollow(i)).to.equal(user2Followers[i].address);
            }

            // check user1 followers if they follow user1
            for (const follower of user1Followers) {
                expect(await raptorV1.connect(follower).getFollows()).to.have.members([user1.address]);
                expect(await raptorV1.connect(follower).getFollowsCount()).to.equal(1);
            }

            // check user2 followers if they follow user2
            for (const follower of user2Followers) {
                expect(await raptorV1.connect(follower).getFollows()).to.have.members([user2.address]);
                expect(await raptorV1.connect(follower).getFollowsCount()).to.equal(1);
            }

            // user1's first and second followers unfollow user1
            await expect(raptorV1.connect(user1Followers[0]).unfollow(user1.address))
                .to.emit(raptorV1, 'AccountUnfollowed')
                .withArgs(user1Followers[0].address, user1.address);

            await expect(raptorV1.connect(user1Followers[1]).unfollow(user1.address))
                .to.emit(raptorV1, 'AccountUnfollowed')
                .withArgs(user1Followers[1].address, user1.address);

            // check user1 followers
            expect(await raptorV1.connect(user1).getFollowers()).to.have.members(
                [user1Followers[2]].map((f) => f.address)
            );

            // check user1 followers count
            expect(await raptorV1.connect(user1).getFollowersCount()).to.equal(1);

            // user1's first and second follower should no longer follow user1
            expect(await raptorV1.connect(user1Followers[0]).getFollows()).not.to.have.members([user1.address]);
            expect(await raptorV1.connect(user1Followers[0]).getFollowsCount()).to.equal(0);
            expect(await raptorV1.connect(user1Followers[1]).getFollows()).not.to.have.members([user1.address]);
            expect(await raptorV1.connect(user1Followers[1]).getFollowsCount()).to.equal(0);

            // user1's third follower should still follow user1
            expect(await raptorV1.connect(user1Followers[2]).getFollows()).to.have.members([user1.address]);
            expect(await raptorV1.connect(user1Followers[2]).getFollowsCount()).to.equal(1);

            // user2's third follower unfollow user2
            await expect(raptorV1.connect(user2Followers[2]).unfollow(user2.address))
                .to.emit(raptorV1, 'AccountUnfollowed')
                .withArgs(user2Followers[2].address, user2.address);

            // check user2 followers
            expect(await raptorV1.connect(user2).getFollowers()).to.have.members(
                [user2Followers[0], user2Followers[1]].map((f) => f.address)
            );

            // check user2 followers count
            expect(await raptorV1.connect(user2).getFollowersCount()).to.equal(2);

            // user2's third follower should no longer follow user2
            expect(await raptorV1.connect(user2Followers[2]).getFollows()).not.to.have.members([user2.address]);

            // user2's first and second follower should still follow user2
            expect(await raptorV1.connect(user2Followers[0]).getFollows()).to.have.members([user2.address]);
            expect(await raptorV1.connect(user2Followers[1]).getFollows()).to.have.members([user2.address]);
        });
    });
});
