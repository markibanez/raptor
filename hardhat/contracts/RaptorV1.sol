// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

contract RaptorV1 is Initializable, AccessControlUpgradeable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    /// @dev Custom error definitions
    error NotAdmin();
    error DidNotPayEnough();
    error HandleAlreadyTaken();

    /// @notice Initializes the contract during deployment
    function initialize() public initializer {
        __AccessControl_init();
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        createAccountPrice = 5 ether; // default price is 5 matic
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

    /// @notice This event is emitted when an account is created
    event AccountCreated(address indexed account, string metadataCid, string handle);

    /// @notice This function will create an account for the sender
    /// @param metadataCid The IPFS CID for the metadata
    /// @dev The sender must pay the createAccountPrice (to avoid spam and abuse)
    function createAccount(string calldata metadataCid, string calldata handle) external payable {
        if (msg.value < createAccountPrice) {
            revert DidNotPayEnough();
        }

        if (handles[handle] != address(0)) {
            revert HandleAlreadyTaken();
        }

        accounts[msg.sender] = metadataCid;
        handles[handle] = msg.sender;
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
    event AccountUnfollowed(address indexed account, address indexed unfollowed);

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
}