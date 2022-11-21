// @flow
const { db } = require('shared/db');
const dbUtil = require('shared/dbUtil');

/*
===========================================================

  MODIFYING AND CREATING DATA IN USERSDIRECTMESSAGETHREADS

===========================================================
*/

// creates a single member in a direct message thread. invoked when a user is added
// to an existing direct message thread (group thread only)
// prettier-ignore
// const createMemberInDirectMessageThread = (threadId: string, userId: string, setActive: boolean): Promise<Object> => {
//   return db
//     .table('usersDirectMessageThreads')
//     .insert(
//       {
//         threadId,
//         userId,
//         createdAt: new Date(),
//         lastActive: setActive ? new Date() : null,
//         lastSeen: setActive ? new Date() : null,
//         receiveNotifications: true,
//       },
//       { returnChanges: true }
//     )
//     .run()
//     .then(result => result.changes[0].new_val);
// };
const createMemberInDirectMessageThread = (threadId: string, userId: string, setActive: boolean): Promise<Object> => {
  return dbUtil.tryCallAsync(
    "createMemberInDirectMessageThread",
    { threadId, userId, setActive },
    () => {
      return dbUtil
        .insert(
          db,
          'usersDirectMessageThreads',
          {
            threadId,
            userId,
            createdAt: new Date(),
            lastActive: setActive ? new Date() : null,
            lastSeen: setActive ? new Date() : null,
            receiveNotifications: true,
          }
        )
        .then((result) => {
          return result[0]
        });
    },
    null
  )  
};

// removes a single member from a channel. will be invoked if a user leaves
// a channel
// prettier-ignore
// const removeMemberInDirectMessageThread = (threadId: string, userId: string): Promise<Object> => {
//   return db
//     .table('usersDirectMessageThreads')
//     .getAll(threadId, { index: 'threadId' })
//     .filter({ userId })
//     .delete()
//     .run();
// };
const removeMemberInDirectMessageThread = (threadId: string, userId: string): Promise<Object> => {
  return dbUtil.tryCallAsync(
    "removeMemberInDirectMessageThread",
    { threadId, userId },
    () => {
      return db
        .collection('usersDirectMessageThreads')
        .deleteMany({ 
          threadId: threadId, 
          userId: userId 
        })
    },
    null
  )
};

// removes all the user relationships to a dm thread. will be invoked when a
// dm thread is permanently deleted, at which point we don't want any records in the
// database to show a user relationship to the deleted thread
// prettier-ignore
// const removeMembersInDirectMessageThread = (threadId: string): Promise<Object> => {
//   return db
//     .table('usersDirectMessageThreads')
//     .getAll(threadId, { index: 'threadId' })
//     .delete()
//     .run();
// };
const removeMembersInDirectMessageThread = (threadId: string): Promise<Object> => {
  return dbUtil.tryCallAsync(
    "removeMembersInDirectMessageThread",
    { threadId },
    () => {
      return db
        .collection('usersDirectMessageThreads')
        .deleteMany({ threadId: threadId })
    },
    null
  )
};

// prettier-ignore
// const setUserLastSeenInDirectMessageThread = (threadId: string, userId: string): Promise<Object> => {
//   return db
//     .table('usersDirectMessageThreads')
//     .getAll(userId, { index: 'userId' })
//     .filter({ threadId })
//     .update({
//       lastSeen: db.now(),
//     })
//     .run()
//     .then(() =>
//       db
//         .table('directMessageThreads')
//         .get(threadId)
//         .run()
//     );
// };
const setUserLastSeenInDirectMessageThread = (threadId: string, userId: string): Promise<Object> => {
  return dbUtil.tryCallAsync(
    "setUserLastSeenInDirectMessageThread",
    { threadId, userId },
    () => {
      return dbUtil
        .updateMany(
          'usersDirectMessageThreads',
          { 
            userId: userId, 
            threadId: threadId 
          },
          {
            $set: {
              lastSeen: new Date()
            }
          }
        )
        .then(() =>
          db
            .collection('directMessageThreads')
            .findOne({ id: threadId })
        );
    },
    null
  )
};

