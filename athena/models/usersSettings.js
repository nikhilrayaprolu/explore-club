// @flow
const { db } = require('shared/db');
import type { DBUsersSettings } from 'shared/types';
const dbUtil = require('shared/dbUtil');

// export const getUsersSettings = (userId: string): Promise<?DBUsersSettings> => {
//   return db
//     .table('usersSettings')
//     .getAll(userId, { index: 'userId' })
//     .run()
//     .then(results => {
//       if (results && results.length > 0) return results[0];
//       return null;
//     });
// };
export const getUsersSettings = (userId: string): Promise<?DBUsersSettings> => {
  return dbUtil.tryCallAsync(
    'getUsersSettings',
    { userId },
    () => {
      return db
        .collection('usersSettings')
        .find({ userId: userId })
        .then(results => {
          if (results) return results[0];
          return null;
        });
    },
    null
  );
};
