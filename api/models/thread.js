// @flow
const { db } = require('shared/db');
import intersection from 'lodash.intersection';
import { processReputationEventQueue, searchQueue } from 'shared/bull/queues';
const { parseRange, NEW_DOCUMENTS } = require('./utils');
import { createChangefeed } from 'shared/changefeed-utils';
import { deleteMessagesInThread } from '../models/message';
import { turnOffAllThreadNotifications } from '../models/usersThreads';
import type { PaginationOptions } from '../utils/paginate-arrays';
import type { DBThread, FileUpload } from 'shared/types';
import type { Timeframe } from './utils';
const dbUtil = require('shared/dbUtil');

const NOT_WATERCOOLER = thread =>
  db.not(thread.hasFields('watercooler')).or(thread('watercooler').eq(false));

// export const getThread = (threadId: string): Promise<DBThread> => {
//   return db
//     .table('threads')
//     .get(threadId)
//     .run();
// };
export const getThread = (threadId: string): Promise<DBThread> => {
  return dbUtil.tryCallAsync(
    'getThread',
    { threadId },
    () => {
      return db.collection('threads').findOne({ id: threadId });
    },
    null
  );
};

// prettier-ignore
// export const getThreads = (threadIds: Array<string>): Promise<Array<DBThread>> => {
//   return db
//     .table('threads')
//     .getAll(...threadIds)
//     .filter(thread => db.not(thread.hasFields('deletedAt')))
//     .run();
// };
export const getThreads = (threadIds: Array<string>): Promise<Array<DBThread>> => {
  return dbUtil.tryCallAsync(
    "getThreads",
    { threadIds },
    () => {
      return db
        .collection('threads')
        .find({ id: { $in: threadIds }, deletedAt: null })
        .toArray();
    },
    []
  )
};

// export const getThreadById = (threadId: string): Promise<?DBThread> => {
//   return db
//     .table('threads')
//     .getAll(threadId)
//     .filter(thread => db.not(thread.hasFields('deletedAt')))
//     .run()
//     .then(results => {
//       if (!results || results.length === 0) return null;
//       return results[0];
//     });
// };
export const getThreadById = (threadId: string): Promise<?DBThread> => {
  return dbUtil.tryCallAsync(
    'getThreadById',
    { threadId },
    () => {
      return db
        .collection('threads')
        .find({ id: threadId, deletedAt: null })
        .toArray()
        .then(results => {
          if (!results || results.length === 0) return null;
          return results[0];
        });
    },
    null
  );
};

// this is used to get all threads that need to be marked as deleted whenever a channel is deleted
// export const getThreadsByChannelToDelete = (channelId: string) => {
//   return db
//     .table('threads')
//     .getAll(channelId, { index: 'channelId' })
//     .filter(thread => db.not(thread.hasFields('deletedAt')))
//     .run();
// };
export const getThreadsByChannelToDelete = (channelId: string) => {
  return dbUtil.tryCallAsync(
    'getThreadsByChannelToDelete',
    { channelId },
    () => {
      return db
        .collection('threads')
        .find({ channelId: channelId, deletedAt: null })
        .toArray();
    },
    []
  );
};

// prettier-ignore
// export const getThreadsByChannel = (channelId: string, options: PaginationOptions): Promise<Array<DBThread>> => {
//   const { first, after } = options

//   return db
//     .table('threads')
//     .between(
//       [channelId, db.minval],
//       [channelId, after ? new Date(after) : db.maxval],
//       {
//         index: 'channelIdAndLastActive',
//         leftBound: 'open',
//         rightBound: 'open',
//       }
//     )
//     .orderBy({ index: db.desc('channelIdAndLastActive') })
//     .filter(thread => db.not(thread.hasFields('deletedAt')))
//     .limit(first)
//     .run();
// };
export const getThreadsByChannel = (channelId: string, options: PaginationOptions): Promise<Array<DBThread>> => {
  return dbUtil.tryCallAsync(
    "getThreadsByChannel",
    { channelId, options },
    () => {
      const { first, after } = options

      return db
        .collection('threads')
        .find({ 
          channelId: channelId, 
          lastActive: { $lt: after ? new Date(after) : new Date() },
          deletedAt: null
        })
        .sort({ channelId: -1, lastActive: -1 })
        .limit(first)
    },
    []
  )
  
};

// prettier-ignore
type GetThreadsByChannelPaginationOptions = {
  first: number,
  after: number,
  sort: 'latest' | 'trending'
};

// export const getThreadsByChannels = (
//   channelIds: Array<string>,
//   options: GetThreadsByChannelPaginationOptions
// ): Promise<Array<DBThread>> => {
//   const { first, after, sort = 'latest' } = options;

//   let order = [db.desc('lastActive'), db.desc('createdAt')];
//   // If we want the top threads, first sort by the score and then lastActive
//   if (sort === 'trending') order.unshift(db.desc('score'));

