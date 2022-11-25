# raptor
The next generation micro-blogging service powered by Web3

## What is Raptor?
It is the decentralized, web3 version of Twitter.

## Architecture
- Probably use Polygon (low gas fees!)
- ~~IPFS storage for front-end (Fleek.app)~~
    - Fleek.app will only serve static files so this won't work
- We will use vercel for the frontend and api backend
- Each account will be a wallet address
- The data for the accounts will be stored on IPFS (nft.storage, which is free!)
- We will charge a fee to create an account (probably 5 MATIC, around $4 or $5)
    - Charging a fee to create an account will make it expensive to create botnets


## Follows
- We are using EnumerableSets
- Rewrite follows / followers getters to accept address as parameter

## Posts
- Create of posts
- Reply to a post
- Repost a post
    - Repost as is (retweet)
    - Repost as a quote (quote tweet)
- Delete a post
- All these actions will cost 0.01 MATIC
- Onchain data:
    - Post ID
    - Content CID
    - Author
    - Timestamp
    - Quoted/reposted post ID
- Offchain data:
    - Content