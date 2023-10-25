import { ethers } from "ethers";

const purePosGenesisHeight = 11006000;
const purePosEpochBlocks = 201600;
const minBlockInterval = 3 * 60;
const minMinerGap = 4 * 3600;

// const sbchRpcUrl = 'https://rpc.smartbch.org';
const sbchRpcUrl = 'http://52.77.220.215:8545'; // archive node
const provider = new ethers.JsonRpcProvider(sbchRpcUrl);


// node main.js <posEpochNum>
async function main() {
  const n = await provider.getBlockNumber();
  const currPosEpochNum = Math.floor((n - purePosGenesisHeight) / purePosEpochBlocks);
  const currEpochStart = purePosGenesisHeight + currPosEpochNum * purePosEpochBlocks;
  console.log('curr epoch number:', currPosEpochNum);
  console.log('curr epoch start :', currEpochStart);
  console.log('curr epoch end   :', currEpochStart + purePosEpochBlocks - 1);
  console.log('latest height    :', n, `(${n - currEpochStart}/${purePosEpochBlocks})`);

  const posEpochNum = process.argv[2] ? Number(process.argv[2]) : currPosEpochNum - 1;
  await queryEpoch(posEpochNum);
}

async function queryEpoch(posEpochNum) {
  console.log('query posEpochNum:', posEpochNum);

  const epochStartH = purePosGenesisHeight + posEpochNum * purePosEpochBlocks;
  const epochEndH = epochStartH + purePosEpochBlocks - 1;
  const nextEpochStartH = epochEndH + 1;
  console.log('epochStartH      :', epochStartH);
  console.log('epochEndH        :', epochEndH);

  const startValsInfo = await provider.send('sbch_validatorsInfo', ['0x' + epochStartH.toString(16)]);
  const endValsInfo = await provider.send('sbch_validatorsInfo', ['0x' + nextEpochStartH.toString(16)]);
  const slashedVals = await getSlashedVals(startValsInfo, endValsInfo);
  console.log('startValsInfo:', /*startValsInfo*/);
  console.table(simpleValInfo(startValsInfo));
  console.log('endValsInfo:', /*endValsInfo*/);
  console.table(simpleValInfo(endValsInfo));
  console.log('slashedVals:', slashedVals);

  const queueLen = 100;
  const getBlock = asyncGetBlockFn(epochStartH, epochEndH, queueLen);
  const minedBlocksMap = new Map();
  const lastMinedBlockMap = new Map();
  const offlineMinerMap = new Map();
  const delayedBlocks = [];
  let lastBlock;

  for (let h = epochStartH; h <= epochEndH; h++) {
    // console.log('get block:', h);
    const got = h - epochStartH + 1;
    const progress = Math.floor(got / purePosEpochBlocks * 100);
    // process.stdout.write(`\rget block: ${h}, (${got}/${purePosEpochBlocks})`);
    process.stdout.write(`\rget block: ${h}, ${"■".repeat(progress)}${"□".repeat(100 - progress)}`);
    const block = await getBlock(h);
    // console.log(block);

    const minedBlocks = minedBlocksMap.get(block.miner) || 1;
    minedBlocksMap.set(block.miner, minedBlocks + 1);

    // check offline miners
    for (const [miner, lastMinedBlock] of lastMinedBlockMap) {
      if (offlineMinerMap.has(miner)) {
        continue;
      }

      const gap = block.timestamp - lastMinedBlock.timestamp;
      if (gap > minMinerGap) {
        offlineMinerMap.set(miner, lastMinedBlock.number);
      }
    }

    // check block interval
    if (lastBlock) {
      const interval = block.timestamp - lastBlock.timestamp;
      if (interval > minBlockInterval) {
        delayedBlocks.push({
          block  : block.number,
          interval: interval,
        });
      }
    }

    lastMinedBlockMap.set(block.miner, block);
    lastBlock = block;

  }
  console.log("");
  console.log('lastMinedBlockMap:', Array.from(lastMinedBlockMap).map(([k, v]) => ({miner: k, block: v.number})));
  console.log('minedBlocksMap:', minedBlocksMap);
  console.log('offlineMinerMap:', offlineMinerMap);
  console.log('delayedBlocks:', delayedBlocks);

  let allRewards = 0;
  if (delayedBlocks.length == 0) {
    if (offlineMinerMap.size == 0) {
      allRewards = 4;
    } else if (slashedVals.length == 0) {
      allRewards = 3;
    } else {
      allRewards = 2;
    }
  }
  console.log('allRewards:', allRewards);
}

function getSlashedVals(startValsInfo, endValsInfo) {
  const endValMap = new Map();
  for (const val of endValsInfo.validators) {
    endValMap.set(val.miner_address, val);
  }

  const slashedVals = [];
  for (const val of startValsInfo.currValidators) {
    const val2 = endValMap.get(val.miner_address);
    if (!val2 || val2.voting_power == 0) {
      slashedVals.push(val);
    }
  }

  return slashedVals;
}

function simpleValInfo(valsInfo) {
  return valsInfo.currValidators.map(x => ({
    intro   : x.introduction, 
    miner   : x.miner_address, 
    vp      : x.voting_power, 
    retiring: x.is_retiring,
  }));
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