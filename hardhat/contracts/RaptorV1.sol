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

    /// @notice This event is emitted when an account is created
    event AccountCreated(address indexed account, string metadataCid);

    /// @notice This function will create an account for the sender
    /// @param metadataCid The IPFS CID for the metadata
    /// @dev The sender must pay the createAccountPrice (to avoid spam and abuse)
    function createAccount(string memory metadataCid) external payable {
        if (msg.value < createAccountPrice) {
            revert DidNotPayEnough();
        }
        accounts[msg.sender] = metadataCid;
        emit AccountCreated(msg.sender, metadataCid);
    }

    /// @notice This event is emitted when an account is updated
    event AccountUpdated(address indexed account, string metadataCid);

    /// @notice This function will update an account for the sender
    /// @param metadataCid The IPFS CID for the updated metadata
    function updateAccount(string memory metadataCid) external {
        accounts[msg.sender] = metadataCid;
        emit AccountUpdated(msg.sender, metadataCid);
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
}