//   return db
//     .table('threads')
//     .getAll(...channelIds, { index: 'channelId' })
//     .filter(thread =>
//       db.not(thread.hasFields('deletedAt')).and(NOT_WATERCOOLER(thread))
//     )
//     .orderBy(...order)
//     .skip(after || 0)
//     .limit(first || 999999)
//     .run();
// };
export const getThreadsByChannels = async (
  channelIds: Array<string>,
  options: GetThreadsByChannelPaginationOptions
): Promise<Array<DBThread>> => {
  const { first, after, sort = 'latest' } = options;

  let order = { lastActive: -1, createdAt: -1 };
  // If we want the top threads, first sort by the score and then lastActive
  if (sort === 'trending') order = { score: -1, lastActive: -1, createdAt: -1 };

  return dbUtil.tryCallAsync(
    'getThreadsByChannels',
    { channelIds, options },
    () => {
      return db
        .collection('threads')
        .find({
          channelId: { $in: channelIds },
          deletedAt: null,
          watercooler: null,
        })
        .sort(order)
        .skip(after || 0)
        .limit(first || 999999)
        .toArray();
    },
    []
  );
};

// prettier-ignore
// export const getThreadsByCommunity = (communityId: string): Promise<Array<DBThread>> => {
//   return db
//     .table('threads')
//     .between([communityId, db.minval], [communityId, db.maxval], {
//       index: 'communityIdAndLastActive',
//       leftBound: 'open',
//       rightBound: 'open',
//     })
//     .orderBy({ index: db.desc('communityIdAndLastActive') })
//     .filter(thread => db.not(thread.hasFields('deletedAt')).and(NOT_WATERCOOLER(thread)))
//     .run();
// };
export const getThreadsByCommunity = async (communityId: string): Promise<Array<DBThread>> => {
  return dbUtil.tryCallAsync(
    "getThreadsByCommunity",
    { communityId },
    () => {
      db
        .collection('threads')
        .find({ 
          communityId: communityId, 
          lastActive: {
            $gte: dbUtil.minDate(),
            $lte: dbUtil.maxDate()
          },
          watercooler: null
        })
        .sort({ communityId: -1, lastActive: -1 })
        .toArray()
    },
    []
  )
};

// prettier-ignore
// export const getThreadsByCommunityInTimeframe = (communityId: string, range: Timeframe): Promise<Array<Object>> => {
//   const { current } = parseRange(range);
//   return db
//     .table('threads')
//     .getAll(communityId, { index: 'communityId' })
//     .filter(db.row('createdAt').during(db.now().sub(current), db.now()))
//     .filter(thread => db.not(thread.hasFields('deletedAt')).and(NOT_WATERCOOLER(thread)))
//     .run();
// };
export const getThreadsByCommunityInTimeframe = (communityId: string, range: Timeframe): Promise<Array<Object>> => {
  return dbUtil.tryCallAsync(
    "getThreadsByCommunityInTimeframe",
    { communityId, range },
    () => {
      const { current } = parseRange(range);
      return db
        .collection('threads')
        .find({ 
          communityId: communityId,
          createdAt: { $gt: new Date() - current, $lt: new Date() },
          watercooler: { $in: [null, false] }
        })
        .toArray()
    },
    []
  )
};

// prettier-ignore
// export const getThreadsInTimeframe = (range: Timeframe): Promise<Array<Object>> => {
//   const { current } = parseRange(range);
//   return db
//     .table('threads')
//     .filter(db.row('createdAt').during(db.now().sub(current), db.now()))
//     .filter(thread => db.not(thread.hasFields('deletedAt')))
//     .run();
// };
export const getThreadsInTimeframe = (range: Timeframe): Promise<Array<Object>> => {
  return dbUtil.tryCallAsync(
    "getThreadsInTimeframe",
    { range },
    () => {
      const { current } = parseRange(range);
      return db
        .collection('threads')
        .find({
          createdAt: { $gt: new Date() - current, $lt: new Date() },
          deletedAt: null
        })
        .toArray()
    },
    []
  )
};

// We do not filter by deleted threads intentionally to prevent users from spam
// creating/deleting threads
// prettier-ignore
// export const getThreadsByUserAsSpamCheck = (userId: string, timeframe: number = 60 * 10): Promise<Array<?DBThread>> => {
//   return db
//     .table('threads')
//     .getAll(userId, { index: 'creatorId' })
//     .filter(db.row('createdAt').during(db.now().sub(timeframe), db.now()))
//     .run();
// };
export const getThreadsByUserAsSpamCheck = (userId: string, timeframe: number = 60 * 10): Promise<Array<?DBThread>> => {
  return dbUtil.tryCallAsync(
    "[API] [thread] getThreadsByUserAsSpamCheck",
    { userId, timeframe },
    () => {
      return db
      .collection('threads')
      .find({ 
        creatorId: userId,
        createdAt: { $gt: new Date() - timeframe, $lt: new Date() }
       })
      .toArray();
    },
    []
  )
  
};

/*
  When viewing a user profile we have to take two arguments into account:
  1. The user who is being viewed
  2. The user who is doing the viewing

  We need to return only threads that meet the following criteria:
  1. The thread was posted to a public channel
  2. The thread was posted to a private channel and the viewing user is a member
*/
// export const getViewableThreadsByUser = async (
//   evalUser: string,
//   currentUser: string,
//   options: PaginationOptions
// ): Promise<Array<DBThread>> => {
//   const { first, after } = options;
//   // get a list of the channelIds the current user is allowed to see threads
//   const getCurrentUsersChannelIds = db
//     .table('usersChannels')
//     .getAll(
//       [currentUser, 'member'],
//       [currentUser, 'moderator'],
//       [currentUser, 'owner'],
//       {
//         index: 'userIdAndRole',
//       }
//     )
//     .map(userChannel => userChannel('channelId'))
//     .run();

