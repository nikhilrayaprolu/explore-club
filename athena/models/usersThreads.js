// @flow
const { db } = require('shared/db');
import type { DBUsersThreads } from 'shared/types';
const dbUtil = require('shared/dbUtil');

// export const getThreadNotificationUsers = (
//   threadId: string
// ): Promise<Array<Object>> => {
//   return db
//     .table('usersThreads')
//     .getAll(threadId, { index: 'threadId' })
//     .filter({ receiveNotifications: true })
//     .eqJoin('userId', db.table('users'))
//     .without({ right: ['id', 'createdAt'] })
//     .zip()
//     .run();
// };
export const getThreadNotificationUsers = async (
  threadId: string
): Promise<Array<Object>> => {
  return dbUtil.tryCallAsync(
    'getThreadNotificationUsers',
    { threadId },
    async () => {
      let ret = await db
        .collection('usersThreads')
        .find({ threadId: threadId, receiveNotifications: true })
        .toArray();
      ret = await dbUtil.eqJoin(db, ret, 'userId', 'users');
      ret = dbUtil.without(ret, { right: ['id', 'createdAt'] });
      ret = dbUtil.zip(ret);
      return ret;
    },
    []
  );
};

// export const getUsersThread = (
//   userId: string,
//   threadId: string
// ): Promise<?DBUsersThreads> => {
//   return db
//     .table('usersThreads')
//     .getAll([userId, threadId], { index: 'userIdAndThreadId' })
//     .run()
//     .then(data => {
//       // if no record exists
//       if (!data || data.length === 0) return null;
//       // otherwise only return the first record (in case of duplicates)
//       return data[0];
//     });
// };
export const getUsersThread = (
  userId: string,
  threadId: string
): Promise<?DBUsersThreads> => {
  return dbUtil.tryCallAsync(
    'getUsersThread',
    { userId, threadId },
    () => {
      return db
        .collection('usersThreads')
        .find({ userId: userId, threadId: threadId })
        .toArray()
        .then(data => {
          if (!data && data.length == 0) return null;
          return data[0];
        });
    },
    null
  );
};

// export const getUserNotificationPermissionsInThread = (
//   userId: string,
//   threadId: string
// ): Promise<Boolean> => {
//   return db
//     .table('usersThreads')
//     .getAll([userId, threadId], { index: 'userIdAndThreadId' })
//     .run()
//     .then(data => data[0].receiveNotifications);
// };
export const getUserNotificationPermissionsInThread = (
  userId: string,
  threadId: string
): Promise<Boolean> => {
  return dbUtil.tryCallAsync(
    'getUserNotificationPermissionsInThread',
    { userId, threadId },
    () => {
      return db
        .collection('usersThreads')
        .find({ userId: userId, threadId: threadId })
        .toArray()
        .then(data => data[0].receiveNotifications);
    },
    null
  );
};

// export const setUserThreadLastSeen = (
//   userId: string,
//   threadId: string,
//   lastSeen: number
// ): Promise<Object> => {
//   return db
//     .table('usersThreads')
//     .getAll([userId, threadId], { index: 'userIdAndThreadId' })
//     .update({
//       lastSeen,
//     })
//     .run();
// };
export const setUserThreadLastSeen = (
  userId: string,
  threadId: string,
  lastSeen: number
): Promise<Object> => {
  return dbUtil.tryCallAsync(
    'setUserThreadLastSeen',
    { userId, threadId, lastSeen },
    () => {
      return dbUtil.updateOne(
        db,
        'usersThreads',
        { userId: userId, threadId: threadId },
        {
          $set: {
            lastSeen: lastSeen,
          },
        }
      );
    },
    null
  );
};

// export const createUserThread = ({
//   userId,
//   threadId,
//   lastSeen,
//   isParticipant,
//   receiveNotifications,
// }: {
//   userId: string,
//   threadId: string,
//   lastSeen?: Date,
//   isParticipant?: boolean,
//   receiveNotifications?: boolean,
// }) => {
//   return db
//     .table('usersThreads')
//     .insert({
//       createdAt: new Date(),
//       userId,
//       threadId,
//       lastSeen: lastSeen || db.literal(),
//       isParticipant: isParticipant || false,
//       receiveNotifications: receiveNotifications || null,
//     })
//     .run();
// };
export const createUserThread = ({
  userId,
  threadId,
  lastSeen,
  isParticipant,
  receiveNotifications,
}: {
  userId: string,
  threadId: string,
  lastSeen?: Date,
  isParticipant?: boolean,
  receiveNotifications?: boolean,
}) => {
  return dbUtil.tryCallAsync(
    'createUserThread',
    { userId, threadId, lastSeen, isParticipant, receiveNotifications },
    () => {
      return dbUtil.insert(db, 'usersThreads', {
        createdAt: new Date(),
        userId,
        threadId,
        lastSeen: lastSeen || db.literal(),
        isParticipant: isParticipant || false,
        receiveNotifications: receiveNotifications || null,
      });
    },
    null
  );
};
