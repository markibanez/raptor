import * as dotenv from 'dotenv';
dotenv.config();

import { NFTStorage, File, Blob } from 'nft.storage'

const client = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });

const someData = new Blob([`{"name":"Pinpie","description":"Pinpie is a cute little pinata that loves to be filled with candy."}`], { type: 'application/json' });
const cid = await client.storeBlob(someData);

console.log(`generated cid`, cid);