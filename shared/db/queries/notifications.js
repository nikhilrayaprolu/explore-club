// @flow
import { db } from 'shared/db';
import type { DBNotification } from 'shared/types';
import dbUtil from 'shared/dbUtil';

// prettier-ignore
// export const getNotification = (notificationId: string): Promise<?DBNotification> => {
//   return db
//     .table('notifications')
//     .get(notificationId)
//     .run();
// };
export const getNotification = (notificationId: string): Promise<?DBNotification> => {
  return dbUtil
    .tryCallAsync(
      '[Shared] getNotification', 
      () => {
        return db
        .collection('notifications')
        .findOne({ id: notificationId })
      }, 
      null
    )
};
