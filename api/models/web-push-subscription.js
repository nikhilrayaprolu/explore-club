// @flow
const debug = require('debug')('api:models:webPushSubscription');
const { db } = require('shared/db');
import type { WebPushSubscription } from '../mutations/user';
const dbUtil = require('shared/dbUtil');

// prettier-ignore
// export const storeSubscription = (subscription: WebPushSubscription, userId: string) => {
//   debug(
//     `store subscription for user#${userId}, endpoint ${subscription.endpoint}`
//   );
//   return db
//     .table('webPushSubscriptions')
//     .insert({
//       ...subscription,
//       userId,
//     })
//     .run();
// };
export const storeSubscription = (subscription: WebPushSubscription, userId: string) => {
  return dbUtil.tryCallAsync(
    "storeSubscription",
    { subscription, userId },
    () => {
      debug(
        `store subscription for user#${userId}, endpoint ${subscription.endpoint}`
      );
      return dbUtil
        .insert(
          db,
          'webPushSubscriptions',
          {
            ...subscription,
            userId,
          }
        )
    },
    null
  )
};

// export const getSubscriptions = (userId: string) => {
//   debug(`get subscriptions for user#${userId}`);
//   return db
//     .table('webPushSubscriptions')
//     .getAll(userId, { index: 'userId' })
//     .run();
// };
export const getSubscriptions = (userId: string) => {
  return dbUtil.tryCallAsync(
    'getSubscriptions',
    { userId },
    () => {
      debug(`get subscriptions for user#${userId}`);
      return db
        .collection('webPushSubscriptions')
        .find({ userId: userId })
        .toArray();
    },
    []
  );
};

// export const removeSubscription = (endpoint: string) => {
//   debug(`remove subscription ${endpoint}`);
//   return db
//     .table('webPushSubscriptions')
//     .getAll(endpoint, { index: 'endpoint' })
//     .delete()
//     .run();
// };
export const removeSubscription = (endpoint: string) => {
  return dbUtil.tryCallAsync(
    'removeSubscription',
    { endpoint },
    () => {
      debug(`remove subscription ${endpoint}`);
      return db
        .collection('webPushSubscriptions')
        .deleteMany({ endpoint: endpoint });
    },
    null
  );
};
