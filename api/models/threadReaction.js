// @flow
import { db } from 'shared/db';
import {
  sendThreadReactionNotificationQueue,
  processReputationEventQueue,
} from 'shared/bull/queues';
import type { DBThreadReaction } from 'shared/types';
import { incrementReactionCount, decrementReactionCount } from './thread';
import { getThreadById } from './thread';
const dbUtil = require('shared/dbUtil');

type ThreadReactionType = 'like';

// prettier-ignore
// export const getThreadReactions = (threadIds: Array<string>): Promise<Array<DBThreadReaction>> => {
//   const distinctMessageIds = threadIds.filter((x, i, a) => a.indexOf(x) == i);
//   return db
//     .table('threadReactions')
//     .getAll(...distinctMessageIds, { index: 'threadId' })
//     .filter(row => row.hasFields('deletedAt').not())
//     .group('threadId')
//     .run();
// };
export const getThreadReactions = (threadIds: Array<string>): Promise<Array<DBThreadReaction>> => {
  return dbUtil
    .tryCallAsync(
      "getThreadReactions", 
      async () => {
        const distinctMessageIds = threadIds.filter((x, i, a) => a.indexOf(x) == i);
        let ret = await db
          .collection('threadReactions')
          .find({ 
            threadId: { $in: distinctMessageIds } ,
            deletedAt: null
          })
          .toArray();
        ret = dbUtil.group(ret, "threadId");
        return ret;
      }, 
      []
    )
};

// export const hasReactedToThread = (
//   userId: string,
//   threadId: string
// ): Promise<boolean> => {
//   return db
//     .table('threadReactions')
//     .getAll([userId, threadId], { index: 'userIdAndThreadId' })
//     .filter(row => row.hasFields('deletedAt').not())
//     .count()
//     .eq(1)
//     .run();
// };
export const hasReactedToThread = (
  userId: string,
  threadId: string
): Promise<boolean> => {
  return dbUtil.tryCallAsync(
    'hasReactedToThread',
    { userId, threadId },
    async () => {
      let ret = await db.collection('threadReactions').countDocuments({
        userId: userId,
        threadId: threadId,
        deletedAt: null,
      });
      return ret >= 1;
    },
    false
  );
};

type ThreadReactionInput = {
  threadId: string,
  type: ThreadReactionType,
};

// prettier-ignore
// export const addThreadReaction = (input: ThreadReactionInput, userId: string): Promise<DBThreadReaction> => {
//   return db
//     .table('threadReactions')
//     .getAll(input.threadId, { index: 'threadId' })
//     .filter({ userId })
//     .run()
//     .then(async results => {
//       const thread = await getThreadById(input.threadId)
//       // if the reaction already exists in the db, it was previously deleted
//       // just remove the deletedAt field
//       if (results && results.length > 0) {
//         const thisReaction = results[0];

//         const sendReactionNotification = thread && (thread.creatorId !== userId)
//           ? sendThreadReactionNotificationQueue.add({ threadReaction: thisReaction, userId })
//           : null

//         await Promise.all([
//           sendReactionNotification,
//           processReputationEventQueue.add({
//             userId,
//             type: 'thread reaction created',
//             entityId: thisReaction.threadId,
//           }),
//           incrementReactionCount(thisReaction.threadId)
//         ])

//         return db
//           .table('threadReactions')
//           .get(thisReaction.id)
//           .update({
//             deletedAt: db.literal(),
//           }, { returnChanges: 'always' })
//           .run()
//           .then(result => result.changes[0].new_val || result.changes[0].new_val)
//       }

//       return db
//         .table('threadReactions')
//         .insert(
//           {
//             ...input,
//             userId,
//             createdAt: Date.now(),
//           },
//           { returnChanges: 'always' }
//         )
//         .run()
//         .then(result => result.changes[0].new_val)
//         .then(async threadReaction => {
//           const sendReactionNotification = thread && (thread.creatorId !== userId)
//             ? sendThreadReactionNotificationQueue.add({ threadReaction, userId })
//             : null

