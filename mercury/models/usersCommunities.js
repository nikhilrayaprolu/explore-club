// @flow
const { db } = require('shared/db');
import { saveReputationEvent } from './reputationEvent';
const dbUtil = require('shared/dbUtil');

// export const updateReputation = (
//   userId: string,
//   communityId: string,
//   score: number,
//   type: string
// ): Promise<Object> => {
//   return db
//     .table('usersCommunities')
//     .getAll([userId, communityId], { index: 'userIdAndCommunityId' })
//     .update({
//       reputation: db.row('reputation').add(score),
//     })
//     .run()
//     .then(() =>
//       saveReputationEvent({
//         userId,
//         type,
//         communityId,
//         score,
//       })
//     );
// };
export const updateReputation = async (
  userId: string,
  communityId: string,
  score: number,
  type: string
): Promise<Object> => {
  return dbUtil.tryCallAsync(
    'updateReputation',
    { userId, communityId, score, type },
    () => {
      return dbUtil
        .updateMany(
          'usersCommunities',
          {
            userId: userId,
            communityId: communityId,
          },
          {
            $inc: {
              reputation: score,
            },
          }
        )
        .then(() => {
          saveReputationEvent({
            userId,
            type,
            communityId,
            score,
          });
        });
    },
    null
  );
};