// prettier-ignore
// const updateDirectMessageThreadNotificationStatusForUser = (threadId: string, userId: string, val: boolean): Promise<Object> => {
//   return db
//     .table('usersDirectMessageThreads')
//     .getAll(userId, { index: 'userId' })
//     .filter({ threadId })
//     .update({
//       receiveNotifications: val,
//     })
//     .run();
// };
const updateDirectMessageThreadNotificationStatusForUser = (threadId: string, userId: string, val: boolean): Promise<Object> => {
  return dbUtil.tryCallAsync(
    "updateDirectMessageThreadNotificationStatusForUser",
    { threadId, userId, val },
    () => {
      return dbUtil
        .updateMany(
          'usersDirectMessageThreads',
          { 
            userId: userId, 
            threadId: threadId 
          },
          {
            $set: {
              receiveNotifications: val,
            }
          }
        )
    },
    null
  )
};

/*
===========================================================

        GETTING DATA FROM USERSDIRECTMESSAGETHREADS

===========================================================
*/

// prettier-ignore
// const getMembersInDirectMessageThread = (threadId: string): Promise<Array<Object>> => {
//   return db
//     .table('usersDirectMessageThreads')
//     .getAll(threadId, { index: 'threadId' })
//     .eqJoin('userId', db.table('users'))
//     .without({ left: ['createdAt'], right: ['id', 'lastSeen'] })
//     .zip()
//     .run();
// };
const getMembersInDirectMessageThread = async (threadId: string): Promise<Array<Object>> => {
  return dbUtil.tryCallAsync(
    "getMembersInDirectMessageThread",
    { threadId },
    async () => {
      let ret = await db
        .collection('usersDirectMessageThreads')
        .find({ threadId: threadId })
        .toArray();
      ret = await dbUtil.eqJoin(db, ret, "userId", "users");
      ret = dbUtil.without(ret, { left: ['createdAt'], right: ['id', 'lastSeen'] });
      ret = dbUtil.zip(ret);
      return ret;
    },
    []
  )
};

// for loader
// prettier-ignore
// const getMembersInDirectMessageThreads = (threadIds: Array<string>): Promise<Array<Object>> => {
//   return db
//     .table('usersDirectMessageThreads')
//     .getAll(...threadIds, { index: 'threadId' })
//     .eqJoin('userId', db.table('users'))
//     .without({ left: ['createdAt'], right: ['id', 'lastSeen'] })
//     .group(rec => rec('left')('threadId'))
//     .zip()
//     .run();
// };
const getMembersInDirectMessageThreads = async (threadIds: Array<string>): Promise<Array<Object>> => {
  return dbUtil.tryCallAsync(
    "getMembersInDirectMessageThreads",
    { threadIds },
    async () => {
      let ret = await db
        .collection('usersDirectMessageThreads')
        .find({ threadId: { $in: threadIds } })
        .toArray();
      ret = await dbUtil.eqJoin(db, ret, "userId", "users");
      ret = dbUtil.without(ret, { left: ['createdAt'], right: ['id', 'lastSeen'] });
      ret = dbUtil.group(ret, (rec) => {
        return rec.left.threadId;
      });
      ret = dbUtil.zip(ret);
      return ret;
    },
    []
  )
};

// const isMemberOfDirectMessageThread = (threadId: string, userId: string) => {
//   return db
//     .table('usersDirectMessageThreads')
//     .getAll(threadId, { index: 'threadId' })('userId')
//     .contains(userId)
//     .run();
// };
const isMemberOfDirectMessageThread = async (
  threadId: string,
  userId: string
) => {
  return dbUtil.tryCallAsync(
    'isMemberOfDirectMessageThread',
    { threadId, userId },
    async () => {
      let ret = await db
        .collection('usersDirectMessageThreads')
        .find({ threadId: threadId })
        .map(usersDirectMessageThread => {
          return usersDirectMessageThread.userId;
        })
        .toArray();
      ret = dbUtil.contains(ret, userId);
      return ret;
    },
    false
  );
};

// const getDirectMessageThreadRecords = (threadId: string) => {
//   return db
//     .table('usersDirectMessageThreads')
//     .getAll(threadId, { index: 'threadId' })
//     .run();
// };
const getDirectMessageThreadRecords = (threadId: string) => {
  return dbUtil.tryCallAsync(
    'getDirectMessageThreadRecords',
    { threadId },
    () => {
      return db
        .collection('usersDirectMessageThreads')
        .find({ threadId: threadId })
        .toArray();
    },
    []
  );
};

module.exports = {
  createMemberInDirectMessageThread,
  removeMemberInDirectMessageThread,
  removeMembersInDirectMessageThread,
  setUserLastSeenInDirectMessageThread,
  updateDirectMessageThreadNotificationStatusForUser,
  // get
  getMembersInDirectMessageThread,
  getMembersInDirectMessageThreads,
  isMemberOfDirectMessageThread,
  getDirectMessageThreadRecords,
};