//   const getCurrentUserCommunityIds = db
//     .table('usersCommunities')
//     .getAll([currentUser, true], { index: 'userIdAndIsMember' })
//     .map(userCommunity => userCommunity('communityId'))
//     .run();

//   // get a list of the channels where the user posted a thread
//   const getPublishedChannelIds = db
//     .table('threads')
//     .getAll(evalUser, { index: 'creatorId' })
//     .map(thread => thread('channelId'))
//     .run();

//   const getPublishedCommunityIds = db
//     .table('threads')
//     .getAll(evalUser, { index: 'creatorId' })
//     .map(thread => thread('communityId'))
//     .run();

//   const [
//     currentUsersChannelIds,
//     publishedChannelIds,
//     currentUsersCommunityIds,
//     publishedCommunityIds,
//   ] = await Promise.all([
//     getCurrentUsersChannelIds,
//     getPublishedChannelIds,
//     getCurrentUserCommunityIds,
//     getPublishedCommunityIds,
//   ]);

//   // get a list of all the channels that are public
//   const publicChannelIds = await db
//     .table('channels')
//     .getAll(...publishedChannelIds)
//     .filter({ isPrivate: false })
//     .map(channel => channel('id'))
//     .run();

//   const publicCommunityIds = await db
//     .table('communities')
//     .getAll(...publishedCommunityIds)
//     .filter({ isPrivate: false })
//     .map(community => community('id'))
//     .run();

//   const allIds = [
//     ...currentUsersChannelIds,
//     ...currentUsersCommunityIds,
//     ...publicChannelIds,
//     ...publicCommunityIds,
//   ];
//   const distinctIds = allIds.filter((x, i, a) => a.indexOf(x) === i);
//   let validChannelIds = intersection(distinctIds, publishedChannelIds);
//   let validCommunityIds = intersection(distinctIds, publishedCommunityIds);

//   // takes ~70ms for a heavy load
//   return await db
//     .table('threads')
//     .getAll(evalUser, { index: 'creatorId' })
//     .filter(thread => db.not(thread.hasFields('deletedAt')))
//     .filter(thread => db.expr(validChannelIds).contains(thread('channelId')))
//     .filter(thread =>
//       db.expr(validCommunityIds).contains(thread('communityId'))
//     )
//     .orderBy(db.desc('lastActive'), db.desc('createdAt'))
//     .skip(after || 0)
//     .limit(first)
//     .run()
//     .then(res => {
//       return res;
//     });
// };
export const getViewableThreadsByUser = async (
  evalUser: string,
  currentUser: string,
  options: PaginationOptions
): Promise<Array<DBThread>> => {
  return dbUtil.tryCallAsync(
    'getViewableThreadsByUser',
    { evalUser, currentUser, options },
    async () => {
      const { first, after } = options;
      // get a list of the channelIds the current user is allowed to see threads
      const getCurrentUsersChannelIds = db
        .collection('usersChannels')
        .find({
          userId: currentUser,
          $or: [{ isMember: true }, { isModerator: true }, { isOwner: true }],
        })
        .map(userChannel => {
          return userChannel.channelId;
        })
        .toArray();

      const getCurrentUserCommunityIds = db
        .collection('usersCommunities')
        .find({ userId: currentUser, isMember: true })
        .map(userCommunity => userCommunity.communityId)
        .toArray();

      // get a list of the channels where the user posted a thread
      const getPublishedChannelIds = db
        .collection('threads')
        .find({ creatorId: evalUser })
        .map(thread => thread.channelId)
        .toArray();

      const getPublishedCommunityIds = db
        .collection('threads')
        .find({ creatorId: evalUser })
        .map(thread => thread.communityId)
        .toArray();

      const [
        currentUsersChannelIds,
        publishedChannelIds,
        currentUsersCommunityIds,
        publishedCommunityIds,
      ] = await Promise.all([
        getCurrentUsersChannelIds,
        getPublishedChannelIds,
        getCurrentUserCommunityIds,
        getPublishedCommunityIds,
      ]);

      // get a list of all the channels that are public
      const publicChannelIds = await db
        .collection('channels')
        .find({ id: { $in: publishedChannelIds }, isPrivate: false })
        .map(channel => channel.id)
        .toArray();

      const publicCommunityIds = await db
        .collection('communities')
        .find({ id: { $in: publishedCommunityIds }, isPrivate: false })
        .map(community => community.id)
        .toArray();

      const allIds = [
        ...currentUsersChannelIds,
        ...currentUsersCommunityIds,
        ...publicChannelIds,
        ...publicCommunityIds,
      ];
      const distinctIds = allIds.filter((x, i, a) => a.indexOf(x) === i);
      let validChannelIds = intersection(distinctIds, publishedChannelIds);
      let validCommunityIds = intersection(distinctIds, publishedCommunityIds);

      // takes ~70ms for a heavy load
      return await db
        .collection('threads')
        .find({
          creatorId: evalUser,
          deletedAt: null,
          channelId: { $in: validChannelIds },
          communityId: { $in: validCommunityIds },
        })
        .sort({ lastActive: -1, createdAt: -1 })
        .skip(after || 0)
        .limit(first)
        .toArray();
    },
    []
  );
};

