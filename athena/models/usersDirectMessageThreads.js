// @flow
const { db } = require('shared/db');
const dbUtil = require('shared/dbUtil');

// export const getDirectMessageThreadMembers = (
//   id: string
// ): Promise<Array<Object>> => {
//   return db
//     .table('usersDirectMessageThreads')
//     .getAll(id, { index: 'threadId' })
//     .filter({ receiveNotifications: true })
//     .eqJoin('userId', db.table('users'))
//     .without({ right: ['id', 'createdAt'] })
//     .zip()
//     .run();
// };
export const getDirectMessageThreadMembers = async (
  id: string
): Promise<Array<Object>> => {
  return dbUtil.tryCallAsync(
    'getDirectMessageThreadMembers',
    { id },
    async () => {
      let ret = await db
        .collection('usersDirectMessageThreads')
        .find({ threadId: id, receiveNotifications: true })
        .toArray();
      ret = await dbUtil.eqJoin(db, ret, 'userId', 'users');
      ret = dbUtil.without(ret, { right: ['id', 'createdAt'] });
      ret = dbUtil.zip(ret);
      return ret;
    },
    []
  );
};
