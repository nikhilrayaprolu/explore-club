// @flow
import type { DBUsersThreads } from 'shared/types';
const { db } = require('shared/db');
const dbUtil = require('shared/dbUtil');

// invoked only when a thread is created or a user leaves a message on a thread.
// Because a user could leave multiple messages on a thread, we first check
// to see if a record exists with a relationship. If it does, we return and
// do nothing. If it doesn't, we create the relationship.
// prettier-ignore
// export const createParticipantInThread = (threadId: string, userId: string): Promise<Object> => {
//   return db
//     .table('usersThreads')
//     .getAll([userId, threadId], { index: 'userIdAndThreadId' })
//     .run()
//     .then(result => {
//       // if a result already exists, the user has an existing relationship
//       // with this thread
//       if (result && result.length > 0) {
//         // if they are already a participant, we can return
//         const { id, isParticipant, receiveNotifications } = result[0];
//         if (isParticipant) return;

//         // otherwise, mark them as a participant
//         return db
//           .table('usersThreads')
//           .get(id)
//           .update({
//             isParticipant: true,
//             // if receiveNotifications is null, it means that the user is leaving
//             // their first message on the thread, so this should set it to true
//             receiveNotifications: receiveNotifications === false ? false : true,
//           })
//           .run();
//       } else {
//         // if there is no relationship with the thread, create one
//         return db.table('usersThreads').insert({
//           createdAt: new Date(),
//           userId,
//           threadId,
//           isParticipant: true,
//           receiveNotifications: true,
//         });
//       }
//     });
// };
export const createParticipantInThread = (threadId: string, userId: string): Promise<Object> => {
  return dbUtil.tryCallAsync(
    "createParticipantInThread",
    { threadId, userId },
    () => {
      return db
        .collection('usersThreads')
        .find({ userId: userId, threadId: threadId })
        .toArray()
        .then(result => {
          // if a result already exists, the user has an existing relationship
          // with this thread
          if (result && result.length > 0) {
            // if they are already a participant, we can return
            const { id, isParticipant, receiveNotifications } = result[0];
            if (isParticipant) return;

            // otherwise, mark them as a participant
            return dbUtil
              .collection(
                'usersThreads',
                { 
                  id: id 
                },
                {
                  $set: {
                    isParticipant: true,
                    // if receiveNotifications is null, it means that the user is leaving
                    // their first message on the thread, so this should set it to true
                    receiveNotifications: receiveNotifications === false ? false : true,
                  }
                }
              )
          } else {
            // if there is no relationship with the thread, create one
            return dbUtil.insert(db, 
              'usersThreads',
              {
                createdAt: new Date(),
                userId,
                threadId,
                isParticipant: true,
                receiveNotifications: true,
              }
            );
          }
        });
    },
    null
  )
};

// prettier-ignore
// export const deleteParticipantInThread = (threadId: string, userId: string): Promise<boolean> => {
//   return db
//     .table('usersThreads')
//     .getAll([userId, threadId], { index: 'userIdAndThreadId' })
//     .delete()
//     .run()
// };
export const deleteParticipantInThread = (threadId: string, userId: string): Promise<boolean> => {
  return dbUtil.tryCallAsync(
    "deleteParticipantInThread",
    { threadId, userId },
    () => {
      return db
        .collection('usersThreads')
        .deleteMany({ userId: userId, threadId: threadId })
    },
    null
  )
};

// Users can opt in to notifications on a thread without having to leave a message or be the thread creator. This will only activate notifications and the user will not appear as a participant in the UI
// prettier-ignore
// export const createNotifiedUserInThread = (threadId: string, userId: string): Promise<Object> => {
//   return db
//     .table('usersThreads')
//     .insert({
//       createdAt: new Date(),
//       userId,
//       threadId,
//       isParticipant: false,
//       receiveNotifications: true,
//     })
//     .run()
// };
export const createNotifiedUserInThread = (threadId: string, userId: string): Promise<Object> => {
  return dbUtil.tryCallAsync(
    "createNotifiedUserInThread",
    { threadId, userId },
    () => {
      return dbUtil
        .insert(
          db,
          'usersThreads',
          {
            createdAt: new Date(),
            userId,
            threadId,
            isParticipant: false,
            receiveNotifications: true,
          }
        )
    },
    null
  )
};

// prettier-ignore
// export const getParticipantsInThread = (threadId: string): Promise<Array<Object>> => {
//   return db
//     .table('usersThreads')
//     .getAll(threadId, { index: 'threadId' })
//     .filter({ isParticipant: true })
//     .eqJoin('userId', db.table('users'))
//     .without({
//       left: ['createdAt', 'id', 'threadId', 'userId'],
//     })
//     .zip()
//     .run();
// };
export const getParticipantsInThread = async (threadId: string): Promise<Array<Object>> => {
  return dbUtil.tryCallAsync(
    "getParticipantsInThread",
    { threadId },
    async () => {
      let ret = await db
        .collection('usersThreads')
        .find({
          threadId: threadId,
          isParticipant: true
        })
        .toArray();
      ret = await dbUtil.eqJoin(db, ret, "userId", "users");
      ret = dbUtil.without(ret, {
        left: ['createdAt', 'id', 'threadId', 'userId'],
      });
      ret = dbUtil.zip(ret);
      return ret;
    },
    null
  );
};