// prettier-ignore
// export const getPublicThreadsByUser = (evalUser: string, options: PaginationOptions): Promise<Array<DBThread>> => {
//   const { first, after } = options
//   return db
//     .table('threads')
//     .getAll(evalUser, { index: 'creatorId' })
//     .filter(thread => db.not(thread.hasFields('deletedAt')))
//     .eqJoin('channelId', db.table('channels'))
//     .filter({ right: { isPrivate: false } })
//     .without('right')
//     .zip()
//     .eqJoin('communityId', db.table('communities'))
//     .filter({ right: { isPrivate: false } })
//     .without('right')
//     .zip()
//     .orderBy(db.desc('lastActive'), db.desc('createdAt'))
//     .skip(after || 0)
//     .limit(first || 10)
//     .run();
// };
export const getPublicThreadsByUser = async (evalUser: string, options: PaginationOptions): Promise<Array<DBThread>> => {
  return dbUtil.tryCallAsync(
    "getPublicThreadsByUser",
    { evalUser, options },
    async () => {
      const { first, after } = options
    
      let ret = await db
        .collection('threads')
        .find({ creatorId: evalUser, deletedAt: null })
        .toArray();
      ret = await dbUtil.eqJoin(db, ret, "channelId", "channels");
      ret = ret.filter(row => {
        return row.right.isPrivate == false
      });
      ret = dbUtil.without("right");
      ret = dbUtil.zip(ret);
      ret = await dbUtil.eqJoin(db, ret, "communityId", "communities");
      ret = ret.filter(row => {
        return row.right.isPrivate == false
      });
      ret = dbUtil.without(ret, "right");
      ret = dbUtil.zip(ret);
      ret = dbUtil.skip(after || 0);
      ret = dbUtil.limit(first || 10);
      return ret;
    },
    []
  )
};

// export const getViewableParticipantThreadsByUser = async (
//   evalUser: string,
//   currentUser: string,
//   options: PaginationOptions
// ): Promise<Array<DBThread>> => {
//   const { first, after } = options;
//   // get a list of the channelIds the current user is allowed to see threads for
//   const getCurrentUsersChannelIds = db
//     .table('usersChannels')
//     .getAll(
//       [currentUser, 'member'],
//       [currentUser, 'moderator'],
//       [currentUser, 'owner'],
//       {
//         index: 'userIdAndRole',
//       }
//     )
//     .map(userChannel => userChannel('channelId'))
//     .run();

//   const getCurrentUserCommunityIds = db
//     .table('usersCommunities')
//     .getAll([currentUser, true], { index: 'userIdAndIsMember' })
//     .map(userCommunity => userCommunity('communityId'))
//     .run();

//   // get a list of the channels where the user participated in a thread
//   const getParticipantChannelIds = db
//     .table('usersThreads')
//     .getAll([evalUser, true], { index: 'userIdAndIsParticipant' })
//     .eqJoin('threadId', db.table('threads'))
//     .zip()
//     .pluck('channelId', 'threadId')
//     .run();

//   const getParticipantCommunityIds = db
//     .table('usersThreads')
//     .getAll([evalUser, true], { index: 'userIdAndIsParticipant' })
//     .eqJoin('threadId', db.table('threads'))
//     .zip()
//     .pluck('communityId', 'threadId')
//     .run();

//   const [
//     currentUsersChannelIds,
//     participantChannelIds,
//     currentUsersCommunityIds,
//     participantCommunityIds,
//   ] = await Promise.all([
//     getCurrentUsersChannelIds,
//     getParticipantChannelIds,
//     getCurrentUserCommunityIds,
//     getParticipantCommunityIds,
//   ]);

//   const participantThreadIds = participantChannelIds.map(c => c && c.threadId);
//   const distinctParticipantChannelIds = participantChannelIds
//     .map(c => c.channelId)
//     .filter((x, i, a) => a.indexOf(x) === i);

//   const distinctParticipantCommunityIds = participantCommunityIds
//     .map(c => c.communityId)
//     .filter((x, i, a) => a.indexOf(x) === i);

//   // get a list of all the channels that are public
//   const publicChannelIds = await db
//     .table('channels')
//     .getAll(...distinctParticipantChannelIds)
//     .filter({ isPrivate: false })
//     .map(channel => channel('id'))
//     .run();

//   const publicCommunityIds = await db
//     .table('communities')
//     .getAll(...distinctParticipantCommunityIds)
//     .filter({ isPrivate: false })
//     .map(community => community('id'))
//     .run();

//   const allIds = [
//     ...currentUsersChannelIds,
//     ...publicChannelIds,
//     ...currentUsersCommunityIds,
//     ...publicCommunityIds,
//   ];
//   const distinctIds = allIds.filter((x, i, a) => a.indexOf(x) === i);
//   let validChannelIds = intersection(
//     distinctIds,
//     distinctParticipantChannelIds
//   );
//   let validCommunityIds = intersection(
//     distinctIds,
//     distinctParticipantCommunityIds
//   );

