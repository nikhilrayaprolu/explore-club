// @flow
const { db, createReadQuery, createWriteQuery } = require('shared/db');
import type { DBNotification } from 'shared/types';
import dbUtil from 'shared/dbUtil';
/*
===========================================================

    MODIFYING AND CREATING DATA IN USERSNOTIFICATIONS

===========================================================
*/

// export const markSingleNotificationSeen = createWriteQuery(
//   (notificationId: string, userId: string) => ({
//     query: db
//       .table('usersNotifications')
//       .getAll([userId, notificationId], { index: 'userIdAndNotificationId' })
//       .update({
//         isSeen: true,
//       })
//       .run()
//       .then(() => {
//         return true;
//       })
//       .catch(err => false),
//     invalidateTags: () => [notificationId, userId],
//   })
// );
export const markSingleNotificationSeen = createWriteQuery(
  (notificationId: string, userId: string) => ({
    query: dbUtil.tryCallAsync(
      '[Shared] markSingleNotificationSeen',
      { notificationId, userId },
      () => {
        return dbUtil
          .updateMany(
            db,
            'usersNotifications',
            {
              userId: userId,
              notificationId: notificationId,
            },
            {
              $set: {
                isSeen: true,
              },
            }
          )
          .catch(err => false);
      },
      false
    ),
    invalidateTags: () => [notificationId, userId],
  })
);

// export const markNotificationsSeen = createWriteQuery(
//   (userId: string, notifications: Array<string>) => ({
//     query: db
//       .table('usersNotifications')
//       .getAll(...notifications.map(nId => [userId, nId]), {
//         index: 'userIdAndNotificationId',
//       })
//       .update({
//         isSeen: true,
//       })
//       .run()
//       .then(() => {
//         return true;
//       }),
//     invalidateTags: () => [userId, ...notifications],
//   })
// );
export const markNotificationsSeen = createWriteQuery(
  (userId: string, notifications: Array<string>) => ({
    query: dbUtil.tryCallAsync(
      '[Shared] markNotificationsSeen',
      { userId, notifications },
      () => {
        return dbUtil
          .updateMany(
            db,
            'usersNotifications',
            {
              userId: userId,
              notificationId: {
                $in: notifications,
              },
            },
            {
              $set: {
                isSeen: true,
              },
            }
          )
          .then(() => {
            return true;
          });
      },
      false
    ),
    invalidateTags: () => [userId, ...notifications],
  })
);

// export const markAllNotificationsSeen = createWriteQuery((userId: string) => ({
//   query: db
//     .table('usersNotifications')
//     .getAll([userId, false], { index: 'userIdAndIsSeen' })
//     .eqJoin('notificationId', db.table('notifications'))
//     .without({ left: ['createdAt', 'id'] })
//     .zip()
//     .filter(row => row('context')('type').ne('DIRECT_MESSAGE_THREAD'))
//     .run()
//     .then(notifications =>
//       markNotificationsSeen(
//         userId,
//         notifications
//           .filter(notification => !!notification)
//           .map(notification => notification.id)
//       )
//     )
//     .then(() => true)
//     .catch(err => false),
//   invalidateTags: () => [userId],
// }));
export const markAllNotificationsSeen = createWriteQuery((userId: string) => ({
  query: dbUtil.tryCallAsync(
    '[Shared] markAllNotificationsSeen',
    { userId },
    async () => {
      let ret = await db
        .collection('usersNotifications')
        .find({
          userId: userId,
          isSeen: false,
        })
        .toArray();
      ret = await dbUtil.eqJoin(db, ret, 'notificationId', 'notifications');
      ret = dbUtil.without(ret, {
        left: ['createdAt', 'id'],
      });
      ret = dbUtil.zip(ret);
      ret = ret.filter(row => {
        return row.context.type != 'DIRECT_MESSAGE_THREAD';
      });
      ret = dbUtil
        .then(ret, notifications => {
          return markNotificationsSeen(
            userId,
            notifications
              .filter(notification => !!notification)
              .map(notification => notification.id)
          );
        })
        .then(() => true)
        .catch(err => false);
      return ret;
    },
    false
  ),
  invalidateTags: () => [userId],
}));

// export const markDirectMessageNotificationsSeen = createWriteQuery(
//   (userId: string) => ({
//     query: db
//       .table('usersNotifications')
//       .getAll([userId, false], { index: 'userIdAndIsSeen' })
//       .eqJoin('notificationId', db.table('notifications'))
//       .without({ left: ['createdAt', 'id'] })
//       .zip()
//       .filter(row => row('context')('type').eq('DIRECT_MESSAGE_THREAD'))
//       .run()
//       .then(notifications =>
//         markNotificationsSeen(
//           userId,
//           notifications
//             .filter(notification => !!notification)
//             .map(notification => notification.id)
//         )
//       )
//       .then(() => true)
//       .catch(err => false),
//     invalidateTags: () => [userId],
//   })
// );
export const markDirectMessageNotificationsSeen = createWriteQuery(
  (userId: string) => ({
    query: dbUtil.tryCallAsync(
      '[Shared] markDirectMessageNotificationsSeen',
      { userId },
      async () => {
        let ret = await db
          .collection('usersNotifications')
          .find({ userId: userId, isSeen: false })
          .toArray();
        ret = await dbUtil.eqJoin(db, ret, 'notificationId', 'notifications');
        ret = dbUtil.without(ret, {
          left: ['createdAt', 'id'],
        });
        ret = dbUtil.zip(ret);
        ret = ret.filter(row => {
          return row.context.type == 'DIRECT_MESSAGE_THREAD';
        });
        ret = dbUtil
          .then(ret, notifications =>
            markNotificationsSeen(
              userId,
              notifications
                .filter(notification => !!notification)
                .map(notification => notification.id)
            )
          )
          .then(() => true)
          .catch(err => false);
        return ret;
      },
      false
    ),
    invalidateTags: () => [userId],
  })
);

