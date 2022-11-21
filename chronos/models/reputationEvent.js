// @flow
const { db } = require('shared/db');
const dbUtil = require('shared/dbUtil');

// prettier-ignore
// export const getReputationChangeInTimeframe = (userId: string, timeframe: string): Promise<number> => {
//   let range;
//   switch (timeframe) {
//     case 'daily': {
//       range = 60 * 60 * 24;
//       break;
//     }
//     case 'weekly': {
//       range = 60 * 60 * 24 * 7;
//       break;
//     }
//     default: {
//       range = 60 * 60 * 24 * 7;
//     } // default to weekly
//   }

//   return db
//     .table('reputationEvents')
//     .between([userId, db.now().sub(range)], [userId, db.now()], {
//       index: 'userIdAndTimestamp',
//     })
//     .map(row => row('score'))
//     .reduce((l, r) => l.add(r))
//     .default(0)
//     .run();
// };
export const getReputationChangeInTimeframe = (userId: string, timeframe: string): Promise<number> => {
  return dbUtil.tryCallAsync(
    "getReputationChangeInTimeframe",
    { userId, timeframe },
    async () => {
      let range;
      switch (timeframe) {
        case 'daily': {
          range = 60 * 60 * 24;
          break;
        }
        case 'weekly': {
          range = 60 * 60 * 24 * 7;
          break;
        }
        default: {
          range = 60 * 60 * 24 * 7;
        } // default to weekly
      }
    
      let ret = await db
        .collection('reputationEvents')
        .find({
          userId: userId,
          timestamp: {
            $gt: new Date() - range,
            $lt: new Date()
          }
        })
        .toArray();
      ret = ret.reduce((l, r) => {
        return l + r;
      }, 0)
      return ret;
    },
    0
  )
};

// export const getTotalReputation = (userId: string): Promise<number> => {
//   return db
//     .table('reputationEvents')
//     .between([userId, db.minval], [userId, db.maxval], {
//       index: 'userIdAndTimestamp',
//     })
//     .map(row => row('score'))
//     .reduce((l, r) => l.add(r))
//     .default(0)
//     .run();
// };
export const getTotalReputation = async (userId: string): Promise<number> => {
  return dbUtil.tryCallAsync(
    'getTotalReputation',
    { userId },
    async () => {
      let ret = await db
        .collection('reputationEvents')
        .find({ userId: userId })
        .map(row => row.score)
        .toArray();
      ret = ret.reduce((l, r) => l + r, 0);
      return ret;
    },
    0
  );
};
