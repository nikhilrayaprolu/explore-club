// @flow
const debug = require('debug')('api:subscriptions:notification');
const {
  listenToNewNotifications,
  listenToNewDirectMessageNotifications,
} = require('../models/notification');
import asyncify from '../utils/asyncify';
import UserError from '../utils/UserError';
import Raven from 'shared/raven';
import type { GraphQLContext } from '../';
import type { GraphQLResolveInfo } from 'graphql';
const dbUtil = require('shared/dbUtil');

const addNotificationListener = asyncify(listenToNewNotifications);
const addDMNotificationListener = asyncify(
  listenToNewDirectMessageNotifications
);

module.exports = {
  Subscription: {
    notificationAdded: {
      resolve: (notification: any) => notification,
      subscribe: async (
        _: any,
        { thread }: { thread: string },
        { user }: GraphQLContext,
        info: GraphQLResolveInfo
      ) => {
        console.log('[subscriptions/community] subscribe:', communityIds, user);

        if (!user || !user.id)
          return new UserError(
            'Can only listen to notifications when signed in.'
          );

        debug(`@${user.username || user.id} listening to notifications`);
        // return addNotificationListener({
        //   filter: notification =>
        //     notification && notification.userId === user.id,
        //   onError: err => {
        //     // Don't crash the whole API server on error in the listener
        //     console.error(err);
        //     Raven.captureException(err);
        //   },
        // });
        dbUtil.pubsub.asyncIterator('NOTIFICATION_ADDED');
      },
    },
    dmNotificationAdded: {
      resolve: (notification: any) => notification,
      subscribe: async (
        _: any,
        { thread }: { thread: string },
        { user }: GraphQLContext,
        info: GraphQLResolveInfo
      ) => {
        if (!user || !user.id)
          return new UserError(
            'Can only listen to notifications when signed in.'
          );

        debug(`@${user.username || user.id} listening to DM notifications`);
        // return addDMNotificationListener({
        //   filter: notification =>
        //     notification && notification.userId === user.id,
        //   onError: err => {
        //     // Don't crash the whole API server on error in the listener
        //     console.error(err);
        //     Raven.captureException(err);
        //   },
        // });
        return dbUtil.pubsub.asyncIterator('NOTIFICATION_ADDED');
      },
    },
  },
};
