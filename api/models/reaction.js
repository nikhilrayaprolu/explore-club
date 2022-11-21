// @flow
import { db } from 'shared/db';
import {
  sendReactionNotificationQueue,
  processReputationEventQueue,
} from 'shared/bull/queues';
import type { DBReaction } from 'shared/types';
const dbUtil = require('shared/dbUtil');

type ReactionType = 'like';

export type ReactionInput = {
  messageId: string,
  type: ReactionType,
};

// prettier-ignore
// export const getReactions = (messageIds: Array<string>): Promise<Array<DBReaction>> => {
//   const distinctMessageIds = messageIds.filter((x, i, a) => a.indexOf(x) == i);
//   return db
//     .table('reactions')
//     .getAll(...distinctMessageIds, { index: 'messageId' })
//     .filter(row => row.hasFields('deletedAt').not())
//     .group('messageId')
//     .run();
// };
export const getReactions = (messageIds: Array<string>): Promise<Array<DBReaction>> => {
  return dbUtil.tryCallAsync(
    "getReactions",
    { messageIds },
    async () => {
      const distinctMessageIds = messageIds.filter((x, i, a) => a.indexOf(x) == i);
      let ret = await db
        .collection('reactions')
        .find({ messageId: { $in: distinctMessageIds }, deletedAt: null })
        .toArray();
      ret = dbUtil.group("messageId");
      return ret;
    },
    []
  )
};

// export const getReaction = (reactionId: string): Promise<DBReaction> => {
//   return db
//     .table('reactions')
//     .get(reactionId)
//     .run();
// };
export const getReaction = (reactionId: string): Promise<DBReaction> => {
  return dbUtil.tryCallAsync(
    'getReaction',
    { reactionId },
    () => {
      return db.collection('reactions').findOne({ id: reactionId });
    },
    null
  );
};

// prettier-ignore
// export const getReactionsByIds = (reactionIds: Array<string>): Promise<Array<DBReaction>> => {
//   return db
//     .table('reactions')
//     .getAll(...reactionIds)
//     .run();
// };
export const getReactionsByIds = (reactionIds: Array<string>): Promise<Array<DBReaction>> => {
  return dbUtil.tryCallAsync(
    "getReactionsByIds", 
    { reactionIds },
    () => {
      return db
        .collection('reactions')
        .find({ id: { $in: reactionIds} })
        .toArray();
    }, 
    null
  )
 
};

// prettier-ignore
// export const toggleReaction = (reaction: ReactionInput, userId: string): Promise<DBReaction> => {
//   return db
//     .table('reactions')
//     .getAll(reaction.messageId, { index: 'messageId' })
//     .filter({ userId })
//     .run()
//     .then(async result => {
//       // user has already reacted
//       if (result && result.length > 0) {
//         const thisReaction = result[0];

//         // user is re-reacting
//         if (thisReaction.deletedAt) {
//           processReputationEventQueue.add({
//             userId,
//             type: 'reaction created',
//             entityId: thisReaction.messageId,
//           });

//           return db
//             .table('reactions')
//             .get(thisReaction.id)
//             .update({
//               deletedAt: db.literal(),
//             })
//             .run();
//         }

//         processReputationEventQueue.add({
//           userId,
//           type: 'reaction deleted',
//           entityId: thisReaction.messageId,
//         });

//         return db
//           .table('reactions')
//           .get(thisReaction.id)
//           .update({
//             deletedAt: new Date(),
//           })
//           .run();
//       }

//       // user has not reacted yet
//       return db
//         .table('reactions')
//         .insert(
//           {
//             ...reaction,
//             userId,
//             timestamp: Date.now(),
//           },
//           { returnChanges: true }
//         )
//         .run()
//         .then(result => result.changes[0].new_val)
//         .then(reaction => {
//           sendReactionNotificationQueue.add({ reaction, userId });

//           processReputationEventQueue.add({
//             userId,
//             type: 'reaction created',
//             entityId: reaction.messageId,
//           });

//           return reaction;
//         });
//     })
//     .then(() => {
//       // return the message object itself in order to more easily update the UI with the apollo store
//       return db
//         .table('messages')
//         .get(reaction.messageId)
//         .run();
//     });
// };
export const toggleReaction = (reaction: ReactionInput, userId: string): Promise<DBReaction> => {
  return dbUtil.tryCallAsync(
    "toggleReaction", 
    { reaction, userId },
    () => {
      return db
      .collection('reactions')
      .find({ 
        messageId: reaction.messageId,
        userId: userId
      })
      .toArray()
      .then(async result => {
        // user has already reacted
        if (result && result.length > 0) {
          const thisReaction = result[0];

          // user is re-reacting
          if (thisReaction.deletedAt) {
            processReputationEventQueue.add({
              userId,
              type: 'reaction created',
              entityId: thisReaction.messageId,
            });

            return dbUtil
              .updateOne(
                'reactions',
                { 
                  id: thisReaction.id 
                },
                {
                  $unset: {
                    deletedAt: ""
                  }
                }
              )
          }

          processReputationEventQueue.add({
            userId,
            type: 'reaction deleted',
            entityId: thisReaction.messageId,
          });

          return dbUtil
            .updateOne(
              'reactions',
              { 
                id: thisReaction.id 
              },
              {
                $set: {
                  deletedAt: new Date()
                }
              }
            )
        }

        // user has not reacted yet
        return dbUtil
          .insert(
            'reactions',
            {
              ...reaction,
              userId,
              timestamp: Date.now(),
            },
          )
          .then(result => result[0])
          .then(reaction => {
            sendReactionNotificationQueue.add({ reaction, userId });

            processReputationEventQueue.add({
              userId,
              type: 'reaction created',
              entityId: reaction.messageId,
            });

            return reaction;
          });
      })
      .then(() => {
        // return the message object itself in order to more easily update the UI with the apollo store
        return db
          .collection('messages')
          .findOne({ id: reaction.messageId })
      });
    }, 
    null
  )
};
