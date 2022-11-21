// @flow
const { db } = require('shared/db');
import type { DBUsersNotifications } from 'shared/types';
const dbUtil = require('shared/dbUtil');

// prettier-ignore
// export const getSeenUsersNotifications = (after: number, limit: number): Promise<Array<DBUsersNotifications>> => {
//   return db
//     .table('usersNotifications')
//     .skip(after)
//     .limit(limit)
//     .run()
// };
export const getSeenUsersNotifications = (after: number, limit: number): Promise<Array<DBUsersNotifications>> => {
  return dbUtil.tryCallAsync(
    "getSeenUsersNotifications",
    { after, limit },
    () => {
      return db
        .collection('usersNotifications')
        .find()
        .skip(after)
        .limit(limit)
        .toArray();
    },
    []
  )
};

// prettier-ignore
// export const deleteUsersNotifications = (arr: Array<string>): Promise<boolean> => {
//   return db
//     .table('usersNotifications')
//     .getAll(...arr)
//     .delete()
//     .run()
//     .then(() => true);
// };
export const deleteUsersNotifications = (arr: Array<string>): Promise<boolean> => {
  return dbUtil.tryCallAsync(
    "deleteUsersNotifications",
    { arr },
    () => {
      return db
        .collection('usersNotifications')
        .deleteMany({ id: { $in: arr } })
        .then(() => true);
    },
    false
  )
};
