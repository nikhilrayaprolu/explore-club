// @flow
const { db } = require('shared/db');
const dbUtil = require('shared/dbUtil');

// export const saveReputationEvent = ({
//   userId,
//   type,
//   communityId,
//   score,
// }: {
//   userId: string,
//   type: string,
//   communityId: string,
//   score: number,
// }): Promise<Object> => {
//   return db
//     .table('reputationEvents')
//     .insert({
//       timestamp: new Date(),
//       userId,
//       type,
//       communityId,
//       score,
//     })
//     .run();
// };
export const saveReputationEvent = ({
  userId,
  type,
  communityId,
  score,
}: {
  userId: string,
  type: string,
  communityId: string,
  score: number,
}): Promise<Object> => {
  return dbUtil.tryCallAsync(
    'saveReputationEvent',
    { userId, type, communityId, score },
    () => {
      return dbUtil.insert(db, 'reputationEvents', {
        timestamp: new Date(),
        userId,
        type,
        communityId,
        score,
      });
    },
    null
  );
};
