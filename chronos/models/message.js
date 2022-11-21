// @flow
const { db } = require('shared/db');
import { getRangeFromTimeframe } from './utils';
import type { Timeframe } from 'chronos/types';
const dbUtil = require('shared/dbUtil');

// export const getTotalMessageCount = (threadId: string): Promise<number> => {
//   return db
//     .table('messages')
//     .getAll(threadId, { index: 'threadId' })
//     .filter(db.row.hasFields('deletedAt').not())
//     .count()
//     .run();
// };
export const getTotalMessageCount = async (
  threadId: string
): Promise<number> => {
  return db.tryCallAsync(
    'getTotalMessageCount',
    async () => {
      let ret = await db
        .collection('messages')
        .find({ threadId: threadId, deletedAt: null })
        .toArray();
      ret = dbUtil.count(ret);
      return ret;
    },
    0
  );
};

// prettier-ignore
// export const getNewMessageCount = (threadId: string, timeframe: Timeframe): Promise<number> => {
//   const range = getRangeFromTimeframe(timeframe)

//   return db
//     .table('messages')
//     .between([threadId, db.now().sub(range)], [threadId, db.now()], {
//       index: 'threadIdAndTimestamp',
//     })
//     .filter(db.row.hasFields('deletedAt').not())
//     .count()
//     .run();
// };
export const getNewMessageCount = (threadId: string, timeframe: Timeframe): Promise<number> => {
  return db.tryCallAsync(
    "getNewMessageCount",
    () => {
      const range = getRangeFromTimeframe(timeframe)

      return db
        .collection('messages')
        .countDocuments({
          threadId: threadId,
          timestamp: { 
            $gt: new Date() - range,
            $lt: new Date()
          },
          deletedAt: null
        });
    },
    0
  )
};