//   return await db
//     .table('threads')
//     .getAll(...participantThreadIds)
//     .filter(thread => db.not(thread.hasFields('deletedAt')))
//     .filter(thread => db.expr(validChannelIds).contains(thread('channelId')))
//     .filter(thread =>
//       db.expr(validCommunityIds).contains(thread('communityId'))
//     )
//     .orderBy(db.desc('lastActive'), db.desc('createdAt'))
//     .skip(after || 0)
//     .limit(first)
//     .run()
//     .then(res => {
//       return res;
//     });
// };
export const getViewableParticipantThreadsByUser = async (
  evalUser: string,
  currentUser: string,
  options: PaginationOptions
): Promise<Array<DBThread>> => {
  return dbUtil.tryCallAsync(
    'getViewableParticipantThreadsByUser',
    { evalUser, currentUser, options },
    async () => {
      const { first, after } = options;
      // get a list of the channelIds the current user is allowed to see threads for
      const getCurrentUsersChannelIds = db
        .collection('usersChannels')
        .find({
          userId: currentUser,
          $or: [{ isMember: true }, { isModerator: true }, { isOwner: true }],
        })
        .map(userChannel => userChannel.channelId)
        .toArray();

      const getCurrentUserCommunityIds = db
        .collection('usersCommunities')
        .find({ userId: currentUser, isMember: true })
        .map(userCommunity => userCommunity.communityId)
        .toArray();

      // get a list of the channels where the user participated in a thread
      let getParticipantChannelIds = await db
        .collection('usersThreads')
        .find({ userId: evalUser, isParticipant: true })
        .toArray();
      getParticipantChannelIds = await dbUtil.eqJoin(
        db,
        getParticipantChannelIds,
        'threadId',
        'threads'
      );
      getParticipantChannelIds = dbUtil.zip(getParticipantChannelIds);
      getParticipantChannelIds = dbUtil.pluck(
        getParticipantChannelIds,
        'channelId',
        'threadId'
      );

      let getParticipantCommunityIds = await db
        .collection('usersThreads')
        .find({ userId: evalUser, isParticipant: true })
        .toArray();
      getParticipantCommunityIds = await dbUtil.eqJoin(
        db,
        getParticipantCommunityIds,
        'threadId',
        'threads'
      );
      getParticipantCommunityIds = dbUtil.zip(getParticipantCommunityIds);
      getParticipantCommunityIds = dbUtil.pluck('communityId', 'threadId');

      const [
        currentUsersChannelIds,
        participantChannelIds,
        currentUsersCommunityIds,
        participantCommunityIds,
      ] = await Promise.all([
        getCurrentUsersChannelIds,
        getParticipantChannelIds,
        getCurrentUserCommunityIds,
        getParticipantCommunityIds,
      ]);

      const participantThreadIds = participantChannelIds.map(
        c => c && c.threadId
      );
      const distinctParticipantChannelIds = participantChannelIds
        .map(c => c.channelId)
        .filter((x, i, a) => a.indexOf(x) === i);

      const distinctParticipantCommunityIds = participantCommunityIds
        .map(c => c.communityId)
        .filter((x, i, a) => a.indexOf(x) === i);

      // get a list of all the channels that are public
      const publicChannelIds = await db
        .collection('channels')
        .find({
          id: { $in: distinctParticipantChannelIds },
          isPrivate: false,
        })
        .map(channel => channel.id)
        .toArray();

      const publicCommunityIds = await db
        .collection('communities')
        .find({
          id: { $in: distinctParticipantCommunityIds },
          isPrivate: false,
        })
        .map(community => community.id)
        .toArray();

      const allIds = [
        ...currentUsersChannelIds,
        ...publicChannelIds,
        ...currentUsersCommunityIds,
        ...publicCommunityIds,
      ];
      const distinctIds = allIds.filter((x, i, a) => a.indexOf(x) === i);
      let validChannelIds = intersection(
        distinctIds,
        distinctParticipantChannelIds
      );
      let validCommunityIds = intersection(
        distinctIds,
        distinctParticipantCommunityIds
      );

      return await db
        .collection('threads')
        .find({
          id: { $in: participantThreadIds },
          deletedAt: null,
          channelId: { $in: validChannelIds },
          communityId: { $in: validCommunityIds },
        })
        .sort({ lastActive: -1, createdAt: -1 })
        .skip(after || 0)
        .limit(first)
        .toArray()
        .then(res => {
          return res;
        });
    },
    []
  );
};

