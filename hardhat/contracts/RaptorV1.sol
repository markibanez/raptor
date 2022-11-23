// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract RaptorV1 is Initializable, AccessControlUpgradeable {
    /// @dev Custom error definitions
    error NotAdmin();

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
    function createAccount(string memory metadataCid) external payable {
        require(msg.value >= createAccountPrice, "Raptor: Did not send enough");
        accounts[msg.sender] = metadataCid;
        emit AccountCreated(msg.sender, metadataCid);
    }
}