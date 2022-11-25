const { time, loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const { parseUnits, parseEther } = ethers.utils;

describe('RaptorV1', function () {
    describe('Accounts', function () {
        async function initializeFixture() {
            const signers = await ethers.getSigners();
            const [deployer, public1, admin1, user1, user2, user3] = signers;

            const RaptorV1 = await ethers.getContractFactory('RaptorV1');
            const raptorV1 = await upgrades.deployProxy(RaptorV1, []);

            return { deployer, public1, admin1, user1, user2, user3, raptorV1 };
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
                raptorV1.connect(user1).createAccount('metadata-cid-1', 'user1', { value: parseEther('4.5') })
            ).to.be.revertedWithCustomError(raptorV1, 'DidNotPayEnough');
        });

        it('user1 and user2 creates, updates and deletes their accounts', async function () {
            const { raptorV1, user1, user2, user3 } = await loadFixture(initializeFixture);

            // call createAccount
            await expect(
                raptorV1.connect(user1).createAccount('test-metadata-cid-1', 'user1', { value: parseEther('5') })
            )
                .to.emit(raptorV1, 'AccountCreated')
                .withArgs(user1.address, 'test-metadata-cid-1', 'user1');
            await expect(
                raptorV1.connect(user2).createAccount('test-metadata-cid-2', 'user2', { value: parseEther('5') })
            )
                .to.emit(raptorV1, 'AccountCreated')
                .withArgs(user2.address, 'test-metadata-cid-2', 'user2');

            // user3 creates an account with user1's handle and should fail
            await expect(
                raptorV1.connect(user3).createAccount('test-metadata-cid-3', 'user1', { value: parseEther('5') })
            ).to.be.revertedWithCustomError(raptorV1, 'HandleAlreadyTaken');

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

            // call updateAccountHandle with existing handles
            await expect(raptorV1.connect(user1).updateAccountHandle('user2')).to.be.revertedWithCustomError(
                raptorV1,
                'HandleAlreadyTaken'
            );
            await expect(raptorV1.connect(user2).updateAccountHandle('user1')).to.be.revertedWithCustomError(
                raptorV1,
                'HandleAlreadyTaken'
            );

            // call updateAccountHandle with new handles
            await expect(raptorV1.connect(user1).updateAccountHandle('user1-updated'))
                .to.emit(raptorV1, 'AccountHandleUpdated')
                .withArgs(user1.address, 'user1-updated');
            await expect(raptorV1.connect(user2).updateAccountHandle('user2-updated'))
                .to.emit(raptorV1, 'AccountHandleUpdated')
                .withArgs(user2.address, 'user2-updated');

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
            await raptorV1.connect(user1).createAccount('test-metadata-cid-1', 'user1', { value: parseEther('5') });
            await raptorV1.connect(user2).createAccount('test-metadata-cid-2', 'user2', { value: parseEther('5') });

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

            // check user2 followers
            expect(await raptorV1.connect(user2).getFollowers()).to.have.members(user2Followers.map((f) => f.address));

            // check user2 followers count
            expect(await raptorV1.connect(user2).getFollowersCount()).to.equal(user2Followers.length);

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

    describe('Post transactions', function () {
        async function initializeFixture() {
            const signers = await ethers.getSigners();
            const [deployer, public1, admin1, user1, user2, user3] = signers;

            const RaptorV1 = await ethers.getContractFactory('RaptorV1');
            const raptorV1 = await upgrades.deployProxy(RaptorV1, []);

            return { deployer, public1, admin1, user1, user2, user3, raptorV1 };
        }

        it('postTransaction default price is 0.01 ether', async function () {
            const { raptorV1 } = await loadFixture(initializeFixture);

            expect(await raptorV1.postTransactionPrice()).to.equal(ethers.utils.parseEther('0.01'));
        });

        it('public1 cannot call setPostTransactionPrice', async function () {
            const { public1, raptorV1 } = await loadFixture(initializeFixture);

            await expect(
                raptorV1.connect(public1).setPostTransactionPrice(ethers.utils.parseEther('0.01'))
            ).to.be.revertedWithCustomError(raptorV1, 'NotAdmin');

            // check postTransactionPrice is still 0.01 ether
            expect(await raptorV1.postTransactionPrice()).to.equal(ethers.utils.parseEther('0.01'));
        });

        it('deployer can call setPostTransactionPrice', async function () {
            const { deployer, raptorV1 } = await loadFixture(initializeFixture);

            // deployer sets postTransactionPrice to 0.02 ether
            await raptorV1.connect(deployer).setPostTransactionPrice(ethers.utils.parseEther('0.02'));

            // check postTransactionPrice is 0.02 ether
            expect(await raptorV1.postTransactionPrice()).to.equal(ethers.utils.parseEther('0.02'));
        });

        it('Perform CRUD and other operations on posts', async function () {
            const { deployer, user1, user2, user3, raptorV1 } = await loadFixture(initializeFixture);

            const postTransactionPrice = ethers.utils.parseEther('0.01');

            // user1 creates a post with 0.009 ether which should fail
            await expect(
                raptorV1
                    .connect(user1)
                    .createPost('post-metadata-cid-001', 0, { value: ethers.utils.parseEther('0.009') })
            ).to.be.revertedWithCustomError(raptorV1, 'DidNotPayEnough');

            // user1 creates a post with 0.01 ether
            await expect(
                raptorV1.connect(user1).createPost('post-metadata-cid-001', 0, { value: postTransactionPrice })
            )
                .to.emit(raptorV1, 'PostCreated')
                .withArgs(1, user1.address, 'post-metadata-cid-001');

            // check post 1
            const post1 = await raptorV1.connect(user1).posts(1);
            expect(post1.author).to.equal(user1.address);
            expect(post1.metadataCid).to.equal('post-metadata-cid-001');
            expect(post1.quotedPostId).to.equal(0);
            expect(post1.likes).to.equal(0);
            expect(post1.reposts).to.equal(0);
            expect(post1.replies).to.equal(0);

            // user2 cannot update post 1
            await expect(
                raptorV1.connect(user2).updatePost(1, 'post-metadata-cid-001-updated', { value: postTransactionPrice })
            ).to.be.revertedWithCustomError(raptorV1, 'NotTheAuthor');

            // user1 updates post 1 with 0.009 ether which should fail
            await expect(
                raptorV1
                    .connect(user1)
                    .updatePost(1, 'post-metadata-cid-001-updated', { value: ethers.utils.parseEther('0.009') })
            ).to.be.revertedWithCustomError(raptorV1, 'DidNotPayEnough');

            // user1 updates post 1 with 0.01 ether
            await expect(
                raptorV1.connect(user1).updatePost(1, 'post-metadata-cid-001-updated', { value: postTransactionPrice })
            )
                .to.emit(raptorV1, 'PostUpdated')
                .withArgs(1, user1.address, 'post-metadata-cid-001-updated');

            // check post 1
            const post1Updated = await raptorV1.connect(user1).posts(1);
            expect(post1Updated.author).to.equal(user1.address);
            expect(post1Updated.metadataCid).to.equal('post-metadata-cid-001-updated');
            expect(post1Updated.quotedPostId).to.equal(0);
            expect(post1Updated.likes).to.equal(0);
            expect(post1Updated.reposts).to.equal(0);
            expect(post1Updated.replies).to.equal(0);

            // user1 likes post 1
            await expect(raptorV1.connect(user1).likePost(1));

            // post 1 likes should be 1
            const post1Liked = await raptorV1.connect(user1).posts(1);
            expect(post1Liked.likes).to.equal(1);

            // user1 likes post 1 again which should fail
            await expect(raptorV1.connect(user1).likePost(1)).to.be.revertedWithCustomError(raptorV1, 'AlreadyLiked');

            // user2 likes post 1
            await expect(raptorV1.connect(user2).likePost(1));

            // post 1 likes should be 2
            const post1Liked2 = await raptorV1.connect(user1).posts(1);
            expect(post1Liked2.likes).to.equal(2);

            // user1 unlikes post 1
            await expect(raptorV1.connect(user1).unlikePost(1)).to.emit(raptorV1, 'PostUnliked').withArgs(1, user1.address);

            // post 1 likes should be 1
            const post1Unliked = await raptorV1.connect(user1).posts(1);
            expect(post1Unliked.likes).to.equal(1);

            // user1 unlikes post 1 again which should fail
            await expect(raptorV1.connect(user1).unlikePost(1)).to.be.revertedWithCustomError(raptorV1, 'NotLiked');

            // user2 cannot delete post 1
            await expect(
                raptorV1.connect(user2).deletePost(1, { value: postTransactionPrice })
            ).to.be.revertedWithCustomError(raptorV1, 'NotTheAuthor');

            // user1 deletes post 1 with 0.009 ether which should fail
            await expect(
                raptorV1.connect(user1).deletePost(1, { value: ethers.utils.parseEther('0.009') })
            ).to.be.revertedWithCustomError(raptorV1, 'DidNotPayEnough');

            // user1 deletes post 1 with 0.01 ether
            await expect(raptorV1.connect(user1).deletePost(1, { value: postTransactionPrice }))
                .to.emit(raptorV1, 'PostDeleted')
                .withArgs(1, user1.address);

            // check post 1
            const post1Deleted = await raptorV1.connect(user1).posts(1);
            expect(post1Deleted.author).to.equal(user1.address);
            expect(post1Deleted.metadataCid).to.equal('');
            expect(post1Deleted.quotedPostId).to.equal(0);
        });
    });
});