// prettier-ignore
// export const getPublicParticipantThreadsByUser = (evalUser: string, options: PaginationOptions): Promise<Array<DBThread>> => {
//   const { first, after } = options
//   return db
//     .table('usersThreads')
//     .getAll([evalUser, true], { index: 'userIdAndIsParticipant' })
//     .eqJoin('threadId', db.table('threads'))
//     .without({
//       left: [
//         'id',
//         'userId',
//         'threadId',
//         'createdAt',
//         'isParticipant',
//         'receiveNotifications',
//       ],
//     })
//     .zip()
//     .filter(thread => db.not(thread.hasFields('deletedAt')))
//     .eqJoin('channelId', db.table('channels'))
//     .filter({ right: { isPrivate: false } })
//     .without('right')
//     .zip()
//     .eqJoin('communityId', db.table('communities'))
//     .filter({ right: { isPrivate: false } })
//     .without('right')
//     .zip()
//     .orderBy(db.desc('lastActive'), db.desc('createdAt'))
//     .skip(after || 0)
//     .limit(first || 10)
//     .run()
//     .then(res => {
//       return res;
//     });
// };
export const getPublicParticipantThreadsByUser = async (evalUser: string, options: PaginationOptions): Promise<Array<DBThread>> => {
  return dbUtil.tryCallAsync(
    "getPublicParticipantThreadsByUser",
    { evalUser, options },
    async () => {
      const { first, after } = options
        let ret = await  db
          .collection('usersThreads')
          .find([evalUser, true], { index: 'userIdAndIsParticipant' });
        ret = await dbUtil.eqJoin(db, ret, "threadId", "threads");
        ret = dbUtil.without(
          ret,
          {
            left: [
              'id',
              'userId',
              'threadId',
              'createdAt',
              'isParticipant',
              'receiveNotifications',
            ],
          });
        ret = dbUtil.zip(ret);
        ret = ret.filter(thread => {
          return !thread.deletedAt
        })
        ret = await dbUtil.eqJoin(db, ret, "channelId", "channels");
        ret = ret.filter(row => {
          return row.right.isPrivate == false
        });
        ret = dbUtil.without(ret, "right");
        ret = dbUtil.zip(ret);
        ret = await dbUtil.eqJoin(db, ret, "communityId", "communities");
        ret = ret.filter(row => {
          return row.right.isPrivate == false
        });
        ret = dbUtil.without(ret, "right");
        ret = dbUtil.zip(ret);
        ret = dbUtil.orderBy(['lastActive', -1], ['createdAt', -1]);
        ret = dbUtil.skip(ret, after || 0)
        ret = dbUtil.limit(ret, first || 10);
        ret = dbUtil.then(res => {
          return res;
        });
        return ret;
    },
    []
  )
};

// export const getWatercoolerThread = (
//   communityId: string
// ): Promise<?DBThread> => {
//   return db
//     .table('threads')
//     .getAll([communityId, true], { index: 'communityIdAndWatercooler' })
//     .run()
//     .then(result => {
//       if (!Array.isArray(result) || result.length === 0) return null;
//       return result[0];
//     });
// };
export const getWatercoolerThread = (
  communityId: string
): Promise<?DBThread> => {
  return dbUtil.tryCallAsync(
    'getWatercoolerThread',
    { communityId },
    () => {
      return db
        .collection('threads')
        .find({
          communityId: communityId,
          watercooler: true,
        })
        .toArray()
        .then(result => {
          if (!Array.isArray(result) || result.length === 0) return null;
          return result[0];
        });
    },
    null
  );
};

// export const publishThread = (
//   // eslint-disable-next-line
//   { filesToUpload, ...thread }: Object,
//   userId: string
// ): Promise<DBThread> => {
//   return db
//     .table('threads')
//     .insert(
//       Object.assign({}, thread, {
//         creatorId: userId,
//         createdAt: new Date(),
//         lastActive: new Date(),
//         modifiedAt: null,
//         isPublished: true,
//         isLocked: false,
//         edits: [],
//         reactionCount: 0,
//         messageCount: 0,
//       }),
//       { returnChanges: true }
//     )
//     .run()
//     .then(result => {
//       const thread = result.changes[0].new_val;

//       searchQueue.add({
//         id: thread.id,
//         type: 'thread',
//         event: 'created',
//       });

//       return thread;
//     });
// };
export const publishThread = (
  // eslint-disable-next-line
  { filesToUpload, ...thread }: Object,
  userId: string
): Promise<DBThread> => {
  return dbUtil.tryCallAsync(
    'publishThread',
    { filesToUpload, thread },
    () => {
      return dbUtil
        .insert(
          db,
          'threads',
          Object.assign({}, thread, {
            creatorId: userId,
            createdAt: new Date(),
            lastActive: new Date(),
            modifiedAt: null,
            isPublished: true,
            isLocked: false,
            edits: [],
            reactionCount: 0,
            messageCount: 0,
          })
        )
        .then(result => {
          const thread = result[0];

          searchQueue.add({
            id: thread.id,
            type: 'thread',
            event: 'created',
          });

          return thread;
        });
    },
    null
  );
};

// prettier-ignore
// export const setThreadLock = (threadId: string, value: boolean, userId: string, byModerator: boolean = false): Promise<DBThread> => {
//   return (
//     db
//       .table('threads')
//       .get(threadId)
//       // Note(@mxstbr): There surely is a better way to toggle a bool
//       // with ReQL, I just couldn't find the API for it in a pinch
//       .update(
//         {
//           isLocked: value,
//           lockedBy: value === true ? userId : db.literal(),
//           lockedAt: value === true ? new Date() : db.literal(),
//         },
//         { returnChanges: true }
//       )
//       .run()
//       .then(async () => {
//         const thread = await getThreadById(threadId)
//         return thread
//       })
//   );
// };
export const setThreadLock = (threadId: string, value: boolean, userId: string, byModerator: boolean = false): Promise<DBThread> => {
  return dbUtil.tryCallAsync(
    "setThreadLock",
    { threadId, value, userId, byModerator },
    () => {
      return (
        dbUtil
          .updateOne(
            'threads',
            { id: threadId },
            {
              $set: {
                isLocked: value,
                lockedBy: value === true ? userId : null,
                lockedAt: value === true ? new Date() : null,
              }
            })
          .then(async () => {
            const thread = await getThreadById(threadId)
            return thread
          })
      );
    },
    null
  )
};

