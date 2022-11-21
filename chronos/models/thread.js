// @flow
const { db } = require('shared/db');
import type { DBThread } from 'shared/types';
import { getRangeFromTimeframe } from 'chronos/models/utils';
import type { Timeframe } from 'chronos/types';
const dbUtil = require('shared/dbUtil');

// export const getThreadsInChannelsInTimeframe = async (
//   timeframe: Timeframe,
//   channelIds: Array<string>
// ): Promise<Array<DBThread>> => {
//   const range = getRangeFromTimeframe(timeframe);
//   let threads = [];

//   const channelPromises = channelIds.map(async channelId => {
//     const threadsInChannelAndTimeframe = await db
//       .table('threads')
//       .between([channelId, db.now().sub(range)], [channelId, db.now()], {
//         index: 'channelIdAndLastActive',
//         leftBound: 'open',
//         rightBound: 'open',
//       })
//       .orderBy({ index: db.desc('channelIdAndLastActive') })
//       .filter(thread => db.not(thread.hasFields('deletedAt')))
//       .run();

//     threads = [...threads, ...threadsInChannelAndTimeframe];
//   });

//   return await Promise.all([...channelPromises]).then(() => {
//     return threads;
//   });
// };
export const getThreadsInChannelsInTimeframe = (
  timeframe: Timeframe,
  channelIds: Array<string>
): Promise<Array<DBThread>> => {
  return dbUtil.tryCallAsync(
    'getThreadsInChannelsInTimeframe',
    { timeframe, channelIds },
    async () => {
      const range = getRangeFromTimeframe(timeframe);
      let threads = [];

      const channelPromises = channelIds.map(async channelId => {
        const threadsInChannelAndTimeframe = await db
          .collection('threads')
          .find({
            channelId: channelId,
            lastActive: {
              $gte: new Date() - range,
              $lte: new Date(),
            },
            deletedAt: null,
          })
          .sort({ channelId: -1, lastActive: -1 })
          .toArray();

        threads = [...threads, ...threadsInChannelAndTimeframe];
      });

      return await Promise.all([...channelPromises]).then(() => {
        return threads;
      });
    },
    []
  );
};