// export const storeUsersNotifications = createWriteQuery(
//   (notificationId: string, userId: string) => ({
//     query: db
//       .table('usersNotifications')
//       .insert({
//         createdAt: new Date(),
//         entityAddedAt: new Date(),
//         notificationId,
//         userId,
//         isSeen: false,
//         isRead: false,
//       })
//       .run()
//       .then(res => {
//         return res;
//       }),
//     invalidateTags: () => [userId, notificationId],
//   })
// );
export const storeUsersNotifications = createWriteQuery(
  (notificationId: string, userId: string) => ({
    query: dbUtil.tryCallAsync(
      '[Shared] storeUsersNotifications',
      { notificationId, userId },
      () => {
        return dbUtil
          .insert(db, 'usersNotifications', {
            createdAt: new Date(),
            entityAddedAt: new Date(),
            notificationId,
            userId,
            isSeen: false,
            isRead: false,
          })
          .then(res => {
            return res[0];
          })
          .then(result => {
            dbUtil.pubsub.publish('NOTIFICATION_ADDED', result);
            return result;
          });
      },
      null
    ),
    invalidateTags: () => [userId, notificationId],
  })
);

// export const markUsersNotificationsAsNew = createWriteQuery(
//   (notificationId: string, userId: string) => ({
//     query: db
//       .table('usersNotifications')
//       .getAll([userId, notificationId], { index: 'userIdAndNotificationId' })
//       .run()
//       .then(result => {
//         /*
// 				If a user becomes a new participant on the notification before the time buffer runs out, we need to ensure that we include them in setting a notification.

// 				So in this section we check to see if an existing usersNotifications row exists, otherwise we create a new one. All users passed into this function should return an updated or new usersNotifications record.
// 			*/
//         if (result && result.length > 0) {
//           return db
//             .table('usersNotifications')
//             .getAll([userId, notificationId], {
//               index: 'userIdAndNotificationId',
//             })
//             .update({
//               isRead: false,
//               isSeen: false,
//               entityAddedAt: new Date(),
//             })
//             .run();
//         } else {
//           return storeUsersNotifications(notificationId, userId);
//         }
//       }),
//     invalidateTags: () => [notificationId, userId],
//   })
// );
export const markUsersNotificationsAsNew = createWriteQuery(
  (notificationId: string, userId: string) => ({
    query: dbUtil.tryCallAsync(
      '[Shared] markUsersNotificationsAsNew',
      { notificationId, userId },
      () => {
        return db
          .collection('usersNotifications')
          .find({
            userId: userId,
            notificationId: notificationId,
          })
          .toArray()
          .then(result => {
            /*
				If a user becomes a new participant on the notification before the time buffer runs out, we need to ensure that we include them in setting a notification.

				So in this section we check to see if an existing usersNotifications row exists, otherwise we create a new one. All users passed into this function should return an updated or new usersNotifications record.
			*/
            if (result && result.length > 0) {
              return dbUtil.updateMany(
                db,
                'usersNotifications',
                {
                  userId: userId,
                  notificationId: notificationId,
                },
                {
                  $set: {
                    isRead: false,
                    isSeen: false,
                    entityAddedAt: new Date(),
                  },
                }
              );
            } else {
              return storeUsersNotifications(notificationId, userId);
            }
          });
      },
      null
    ),
    invalidateTags: () => [notificationId, userId],
  })
);

/*
===========================================================

        GETTING DATA FROM USERS NOTIFICATIONS

===========================================================
*/

// export const getUsersNotifications = createReadQuery((userId: string) => ({
//   query: db
//     .table('usersNotifications')
//     .getAll(userId, { index: 'userId' })
//     .eqJoin('notificationId', db.table('notifications'))
//     .without({ left: ['createdAt', 'id'] })
//     .zip(),
//   tags: (notifications: Array<DBNotification>) => [
//     userId,
//     ...notifications.map(n => n.id),
//   ],
// }));
export const getUsersNotifications = createReadQuery((userId: string) => ({
  query: dbUtil.tryCallAsync(
    '[Shared] getUsersNotifications',
    { userId },
    async () => {
      let ret = await db
        .collection('usersNotifications')
        .find({ userId: userId })
        .toArray();
      ret = await dbUtil.eqJoin(db, ret, 'notificationId', 'notifications');
      ret = dbUtil.without(ret, { left: ['createdAt', 'id'] });
      ret = dbUtil.zip(ret);
      return ret;
    },
    []
  ),
  tags: (notifications: Array<DBNotification>) => [
    userId,
    ...notifications.map(n => n.id),
  ],
}));
