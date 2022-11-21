// @flow
const { db } = require('shared/db');
const dbUtil = require('shared/dbUtil');

// prettier-ignore
// export const getUsersChannelsEligibleForWeeklyDigest = (userId: string): Promise<Array<string>> => {
//   return db
//     .table('usersChannels')
//     .getAll([userId, 'member'], [userId, 'moderator'], [userId, 'owner'], {
//       index: 'userIdAndRole',
//     })
//     .map(row => row('channelId'))
//     .run();
// };
export const getUsersChannelsEligibleForWeeklyDigest = (userId: string): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    "getUsersChannelsEligibleForWeeklyDigest",
    { userId },
    () => {
      return db
        .collection('usersChannels')
        .find([userId, 'member'], [userId, 'moderator'], [userId, 'owner'], {
          index: 'userIdAndRole',
        })
        .map(row => row.channelId)
        .toArray();
    },
    []
  )
};