// export const getParticipantsInThreads = (threadIds: Array<string>) => {
//   return db
//     .table('usersThreads')
//     .getAll(...threadIds, { index: 'threadId' })
//     .filter({ isParticipant: true })
//     .eqJoin('userId', db.table('users'))
//     .group(rec => rec('left')('threadId'))
//     .without({
//       left: ['createdAt', 'id', 'userId'],
//     })
//     .zip()
//     .run();
// };
export const getParticipantsInThreads = (threadIds: Array<string>) => {
  return dbUtil.tryCallAsync(
    'getParticipantsInThreads',
    { threadIds },
    async () => {
      let ret = await db
        .collection('usersThreads')
        .find({ threadId: { $in: threadIds, isParticipant: true } })
        .toArray();
      ret = await dbUtil.eqJoin(db, ret, 'userId', 'users');
      ret = dbUtil.group(rec => {
        return rec.left.threadId;
      });
      ret = ret.without({
        left: ['createdAt', 'id', 'userId'],
      });
      ret = dbUtil.zip(ret);
      return ret;
    },
    []
  );
};

// prettier-ignore
// export const getThreadNotificationStatusForUser = (threadId: string, userId: string): Promise<?DBUsersThreads> => {
//   return db
//     .table('usersThreads')
//     .getAll([userId, threadId], { index: 'userIdAndThreadId' })
//     .run()
//     .then(results => {
//       if (!results || results.length === 0) return null;
//       return results[0];
//     });
// };
export const getThreadNotificationStatusForUser = (threadId: string, userId: string): Promise<?DBUsersThreads> => {
  return dbUtil.tryCallAsync(
    "getThreadNotificationStatusForUser",
    { threadId, userId },
    () => {
      return db
        .collection('usersThreads')
        .find({ userId: userId, threadId: threadId })
        .toArray()
        .then(results => {
          if (!results || results.length === 0) return null;
          return results[0];
        });
    },
    null
  )
};

type UserIdAndThreadId = [string, string];

// prettier-ignore
// export const getThreadsNotificationStatusForUsers = (input: Array<UserIdAndThreadId>) => {
//   return db
//     .table('usersThreads')
//     .getAll(...input, { index: 'userIdAndThreadId' })
//     .run()
//     .then(result => {
//       if (!result) return Array.from({ length: input.length }).map(() => null);

//       return result;
//     });
// };
export const getThreadsNotificationStatusForUsers = (input: Array<UserIdAndThreadId>) => {
  return dbUtil.tryCallAsync(
    "getThreadsNotificationStatusForUsers",
    { input },
    () => {
      return db
        .collection('usersThreads')
        .find({ 
          $or: input.map(element => {
            return {
              userId: element[0],
              threadId: element[1]
            }
          })
        })
        .toArray()
        .then(result => {
          if (!result) return Array.from({ length: input.length }).map(() => null);

          return result;
        });
    },
    null
  )
};

// prettier-ignore
// export const updateThreadNotificationStatusForUser = (threadId: string, userId: string, value: boolean): Promise<Object> => {
//   return db
//     .table('usersThreads')
//     .getAll([userId, threadId], { index: 'userIdAndThreadId' })
//     .run()
//     .then(results => {
//       // if no record exists, the user is trying to mute a thread they
//       // aren't a member of - e.g. someone mentioned them in a thread
//       // so create a record
//       if (!results || results.length === 0) {
//         return db.table('usersThreads').insert({
//           createdAt: new Date(),
//           userId,
//           threadId,
//           isParticipant: false,
//           receiveNotifications: value,
//         })
//         .run()
//       }

//       const record = results[0];
//       return db
//         .table('usersThreads')
//         .get(record.id)
//         .update({
//           receiveNotifications: value,
//         })
//         .run();
//     });
// };
export const updateThreadNotificationStatusForUser = (threadId: string, userId: string, value: boolean): Promise<Object> => {
  return dbUtil.tryCallAsync(
    "updateThreadNotificationStatusForUser",
    { threadId, userId, value },
    () => {
      return db
        .collection('usersThreads')
        .find({ userId: userId, threadId: threadId })
        .toArray()
        .then(results => {
          // if no record exists, the user is trying to mute a thread they
          // aren't a member of - e.g. someone mentioned them in a thread
          // so create a record
          if (!results || results.length === 0) {
            return dbUtil.insert(db, 
              'usersThreads',
              {
                createdAt: new Date(),
                userId,
                threadId,
                isParticipant: false,
                receiveNotifications: value,
              }
            )
          }

          const record = results[0];
          return dbUtil
            .updateOne(
              'usersThreads',
              { 
                id: record.id
              },
              {
                $set: {
                  receiveNotifications: value,
                }
              }
            )
        });
    },
    null
  )
};

// when a thread is deleted, we make sure all relationships to that thread have notifications turned off
// prettier-ignore
// export const turnOffAllThreadNotifications = (threadId: string): Promise<Object> => {
//   return db
//     .table('usersThreads')
//     .getAll(threadId, { index: 'threadId' })
//     .update({
//       receiveNotifications: false,
//     })
//     .run();
// };
export const turnOffAllThreadNotifications = (threadId: string): Promise<Object> => {
  return dbUtil.tryCallAsync(
    "turnOffAllThreadNotifications",
    { threadId },
    () => {
      return dbUtil
        .updateMany(
          'usersThreads',
          { 
            threadId: threadId 
          },
          {
            $set: {
              receiveNotifications: false,
            }
          }
        )
    },
    null
  )
};

// export const disableAllThreadNotificationsForUser = (userId: string) => {
//   return db
//     .table('usersThreads')
//     .getAll(userId, { index: 'userId' })
//     .update({
//       receiveNotifications: false,
//     })
//     .run();
// };
export const disableAllThreadNotificationsForUser = (userId: string) => {
  return dbUtil.tryCallAsync(
    'disableAllThreadNotificationsForUser',
    { userId },
    () => {
      return dbUtil.updateMany(
        db,
        'usersThreads',
        {
          userId: userId,
        },
        {
          $set: {
            receiveNotifications: false,
          },
        }
      );
    },
    null
  );
};
