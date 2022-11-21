const { db } = require('shared/db');
import type { DBUserSettings } from 'shared/types';
const dbUtil = require('shared/dbUtil');

// export const createNewUsersSettings = (
//   userId: string
// ): Promise<DBUserSettings> => {
//   return db
//     .table('usersSettings')
//     .insert(
//       {
//         userId,
//         notifications: {
//           types: {
//             newMessageInThreads: {
//               email: true,
//             },
//             newMention: {
//               email: true,
//             },
//             newDirectMessage: {
//               email: true,
//             },
//             newThreadCreated: {
//               email: true,
//             },
//             dailyDigest: {
//               email: true,
//             },
//             weeklyDigest: {
//               email: true,
//             },
//           },
//         },
//       },
//       { returnChanges: 'always' }
//     )
//     .run()
//     .then(res => res.changes[0].new_val);
// };
export const createNewUsersSettings = (
  userId: string
): Promise<DBUserSettings> => {
  return dbUtil.tryCallAsync(
    'createNewUsersSettings',
    { userId },
    () => {
      return dbUtil
        .insert(db, 'usersSettings', {
          userId,
          notifications: {
            types: {
              newMessageInThreads: {
                email: true,
              },
              newMention: {
                email: true,
              },
              newDirectMessage: {
                email: true,
              },
              newThreadCreated: {
                email: true,
              },
              dailyDigest: {
                email: true,
              },
              weeklyDigest: {
                email: true,
              },
            },
          },
        })
        .then(res => {
          return res[0];
        });
    },
    null
  );
};

// export const getUsersSettings = (userId: string): Promise<Object> => {
//   return db
//     .table('usersSettings')
//     .getAll(userId, { index: 'userId' })
//     .run()
//     .then(results => {
//       if (results && results.length > 0) {
//         // if the user already has a relationship with the thread we don't need to do anything, return
//         return results[0];
//       } else {
//         return null;
//       }
//     });
// };
export const getUsersSettings = (userId: string): Promise<Object> => {
  return dbUtil.tryCallAsync(
    'getUsersSettings',
    { userId },
    () => {
      return db
        .collection('usersSettings')
        .find({ userId: userId })
        .toArray()
        .then(results => {
          if (results && results.length > 0) {
            // if the user already has a relationship with the thread we don't need to do anything, return
            return results[0];
          } else {
            return null;
          }
        });
    },
    null
  );
};

// prettier-ignore
// export const updateUsersNotificationSettings = (userId: string, settings: object, type: string, method: string, enabled: string): Promise<Object> => {
//   return db
//     .table('usersSettings')
//     .getAll(userId, { index: 'userId' })
//     .update({
//       ...settings,
//     })
//     .run();
// };
export const updateUsersNotificationSettings = (userId: string, settings: object, type: string, method: string, enabled: string): Promise<Object> => {
  return dbUtil.tryCallAsync(
    "updateUsersNotificationSettings",
    { userId, settings, type, method, enabled },
    () => {
      return dbUtil
        .updateMany(
          'usersSettings',
          { 
            userId: userId 
          },
          {
            $set: dbUtil.flattenSafe(settings)
          }
        )
    },
    null
  )
};

// prettier-ignore
// export const unsubscribeUserFromEmailNotification = (userId: string, type: object): Promise<Object> => {
//   const obj = { notifications: { types: {} } };
//   obj['notifications']['types'][type] = { email: false };

//   return db
//     .table('usersSettings')
//     .getAll(userId, { index: 'userId' })
//     .update({ ...obj })
//     .run();
// };
export const unsubscribeUserFromEmailNotification = (userId: string, type: object): Promise<Object> => {
  return dbUtil.tryCallAsync(
    "unsubscribeUserFromEmailNotification",
    { userId, type },
    () => {
      const obj = { notifications: { types: {} } };
      obj['notifications']['types'][type] = { email: false };

      return dbUtil
        .updateMany(
          'usersSettings',
          { 
            userId: userId 
          }, 
          {
            $set: dbUtil.flattenSafe(obj)
          }
        )
    },
    null
  )
};

// export const disableAllUsersEmailSettings = (userId: string) => {
//   return db
//     .table('usersSettings')
//     .getAll(userId, { index: 'userId' })
//     .update({
//       notifications: {
//         types: {
//           dailyDigest: {
//             email: false,
//           },
//           newDirectMessage: {
//             email: false,
//           },
//           newMention: {
//             email: false,
//           },
//           newMessageInThreads: {
//             email: false,
//           },
//           newThreadCreated: {
//             email: false,
//           },
//           weeklyDigest: {
//             email: false,
//           },
//         },
//       },
//     })
//     .run();
// };
export const disableAllUsersEmailSettings = (userId: string) => {
  return dbUtil.tryCallAsync(
    'disableAllUsersEmailSettings',
    { userId },
    () => {
      return dbUtil.updateMany(
        db,
        'usersSettings',
        {
          userId: userId,
        },
        {
          $set: dbUtil.flattenSafe({
            notifications: {
              types: {
                dailyDigest: {
                  email: false,
                },
                newDirectMessage: {
                  email: false,
                },
                newMention: {
                  email: false,
                },
                newMessageInThreads: {
                  email: false,
                },
                newThreadCreated: {
                  email: false,
                },
                weeklyDigest: {
                  email: false,
                },
              },
            },
          }),
        }
      );
    },
    null
  );
};