// export const setThreadLastActive = (threadId: string, value: Date) => {
//   return db
//     .table('threads')
//     .get(threadId)
//     .update({ lastActive: value })
//     .run();
// };
export const setThreadLastActive = (threadId: string, value: Date) => {
  return dbUtil.tryCallAsync(
    'setThreadLastActive',
    { threadId, value },
    () => {
      return dbUtil
        .updateOne(
          db,
          'threads',
          { id: threadId },
          {
            lastActive: value,
          }
        )
        .then(result => {
          return result[0];
        })
        .then(result => {
          dbUtil.pubsub.publish('THREAD_UPDATED', result);
          return result;
        });
    },
    null
  );
};

// prettier-ignore
// export const deleteThread = (threadId: string, userId: string): Promise<Boolean> => {
//   return db
//     .table('threads')
//     .get(threadId)
//     .update(
//       {
//         deletedBy: userId,
//         deletedAt: new Date(),
//       },
//       {
//         returnChanges: true,
//         nonAtomic: true,
//       }
//     )
//     .run()
//     .then(result =>
//       Promise.all([
//         result,
//         turnOffAllThreadNotifications(threadId),
//         deleteMessagesInThread(threadId, userId),
//       ])
//     )
//     .then(([result]) => {
//       const thread = result.changes[0].new_val;

//       searchQueue.add({
//         id: thread.id,
//         type: 'thread',
//         event: 'deleted'
//       })

//       processReputationEventQueue.add({
//         userId: thread.creatorId,
//         type: 'thread deleted',
//         entityId: thread.id,
//       });

//       return result.replaced >= 1 ? true : false;
//     });
// };
export const deleteThread = async (threadId: string, userId: string): Promise<Boolean> => {
  return dbUtil.tryCallAsync(
    "deleteThread",
    { threadId, userId },
    () => {
      return dbUtil
        .updateOne(
          'threads',
          { 
            id: threadId 
          }, 
          {
            $set: {
              deletedBy: userId,
              deletedAt: new Date(),
            }
          })
          .then(result =>
            Promise.all([
              result,
              turnOffAllThreadNotifications(threadId),
              deleteMessagesInThread(threadId, userId),
            ])
          )
          .then(([result]) => {
            const thread = result;
      
            searchQueue.add({
              id: thread.id,
              type: 'thread',
              event: 'deleted'
            })
      
            processReputationEventQueue.add({
              userId: thread.creatorId,
              type: 'thread deleted',
              entityId: thread.id,
            });
      
            return result ? true : false;
          });
    },
    false
  )
};

type File = FileUpload;

export type EditThreadInput = {
  threadId: string,
  content: {
    title: string,
    body: ?string,
  },
  filesToUpload?: ?Array<File>,
};

// shouldUpdate arguemnt is used to prevent a thread from being marked as edited when the images are uploaded at publish time
// prettier-ignore
// export const editThread = (input: EditThreadInput, userId: string, shouldUpdate: boolean = true): Promise<DBThread> => {
//   return db
//     .table('threads')
//     .get(input.threadId)
//     .update(
//       {
//         content: input.content,
//         modifiedAt: shouldUpdate ? new Date() : null,
//         editedBy: userId,
//         edits: db.row('edits').append({
//           content: db.row('content'),
//           timestamp: new Date(),
//           editedBy: db.row('editedBy').default(db.row('creatorId'))
//         }),
//       },
//       { returnChanges: 'always' }
//     )
//     .run()
//     .then(result => {
//       // if an update happened
//       if (result.replaced === 1) {
//         const thread = result.changes[0].new_val;

//         searchQueue.add({
//           id: thread.id,
//           type: 'thread',
//           event: 'edited'
//         })

//         return thread;
//       }

//       // an update was triggered from the client, but no data was changed
//       return result.changes[0].old_val;
//     });
// };
export const editThread = async (input: EditThreadInput, userId: string, shouldUpdate: boolean = true): Promise<DBThread> => {
  return dbUtil.tryCallAsync(
    "editThread",
    { input, userId, shouldUpdate },
    async () => {
      const oldThread = await db
        .collection("threads")
        .findOne({ 
          id: input.threadId 
        });
      oldThread.edits = oldThread.edits || [];
      oldThread.edits.push({
        content: oldThread.content,
        timestamp: new Date(),
        editedBy: oldThread.editedBy || oldThread.creatorId
      })

      return dbUtil
        .updateOne(
          db,
          'threads',
          { 
            id: input.threadId 
          }, 
          {
            $set: {
              content: input.content,
              modifiedAt: shouldUpdate ? new Date() : null,
              editedBy: userId,
              edits: oldThread.edits
            }
          }
        )
        .then(result => {
          const thread = result[0];

          searchQueue.add({
            id: thread.id,
            type: 'thread',
            event: 'edited'
          })

          return thread;
        });
    },
    null
  )
};

// export const updateThreadWithImages = (id: string, body: string) => {
//   return db
//     .table('threads')
//     .get(id)
//     .update(
//       {
//         content: {
//           body,
//         },
//       },
//       { returnChanges: 'always' }
//     )
//     .run()
//     .then(result => {
//       // if an update happened
//       if (result.replaced === 1) {
//         return result.changes[0].new_val;
//       }