//           await Promise.all([
//             processReputationEventQueue.add({
//               userId,
//               type: 'thread reaction created',
//               entityId: threadReaction.threadId,
//             }),
//             sendReactionNotification,
//             incrementReactionCount(threadReaction.threadId)
//           ])

//           return threadReaction;
//         });
//     });
// };
export const addThreadReaction = (input: ThreadReactionInput, userId: string): Promise<DBThreadReaction> => {
  return dbUtil.tryCallAsync(
    "addThreadReaction",
    { input, userId },
    () => {
      return db
        .collection('threadReactions')
        .find({ 
          threadId: threadId,
          userId: userId 
        })
        .toArray()
        .then(async results => {
          const thread = await getThreadById(input.threadId)
          // if the reaction already exists in the db, it was previously deleted
          // just remove the deletedAt field
          if (results && results.length > 0) {
            const thisReaction = results[0];

            const sendReactionNotification = thread && (thread.creatorId !== userId)
              ? sendThreadReactionNotificationQueue.add({ threadReaction: thisReaction, userId })
              : null

            await Promise.all([
              sendReactionNotification,
              processReputationEventQueue.add({
                userId,
                type: 'thread reaction created',
                entityId: thisReaction.threadId,
              }),
              incrementReactionCount(thisReaction.threadId)
            ])

            return dbUtil
              .updateOne(
                db,
                'threadReactions',
                {
                  id: thisReaction.id,
                },
                {
                  $unset: {
                    deletedAt: ""
                  }
                }
              )
              .then(result => {
                return result[0];
              })
          }

          return dbUtil
            .insert(
              'threadReactions',
              {
                ...input,
                userId,
                createdAt: Date.now(),
              },
            )
            .then(result => result[0])
            .then(async threadReaction => {
              const sendReactionNotification = thread && (thread.creatorId !== userId)
                ? sendThreadReactionNotificationQueue.add({ threadReaction, userId })
                : null

              await Promise.all([
                processReputationEventQueue.add({
                  userId,
                  type: 'thread reaction created',
                  entityId: threadReaction.threadId,
                }),
                sendReactionNotification,
                incrementReactionCount(threadReaction.threadId)
              ])

              return threadReaction;
            });
        });
    },
    null
  )
};

// prettier-ignore
// export const removeThreadReaction = (threadId: string, userId: string): Promise<?DBThreadReaction> => {
//   return db
//     .table('threadReactions')
//     .getAll(threadId, { index: 'threadId' })
//     .filter({ userId })
//     .run()
//     .then(async results => {
//       // no reaction exists to be removed
//       if (!results || results.length === 0) return null;

//       const threadReaction = results[0];

//       await Promise.all([
//         processReputationEventQueue.add({
//           userId,
//           type: 'thread reaction deleted',
//           entityId: threadReaction.threadId,
//         }),
//         decrementReactionCount(threadId)
//       ])

//       return db
//         .table('threadReactions')
//         .get(threadReaction.id)
//         .update({
//           deletedAt: new Date(),
//         }, { returnChanges: 'always' })
//         .run()
//         .then(result => result.changes[0].new_val || result.changes[0].new_val)
//     });
// };
export const removeThreadReaction = (threadId: string, userId: string): Promise<?DBThreadReaction> => {
  return dbUtil.tryCallAsync(
    "removeThreadReaction",
    { threadId, userId },
    () => {
      return db
        .collection('threadReactions')
        .find({ 
          threadId: threadId,
          userId: userId
        })
        .toArray()
        .then(async results => {
          // no reaction exists to be removed
          if (!results || results.length === 0) return null;

          const threadReaction = results[0];

          await Promise.all([
            processReputationEventQueue.add({
              userId,
              type: 'thread reaction deleted',
              entityId: threadReaction.threadId,
            }),
            decrementReactionCount(threadId)
          ])

          return dbUtil
            .updateOne(
              'threadReactions',
              { id: threadReaction.id },
              {
                deletedAt: new Date(),
              }
            )
            .then(result => { 
              return result[0] 
            })
        });
    },
    null
  )
};
