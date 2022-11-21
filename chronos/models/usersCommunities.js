// @flow
const { db } = require('shared/db');
const dbUtil = require('shared/dbUtil');

// prettier-ignore
// export const getUsersCommunityIds = (userId: string): Promise<Array<string>> => {
//   return db
//     .table('usersCommunities')
//     .getAll([userId, true], { index: 'userIdAndIsMember' })('communityId')
//     .run();
// };
export const getUsersCommunityIds = async (userId: string): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    "getUsersCommunityIds",
    { userId },
    () => {
      return db
        .collection('usersCommunities')
        .find({ userId: userId, isMember: true })
        .map(usersCommunity => {
          return usersCommunity.communityId;
        })
        .toArray();
    },
    []
  )
};
