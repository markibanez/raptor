// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

contract RaptorV1 is Initializable, AccessControlUpgradeable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    /// @dev Custom error definitions
    error NotAdmin();
    error DidNotPayEnough();
    error HandleAlreadyTaken();
    error NotTheAuthor();
    error AlreadyLiked();
    error NotLiked();

    /// @notice Initializes the contract during deployment
    function initialize() public initializer {
        __AccessControl_init();
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        createAccountPrice = 5 ether; // default price is 5 matic
        postTransactionPrice = 0.01 ether; // default price is 0.01 matic
    }

    /// @notice This modifier is used to restrict access to users with the admin role
    modifier onlyAdmin() {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert NotAdmin();
        }
        _;
    }

    /// @notice Price to create an account
    uint256 public createAccountPrice;

    /// @notice This function sets the price to create an account
    /// @param price The price to create an account
    function setCreateAccountPrice(uint256 price) external onlyAdmin {
        createAccountPrice = price;
    }

    /// @notice Accounts are mapped to a metadata url
    /// @dev The mapping will store the corresponding IPFS CID for the account
    mapping(address => string) public accounts;

    /// @notice This mapping maps a handle to an address
    /// @dev This mapping is used to check if a handle is already taken
    mapping(string => address) public handles;

    /// @notice This mapping maps an address to its current handle
    mapping(address => string) public currentHandle;

    /// @notice This event is emitted when an account is created
    event AccountCreated(
        address indexed account,
        string metadataCid,
        string handle
    );

    /// @notice This function will create an account for the sender
    /// @param metadataCid The IPFS CID for the metadata
    /// @dev The sender must pay the createAccountPrice (to avoid spam and abuse)
    function createAccount(
        string calldata metadataCid,
        string calldata handle
    ) external payable {
        if (msg.value < createAccountPrice) {
            revert DidNotPayEnough();
        }

        if (handles[handle] != address(0)) {
            revert HandleAlreadyTaken();
        }

        accounts[msg.sender] = metadataCid;
        handles[handle] = msg.sender;
        currentHandle[msg.sender] = handle;
        emit AccountCreated(msg.sender, metadataCid, handle);
    }

    /// @notice This event is emitted when an account is updated
    event AccountUpdated(address indexed account, string metadataCid);

    /// @notice This function will update an account for the sender
    /// @param metadataCid The IPFS CID for the updated metadata
    function updateAccount(string memory metadataCid) external {
        accounts[msg.sender] = metadataCid;
        emit AccountUpdated(msg.sender, metadataCid);
    }

    /// @notice This event is emitted when an account's handle is updated
    event AccountHandleUpdated(address indexed account, string handle);

    /// @notice This function will update an account's handle
    /// @param handle The new handle
    /// @dev If a handle is already mapped to another address, the function will revert
    function updateAccountHandle(string calldata handle) external {
        if (handles[handle] != address(0)) {
            if (handles[handle] != msg.sender) {
                revert HandleAlreadyTaken();
            }
        }

        handles[handle] = msg.sender;
        emit AccountHandleUpdated(msg.sender, handle);
    }

    /// @notice This event is emitted when an account is deleted
    event AccountDeleted(address indexed account);

    /// @notice This function will delete an account for the sender
    function deleteAccount() external {
        delete accounts[msg.sender];
        emit AccountDeleted(msg.sender);
    }

    /// @dev This stores the account addresses that an account follows
    mapping(address => EnumerableSetUpgradeable.AddressSet) private follows;

    /// @dev This stores the account addresses that follow an account
    mapping(address => EnumerableSetUpgradeable.AddressSet) private followers;

    /// @notice This event is emitted when an account follows another account
    event AccountFollowed(address indexed account, address indexed followed);

    /// @notice This function will follow an account for the sender
    /// @param account The account to follow
    function follow(address account) external {
        follows[msg.sender].add(account);
        followers[account].add(msg.sender);
        emit AccountFollowed(msg.sender, account);
    }

    /// @notice This event is emitted when an account unfollows another account
    event AccountUnfollowed(
        address indexed account,
        address indexed unfollowed
    );

    /// @notice This function will unfollow an account for the sender
    /// @param account The account to unfollow
    function unfollow(address account) external {
        follows[msg.sender].remove(account);
        followers[account].remove(msg.sender);
        emit AccountUnfollowed(msg.sender, account);
    }

    /// @notice This function will return the accounts that the sender follows
    /// @return The accounts that the sender follows
    function getFollows() external view returns (address[] memory) {
        return follows[msg.sender].values();
    }

    /// @notice This function will return the number of accounts that the sender follows
    /// @return The number of accounts that the sender follows
    function getFollowsCount() external view returns (uint256) {
        return follows[msg.sender].length();
    }

    /// @notice This function will return the account the sender follows at the given index
    /// @param index The index of the account to return
    /// @return The account the sender follows at the given index
    function getFollowAtIndex(uint256 index) external view returns (address) {
        return follows[msg.sender].at(index);
    }

    /// @notice This function will return the accounts that follow the sender
    /// @return The accounts that follow the sender
    function getFollowers() external view returns (address[] memory) {
        return followers[msg.sender].values();
    }

    /// @notice This function will return the number of accounts that follow the sender
    /// @return The number of accounts that follow the sender
    function getFollowersCount() external view returns (uint256) {
        return followers[msg.sender].length();
    }

    /// @notice This function will return the account that follows the sender at the given index
    /// @param index The index of the account to return
    /// @return The account that follows the sender at the given index
    function getFollowerAtIndex(uint256 index) external view returns (address) {
        return followers[msg.sender].at(index);
    }

    /// @notice Price to create, update, delete, reply, like or repost a post
    uint256 public postTransactionPrice;

    /// @notice This function sets the price to create, update, delete, reply, like or repost a post
    /// @param price The price to create, update, delete, reply, like or repost a post
    function setPostTransactionPrice(uint256 price) external onlyAdmin {
        postTransactionPrice = price;
    }

    /// @dev This enum represents the type of a post
    enum PostType {
        Original,
        Comment,
        Repost,
        Quote
    }

    /// @dev This defines the post structure
    struct Post {
        string metadataCid;
        uint256 timestamp;
        address author;
        PostType postType;
        uint256 referencedPostId;
        uint256 likes;
        uint256 reposts;
        uint256 comments;
    }

    /// @notice This mapping maps a post ID to a post
    mapping(uint256 => Post) public posts;

    /// @notice Number of posts
    uint256 public postCount;

    /// @notice This mapping stores the post IDs that an account has created
    mapping(address => EnumerableSetUpgradeable.UintSet) private postsByAccount;

    /// @notice This function gets the post IDs that an account has created
    /// @param account The account to get the post IDs for
    /// @return The post IDs that an account has created
    function getPostsByAccount(
        address account
    ) external view returns (uint256[] memory) {
        return postsByAccount[account].values();
    }

    /// @notice This function gets the number of post IDs that an account has created
    /// @param account The account to get the number of post IDs for
    /// @return The number of post IDs that an account has created
    function getPostsByAccountCount(
        address account
    ) external view returns (uint256) {
        return postsByAccount[account].length();
    }

    /// @notice This function gets the post ID that an account has created at the given index
    /// @param account The account to get the post ID for
    /// @param index The index of the post ID to get
    /// @return The post ID that an account has created at the given index
    function getPostByAccountAtIndex(
        address account,
        uint256 index
    ) external view returns (uint256) {
        return postsByAccount[account].at(index);
    }

    /// @notice This mapping stores the post IDs a user has liked
    mapping(address => EnumerableSetUpgradeable.UintSet) private likedPosts;

    /// @notice This function gets the post IDs that a user has liked
    /// @param account The account to get the post IDs for
    /// @return The post IDs that a user has liked
    function getLikedPosts(
        address account
    ) external view returns (uint256[] memory) {
        return likedPosts[account].values();
    }

    /// @notice This function gets the number of post IDs that a user has liked
    /// @param account The account to get the number of post IDs for
    /// @return The number of post IDs that a user has liked
    function getLikedPostsCount(
        address account
    ) external view returns (uint256) {
        return likedPosts[account].length();
    }

    /// @notice This function gets the post ID that a user has liked at the given index
    /// @param account The account to get the post ID for
    /// @param index The index of the post ID to get
    /// @return The post ID that a user has liked at the given index
    function getLikedPostAtIndex(
        address account,
        uint256 index
    ) external view returns (uint256) {
        return likedPosts[account].at(index);
    }

    /// @notice This event is emitted when a post is created
    event PostCreated(
        uint256 indexed postId,
        address indexed author,
        string metadataCid
    );

    /// @notice This function creates a post
    /// @param metadataCid The CID of the post metadata
    /// @param postType The type of the post
    /// @param referencedPostId The ID of the post being quoted (0 if not quoting a post)
    /// @param userMentions The accounts mentioned in the post
    /// @param hashTags The hashtags used in the post
    /// @param cashTags The cashtags used in the post
    function createPost(
        string calldata metadataCid,
        PostType postType,
        uint256 referencedPostId,
        address[] calldata userMentions,
        string[] calldata hashTags,
        string[] calldata cashTags
    ) external payable {
        if (msg.value < postTransactionPrice) {
            revert DidNotPayEnough();
        }

        postCount++;
        posts[postCount] = Post({
            metadataCid: metadataCid,
            timestamp: block.timestamp,
            author: msg.sender,
            postType: postType,
            referencedPostId: referencedPostId,
            likes: 0,
            reposts: 0,
            comments: 0
        });

        postsByAccount[msg.sender].add(postCount);

        if (postType == PostType.Repost || postType == PostType.Quote) {
            posts[referencedPostId].reposts++;
        } else if (postType == PostType.Comment) {
            posts[referencedPostId].comments++;
        }

        emit PostCreated(postCount, msg.sender, metadataCid);

        for (uint256 i = 0; i < userMentions.length; i++) {
            emit UserMentionBroadcasted(userMentions[i], postCount);
        }

        for (uint256 i = 0; i < hashTags.length; i++) {
            emit HashTagBroadcasted(hashTags[i], postCount);
        }

        for (uint256 i = 0; i < cashTags.length; i++) {
            emit CashTagBroadcasted(cashTags[i], postCount);
        }
    }

    /// @notice This event is emitted when a post is updated
    event PostUpdated(
        uint256 indexed postId,
        address indexed author,
        string metadataCid
    );

    /// @notice This function updates a post
    /// @param postId The ID of the post to update
    /// @param metadataCid The CID of the post metadata
    /// @param userMentions The accounts mentioned in the post
    /// @param hashTags The hashtags used in the post
    /// @param cashTags The cashtags used in the post
    function updatePost(
        uint256 postId,
        string calldata metadataCid,
        address[] calldata userMentions,
        string[] calldata hashTags,
        string[] calldata cashTags
    ) external payable {
        if (msg.value < postTransactionPrice) {
            revert DidNotPayEnough();
        }

        Post storage post = posts[postId];
        if (post.author != msg.sender) {
            revert NotTheAuthor();
        }

        post.metadataCid = metadataCid;

        emit PostUpdated(postId, msg.sender, metadataCid);

        for (uint256 i = 0; i < userMentions.length; i++) {
            emit UserMentionBroadcasted(userMentions[i], postId);
        }

        for (uint256 i = 0; i < hashTags.length; i++) {
            emit HashTagBroadcasted(hashTags[i], postId);
        }

        for (uint256 i = 0; i < cashTags.length; i++) {
            emit CashTagBroadcasted(cashTags[i], postId);
        }
    }

    /// @notice This event is emitted when a post is deleted
    event PostDeleted(uint256 indexed postId, address indexed author);

    /// @notice This function deletes a post
    /// @param postId The ID of the post to delete
    /// @dev This should only delete the metadata cid and not the post itself
    function deletePost(uint256 postId) external payable {
        if (msg.value < postTransactionPrice) {
            revert DidNotPayEnough();
        }

        Post storage post = posts[postId];
        if (post.author != msg.sender) {
            revert NotTheAuthor();
        }

        delete post.metadataCid;

        emit PostDeleted(postId, msg.sender);
    }

    /// @notice This event is emitted when a post is liked
    event PostLiked(uint256 indexed postId, address indexed liker);

    /// @notice This function likes a post
    /// @param postId The ID of the post to like
    /// @dev No fee is required to like a post (except for the gas fee)
    function likePost(uint256 postId) external {
        Post storage post = posts[postId];

        if (likedPosts[msg.sender].contains(postId)) {
            revert AlreadyLiked();
        }

        likedPosts[msg.sender].add(postId);
        post.likes++;
        emit PostLiked(postId, msg.sender);
    }

    /// @notice This event is emitted when a post is unliked
    event PostUnliked(uint256 indexed postId, address indexed unliker);

    /// @notice This function unlikes a post
    /// @param postId The ID of the post to unlike
    /// @dev No fee is required to unlike a post (except for the gas fee)
    function unlikePost(uint256 postId) external {
        Post storage post = posts[postId];

        if (!likedPosts[msg.sender].contains(postId)) {
            revert NotLiked();
        }

        likedPosts[msg.sender].remove(postId);
        post.likes--;
        emit PostUnliked(postId, msg.sender);
    }

    /// @notice This event is emitted to broadcast a user mention
    event UserMentionBroadcasted(address indexed user, uint256 indexed postId);

    /// @notice This event is emitted to broadcast a hashtag
    event HashTagBroadcasted(string hashtag, uint256 indexed postId);

    /// @notice This event is emitted to broadcast a cashtag
    event CashTagBroadcasted(string cashtag, uint256 indexed postId);
}
