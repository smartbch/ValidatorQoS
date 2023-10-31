# SmartBCH Validator QoS Query Tool

This is a suggested scheme to incentive the validators' availability with sBCH.

The validators are shuffled in epochs, so sBCH should be delivered in epochs time frames. An epoch is roughly two weeks.

According to the validators' performance, different amounts of sBCH will be rewarded to the validators:

1. 4 sBCH reward: No block interval is longer than 3 minutes and no validator is absent for more than 4 hours during the epoch.
2. 3 sBCH reward: No block interval is longer than 3 minutes and no validator is slashed for off-line during the epoch.
3. 2 sBCH reward: No block interval is longer than 3 minutes.

A validator is "absent for more than 4 hours" when it fails to be the proposer (miner) of any block for more than 4 hours.

The reward are divided equally by the all the validators who are not absent for more than 4 hours during the epoch.

If none of the validators is absent for more than 4 hours but at least one of the smartBCH block interval is longer than 3 minutes because of the validators' internet connections are not stable, then no reward goes to the validators.

There are about 26 epochs in a year. This scheme needs about 100 sBCH reward for a year. We have got enough commitment on such a reward.



You could use this tool to query  QoS  (quality of service)  of smartBCH validators.




## Prepare

```bash
git clone ...
cd qos
npm install
```



## Query Last PoS Epoch Info

```bash
node main.js
```



## Query Specific PoS Epoch Info

```bash
node main.js <posEpochNum>
```



## Query Block Miners

```bash
node miners.js <startHeight>
```