//       // no data was changed
//       if (result.unchanged === 1) {
//         return result.changes[0].old_val;
//       }

//       return null;
//     });
// };
export const updateThreadWithImages = async (id: string, body: string) => {
  return dbUtil.tryCallAsync(
    'updateThreadWithImages',
    { id, body },
    () => {
      return dbUtil
        .updateOne(
          db,
          'threads',
          {
            id: id,
          },
          {
            $set: dbUtil.flattenSafe({
              content: {
                body,
              },
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

// export const moveThread = (id: string, channelId: string) => {
//   return db
//     .table('threads')
//     .get(id)
//     .update(
//       {
//         channelId,
//       },
//       { returnChanges: 'always' }
//     )
//     .run()
//     .then(result => {
//       if (result.replaced === 1) {
//         const thread = result.changes[0].new_val;

//         searchQueue.add({
//           id: thread.id,
//           type: 'thread',
//           event: 'moved',
//         });

//         return thread;
//       }

//       return null;
//     });
// };
export const moveThread = async (id: string, channelId: string) => {
  return dbUtil.tryCallAsync(
    'moveThread',
    { id, channelId },
    () => {
      return dbUtil
        .updateOne(
          'threads',
          {
            id: id,
          },
          {
            $set: {
              channelId,
            },
          }
        )
        .then(result => {
          const thread = result;

          searchQueue.add({
            id: thread.id,
            type: 'thread',
            event: 'moved',
          });

          return thread;
        });
    },
    null
  );
};

// export const incrementMessageCount = (threadId: string) => {
//   return db
//     .table('threads')
//     .get(threadId)
//     .update({
//       messageCount: db
//         .row('messageCount')
//         .default(0)
//         .add(1),
//     })
//     .run();
// };
export const incrementMessageCount = (threadId: string) => {
  return dbUtil.tryCallAsync(
    'incrementMessageCount',
    { threadId },
    () => {
      return dbUtil
        .updateOne(
          db,
          'threads',
          {
            id: threadId,
          },
          {
            $inc: { messageCount: 1 },
          }
        )
        .then(result => {
          return result[0];
        })
        .then(result => {
          dbUtil.pubsub.publish('THREAD_UPDATED', result);
          return result;
        });
    },
    null
  );
};

// export const decrementMessageCount = (threadId: string) => {
//   return db
//     .table('threads')
//     .get(threadId)
//     .update({
//       messageCount: db
//         .row('messageCount')
//         .default(1)
//         .sub(1),
//     })
//     .run();
// };
export const decrementMessageCount = (threadId: string) => {
  return dbUtil.tryCallAsync(
    'decrementMessageCount',
    { threadId },
    () => {
      return db.collection('threads').updateOne(
        {
          id: threadId,
        },
        {
          $inc: {
            messageCount: -1,
          },
        }
      );
    },
    null
  );
};

// export const incrementReactionCount = (threadId: string) => {
//   return db
//     .table('threads')
//     .get(threadId)
//     .update({
//       reactionCount: db
//         .row('reactionCount')
//         .default(0)
//         .add(1),
//     })
//     .run();
// };
export const incrementReactionCount = (threadId: string) => {
  return dbUtil.tryCallAsync(
    'incrementReactionCount',
    { threadId },
    () => {
      return db.collection('threads').updateOne(
        { id: threadId },
        {
          $inc: {
            reactionCount: 1,
          },
        }
      );
    },
    null
  );
};

// export const decrementReactionCount = (threadId: string) => {
//   return db
//     .table('threads')
//     .get(threadId)
//     .update({
//       reactionCount: db
//         .row('reactionCount')
//         .default(1)
//         .sub(1),
//     })
//     .run();
// };
export const decrementReactionCount = (threadId: string) => {
  return dbUtil.tryCallAsync(
    'decrementReactionCount',
    { threadId },
    () => {
      return dbUtil
        .updateOne(
          db,
          'threads',
          {
            id: threadId,
          },
          {
            $inc: {
              reactionCount: -1,
            },
          }
        )
        .then(result => {
          return result[0];
        })
        .then(result => {
          dbUtil.pubsub.publish('THREAD_UPDATED', result);
          return result;
        });
    },
    null
  );
};

// const hasChanged = (field: string) =>
//   db
//     .row('old_val')(field)
//     .ne(db.row('new_val')(field));

// const getUpdatedThreadsChangefeed = () =>
//   db
//     .table('threads')
//     .changes({
//       includeInitial: false,
//     })
//     .filter(
//       NEW_DOCUMENTS.or(
//         hasChanged('content')
//           .or(hasChanged('lastActive'))
//           .or(hasChanged('channelId'))
//           .or(hasChanged('communityId'))
//           .or(hasChanged('creatorId'))
//           .or(hasChanged('isPublished'))
//           .or(hasChanged('modifiedAt'))
//           .or(hasChanged('messageCount'))
//           .or(hasChanged('reactionCount'))
//       )
//     )('new_val')
//     .run();
const getUpdatedThreadsChangefeed = () => {};

export const listenToUpdatedThreads = (cb: Function): Function => {
  return createChangefeed(
    getUpdatedThreadsChangefeed,
    cb,
    'listenToUpdatedThreads'
  );
};
