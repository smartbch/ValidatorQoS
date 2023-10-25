import { ethers } from "ethers";

// const sbchRpcUrl = 'https://rpc.smartbch.org';
const sbchRpcUrl = 'http://52.77.220.215:8545'; // archive node
const provider = new ethers.JsonRpcProvider(sbchRpcUrl);

async function main() {
  const n = await provider.getBlockNumber();
  const startH = Number(process.argv[2] || n);

  const queueLen = 100;
  const getBlock = asyncGetBlockFn(startH, n, queueLen);

  for (let h = startH; h <= n; h++) {
  	const block = await getBlock(h);
  	console.log(`h: ${h}, miner: ${block.miner}, ts: ${block.timestamp}`);
  }

}

function asyncGetBlockFn(firstH, lastH, queueLen) {
  const queue = [];

  return function(h) {
    if (h == firstH) { // init queue
      for (let i = 0; i <= queueLen; i++) {
        queue.push(provider.getBlock(h + i));
      }
    } else if (h + queueLen <= lastH) {
      queue.push(provider.getBlock(h + queueLen));
    }
    return queue.shift();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });