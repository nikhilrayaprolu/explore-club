// @flow
const { db } = require('shared/db');
import type { NotificationEventType, DBNotification } from 'shared/types';
import { TIME_BUFFER } from '../queues/constants';
import { NEW_DOCUMENTS } from 'api/models/utils';
const dbUtil = require('shared/dbUtil');

/*
	Given an event type, the context of that event, and a time range, see if an existing notification exists. If it does, we will bundle the new incoming notification on the server. If no existing notification is found, we create a new one
*/
// export const checkForExistingNotification = (
//   event: NotificationEventType,
//   contextId: string
// ): Promise<?DBNotification> => {
//   const now = new Date();
//   const then = new Date(now.getTime() - TIME_BUFFER);
//   return db
//     .table('notifications')
//     .getAll(contextId, { index: 'contextId' })
//     .filter(notification =>
//       notification('event')
//         .eq(event)
//         .and(
//           notification('modifiedAt').during(
//             db.ISO8601(then.toISOString()),
//             db.now()
//           )
//         )
//     )
//     .run()
//     .then(notifications => {
//       if (!notifications || notifications.length === 0) return null;
//       return notifications[0];
//     })
//     .catch(err => {
//       console.error(err);
//       return null;
//     });
// };
export const checkForExistingNotification = (
  event: NotificationEventType,
  contextId: string
): Promise<?DBNotification> => {
  return dbUtil.tryCallAsync(
    'checkForExistingNotification',
    { event, contextId },
    () => {
      const now = new Date();
      const then = new Date(now.getTime() - TIME_BUFFER);
      return db
        .collection('notifications')
        .find({
          contextId: contextId,
          event: event,
          modifiedAt: { $gte: then, $lte: now },
        })
        .toArray()
        .then(notifications => {
          if (!notifications || notifications.length === 0) return null;
          return notifications[0];
        })
        .catch(err => {
          console.error(err);
          return null;
        });
    },
    null
  );
};

// export const storeNotification = (
//   notification: Object
// ): Promise<DBNotification> => {
//   return db
//     .table('notifications')
//     .insert(
//       {
//         ...notification,
//         createdAt: new Date(),
//         modifiedAt: new Date(),
//       },
//       { returnChanges: true }
//     )
//     .run()
//     .then(result => result.changes[0].new_val);
// };
export const storeNotification = (
  notification: Object
): Promise<DBNotification> => {
  return dbUtil.tryCallAsync(
    'storeNotification',
    { notification },
    () => {
      return dbUtil
        .insert(db, 'notifications', {
          ...notification,
          createdAt: new Date(),
          modifiedAt: new Date(),
        })
        .then(result => {
          return result[0];
        });
    },
    null
  );
};

// export const updateNotification = (
//   notification: Object
// ): Promise<DBNotification> => {
//   return db
//     .table('notifications')
//     .get(notification.id)
//     .update(
//       {
//         ...notification,
//         modifiedAt: new Date(),
//       },
//       { returnChanges: true }
//     )
//     .run()
//     .then(result => result.changes[0].new_val);
// };
export const updateNotification = (
  notification: Object
): Promise<DBNotification> => {
  return dbUtil.tryCallAsync(
    'updateNotification',
    { notification },
    () => {
      return dbUtil
        .updateOne(
          db,
          'notifications',
          { id: notification.id },
          {
            $set: dbUtil.flattenSafe({
              ...notification,
              modifiedAt: new Date(),
            }),
          }
        )
        .then(result => {
          return result[0];
        });
    },
    null
  );
};

// export const getNotifications = (notificationIds: Array<string>) => {
//   return db
//     .table('notifications')
//     .getAll(...notificationIds)
//     .eqJoin('id', db.table('usersNotifications'), { index: 'notificationId' })
//     .without({ right: ['id'] })
//     .zip()
//     .run();
// };
export const getNotifications = async (notificationIds: Array<string>) => {
  return dbUtil.tryCallAsync(
    'getNotifications',
    { notificationIds },
    () => {
      return db.collection('notifications').find({
        id: {
          $in: notificationIds,
        },
      });
    },
    []
  );
};

// export const getNotification = (
//   notificationId: string
// ): Promise<DBNotification> => {
//   return db
//     .table('notifications')
//     .get(notificationId)
//     .run();
// };
export const getNotification = (
  notificationId: string
): Promise<DBNotification> => {
  return dbUtil.tryCallAsync(
    'getNotification',
    { notificationId },
    () => {
      return db.collection('notifications').findOne({ id: notificationId });
    },
    null
  );
};

// const hasChanged = (field: string) =>
//   db
//     .row('old_val')(field)
//     .ne(db.row('new_val')(field));

// const MODIFIED_AT_CHANGED = hasChanged('entityAddedAt');

// export const listenToNewNotifications = (cb: Function): Function => {
//   return db
//     .table('usersNotifications')
//     .changes({
//       includeInitial: false,
//     })
//     .filter(NEW_DOCUMENTS.or(MODIFIED_AT_CHANGED))('new_val')
//     .eqJoin('notificationId', db.table('notifications'))
//     .without({
//       left: ['notificationId', 'createdAt', 'id', 'entityAddedAt'],
//     })
//     .zip()
//     .filter(row => row('context')('type').ne('DIRECT_MESSAGE_THREAD'))
//     .run({ cursor: true }, (err, cursor) => {
//       if (err) throw err;
//       cursor.each((err, data) => {
//         if (err) throw err;
//         // For some reason this can be called without data, in which case
//         // we don't want to call the callback with it obviously
//         if (!data) return;
//         // Call the passed callback with the notification
//         cb(data);
//       });
//     });
// };
export const listenToNewNotifications = (cb: Function): Function => {
  console.log('listenToNewNotifications called');
};

// export const listenToNewDirectMessageNotifications = (
//   cb: Function
// ): Function => {
//   return db
//     .table('usersNotifications')
//     .changes({
//       includeInitial: false,
//     })
//     .filter(NEW_DOCUMENTS.or(MODIFIED_AT_CHANGED))('new_val')
//     .eqJoin('notificationId', db.table('notifications'))
//     .without({
//       left: ['notificationId', 'createdAt', 'id', 'entityAddedAt'],
//     })
//     .zip()
//     .filter(row => row('context')('type').eq('DIRECT_MESSAGE_THREAD'))
//     .run({ cursor: true }, (err, cursor) => {
//       if (err) throw err;
//       cursor.each((err, data) => {
//         if (err) throw err;
//         // Call the passed callback with the notification
//         cb(data);
//       });
//     });
// };
export const listenToNewDirectMessageNotifications = (
  cb: Function
): Function => {
  console.log('listenToNewDirectMessageNotifications called');
};
