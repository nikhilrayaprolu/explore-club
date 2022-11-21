// @flow
const { db } = require('shared/db');
import { sendCommunityNotificationQueue } from 'shared/bull/queues';
import type { DBUsersCommunities, DBCommunity } from 'shared/types';
import {
  incrementMemberCount,
  decrementMemberCount,
  setMemberCount,
} from './community';
const dbUtil = require('shared/dbUtil');

/*
===========================================================

        MODIFYING AND CREATING DATA IN USERSCOMMUNITIES

===========================================================
*/

// invoked only when a new community is being created. the user who is doing
// the creation is automatically an owner and a member
// prettier-ignore
// export const createOwnerInCommunity = (communityId: string, userId: string): Promise<DBUsersCommunities> => {
//   return db
//     .table('usersCommunities')
//     .insert(
//       {
//         communityId,
//         userId,
//         createdAt: new Date(),
//         isOwner: true,
//         isMember: true,
//         isModerator: false,
//         isBlocked: false,
//         isPending: false,
//         receiveNotifications: true,
//         reputation: 0,
//       },
//       { returnChanges: true }
//     )
//     .run()
//     .then(async result => {
//       await Promise.all([
//         incrementMemberCount(communityId)
//       ])

//       return result.changes[0].new_val
//     });
// };
export const createOwnerInCommunity = (communityId: string, userId: string): Promise<DBUsersCommunities> => {
  return dbUtil.tryCallAsync(
    "createOwnerInCommunity",
    { communityId, userId },
    () => {
      return dbUtil
        .insert(
          db,
          'usersCommunities',
          {
            communityId,
            userId,
            createdAt: new Date(),
            isOwner: true,
            isMember: true,
            isModerator: false,
            isBlocked: false,
            isPending: false,
            receiveNotifications: true,
            reputation: 0,
          }
        )
        .then(async result => {
          await Promise.all([
            incrementMemberCount(communityId)
          ])

          return result[0];
        });
    },
    null
  )
};

// creates a single member in a community. invoked when a user joins a public
// community
// prettier-ignore
// export const createMemberInCommunity = (communityId: string, userId: string): Promise<DBUsersCommunities> => {
//   return db
//     .table('usersCommunities')
//     .getAll([userId, communityId], { index: 'userIdAndCommunityId' })
//     .run()
//     .then(result => {
//       if (result && result.length > 0) {
//         // if the result exists, it means the user has a previous relationship
//         // with this community - since we already handled 'blocked' logic
//         // in the mutation controller, we can simply update the user record
//         // to be a re-joined member with notifications turned on

//         return db
//           .table('usersCommunities')
//           .getAll([userId, communityId], { index: 'userIdAndCommunityId' })
//           .update(
//             {
//               createdAt: new Date(),
//               isMember: true,
//               receiveNotifications: true,
//               lastSeen: new Date(),
//             },
//             { returnChanges: 'always' }
//           )
//           .run();
//       } else {
//         // if no relationship exists, we can create a new one from scratch
//         return db
//           .table('usersCommunities')
//           .insert(
//             {
//               communityId,
//               userId,
//               createdAt: new Date(),
//               lastSeen: new Date(),
//               isMember: true,
//               isOwner: false,
//               isModerator: false,
//               isBlocked: false,
//               isPending: false,
//               receiveNotifications: true,
//               reputation: 0,
//             },
//             { returnChanges: true }
//           )
//           .run();
//       }
//     })
//     .then(async result => {
//       await Promise.all([
//         sendCommunityNotificationQueue.add({ communityId, userId }),
//         incrementMemberCount(communityId)
//       ])
//       return result.changes[0].new_val;
//     });
// };
export const createMemberInCommunity = (communityId: string, userId: string): Promise<DBUsersCommunities> => {
  return dbUtil.tryCallAsync(
    "createMemberInCommunity",
    { communityId, userId },
    () => {
      return db
        .collection('usersCommunities')
        .find({ 
          userId: userId, 
          communityId: communityId 
        })
        .toArray()
        .then(result => {
          if (result && result.length > 0) {
            // if the result exists, it means the user has a previous relationship
            // with this community - since we already handled 'blocked' logic
            // in the mutation controller, we can simply update the user record
            // to be a re-joined member with notifications turned on

            return dbUtil
              .updateMany(
                'usersCommunities',
                { 
                  userId: userId, 
                  communityId: communityId 
                },
                {
                  $set: {
                    createdAt: new Date(),
                    isMember: true,
                    receiveNotifications: true,
                    lastSeen: new Date(),
                  }
                }
              )
              .then(async () => {
                return await db.collection("usersCommunities")
                  .find({ 
                    userId: userId, 
                    communityId: communityId 
                  })
                  .toArray()
              })
          } else {
            // if no relationship exists, we can create a new one from scratch

            return dbUtil
              .insert(
                'usersCommunities',
                {
                  communityId,
                  userId,
                  createdAt: new Date(),
                  lastSeen: new Date(),
                  isMember: true,
                  isOwner: false,
                  isModerator: false,
                  isBlocked: false,
                  isPending: false,
                  receiveNotifications: true,
                  reputation: 0,
                }
              )
          }
        })
        .then(async result => {
          await Promise.all([
            sendCommunityNotificationQueue.add({ communityId, userId }),
            incrementMemberCount(communityId)
          ])
          return result[0]
        });
    },
    null
  )
};

// removes a single member from a community. will be invoked if a user leaves a community
// prettier-ignore
// export const removeMemberInCommunity = (communityId: string, userId: string): Promise<DBCommunity> => {
//   return db
//     .table('usersCommunities')
//     .getAll([userId, communityId], { index: 'userIdAndCommunityId'})
//     .update({
//       isModerator: false,
//       isMember: false,
//       receiveNotifications: false,
//     })
//     .run()
//     .then(async () => {
//       const community = await db
//         .table('communities')
//         .get(communityId)
//         .run()

//       await decrementMemberCount(communityId)

//       return community
//     })
// };
export const removeMemberInCommunity = (communityId: string, userId: string): Promise<DBCommunity> => {
  return dbUtil.tryCallAsync(
    "removeMemberInCommunity",
    { communityId, userId },
    () => {
      return db
        .collection('usersCommunities')
        .updateMany(
          { 
            userId: userId, 
            communityId: communityId 
          },
          {
            $set: {
              isModerator: false,
              isMember: false,
              receiveNotifications: false,
            }
          }
        )
        .then(async () => {
          const community = await db
            .collection('communities')
            .findOne({ id: communityId })

          await decrementMemberCount(communityId)

          return community
        })
    },
    null
  )
};

// removes all the user relationships to a community. will be invoked when a
// community is deleted, at which point we don't want any records in the
// database to show a user relationship to the deleted community
// prettier-ignore
// export const removeMembersInCommunity = async (communityId: string): Promise<?Object> => {

//   const usersCommunities = await db
//     .table('usersCommunities')
//     .getAll(communityId, { index: 'communityId' })
//     .run()

//   if (!usersCommunities || usersCommunities.length === 0) return
//   const leavePromise = await db
//     .table('usersCommunities')
//     .getAll(communityId, { index: 'communityId' })
//     .update({
//       isMember: false,
//       receiveNotifications: false,
//     })
//     .run();

//   return await Promise.all([
//     setMemberCount(communityId, 0),
//     leavePromise
//   ])
// };
export const removeMembersInCommunity = async (communityId: string): Promise<?Object> => {
  return dbUtil.tryCallAsync(
    "removeMembersInCommunity",
    { communityId },
    async () => {
      const usersCommunities = await db
        .collection('usersCommunities')
        .find({ communityId: communityId })
        .toArray()

      if (!usersCommunities || usersCommunities.length === 0) return
      const leavePromise = await dbUtil
        .updateMany(
          'usersCommunities',
          { 
            communityId: communityId 
          },
          {
            $set: {
              isMember: false,
              receiveNotifications: false,
            }
          }
        )

      return await Promise.all([
        setMemberCount(communityId, 0),
        leavePromise
      ])
    },
    null
  )
};

// toggles user to blocked in a community. invoked by a community or community
// owner when managing a private community. sets pending to false to handle
// private communitys modifying pending users to be blocked
// prettier-ignore
// export const blockUserInCommunity = (communityId: string, userId: string): Promise<DBUsersCommunities> => {
//   return db
//     .table('usersCommunities')
//     .getAll([userId, communityId], { index: 'userIdAndCommunityId'})
//     .update(
//       {
//         isMember: false,
//         isPending: false,
//         isBlocked: true,
//         isModerator: false,
//         receiveNotifications: false,
//       },
//       { returnChanges: true }
//     )
//     .run()
//     .then(async result => {
//       await Promise.all([
//         decrementMemberCount(communityId)
//       ])
//       return result.changes[0].new_val
//     });
// };
export const blockUserInCommunity = (communityId: string, userId: string): Promise<DBUsersCommunities> => {
  return dbUtil.tryCallAsync(
    "blockUserInCommunity",
    { communityId, userId },
    () => {
      return dbUtil
        .updateMany(
          'usersCommunities',
          { 
            userId: userId, 
            communityId: communityId 
          },
          {
            $set: {
              isMember: false,
              isPending: false,
              isBlocked: true,
              isModerator: false,
              receiveNotifications: false,
            }
          }
        )
        .then(async result => {
          await Promise.all([
            decrementMemberCount(communityId)
          ])
          return result[0];
        });
    },
    null
  )
};

// unblocks a blocked user in a community. invoked by a community or community
// owner when managing a private community. this *does* add the user
// as a member
// prettier-ignore
// export const unblockUserInCommunity = (communityId: string, userId: string): Promise<DBUsersCommunities> => {
//   return db
//     .table('usersCommunities')
//     .getAll([userId, communityId], { index: 'userIdAndCommunityId' })
//     .filter({ isBlocked: true })
//     .update(
//       {
//         isModerator: false,
//         isMember: true,
//         isBlocked: false,
//         isPending: false,
//         receiveNotifications: true,
//       },
//       { returnChanges: true }
//     )
//     .run()
//     .then(async result => {

//       await Promise.all([
//         incrementMemberCount(communityId)
//       ])

//       return result.changes[0].new_val
//     });
// };
export const unblockUserInCommunity = (communityId: string, userId: string): Promise<DBUsersCommunities> => {
  return dbUtil.tryCallAsync(
    "unblockUserInCommunity",
    { communityId, userId },
    () => {
      return dbUtil
        .updateMany(
          'usersCommunities',
          { 
            userId: userId, 
            communityId: communityId, 
            isBlocked: false 
          },
          {
            $set: {
              isModerator: false,
              isMember: true,
              isBlocked: false,
              isPending: false,
              receiveNotifications: true,
            }
          }
        )
        .then(async (result) => {
    
          await Promise.all([
            incrementMemberCount(communityId)
          ])
    
          return result[0]
        });
    },
    null
  )
};

// moves an *existing* user in a community to be a moderator
// prettier-ignore
// export const makeMemberModeratorInCommunity = (communityId: string, userId: string): Promise<DBUsersCommunities> => {
//   return db
//     .table('usersCommunities')
//     .getAll([userId, communityId], { index: 'userIdAndCommunityId'})
//     .update(
//       {
//         isBlocked: false,
//         isMember: true,
//         isModerator: true,
//         receiveNotifications: true,
//       },
//       { returnChanges: true }
//     )
//     .run()
//     .then(result => {
//       return result.changes[0].new_val
//     });
// };
export const makeMemberModeratorInCommunity = (communityId: string, userId: string): Promise<DBUsersCommunities> => {
  return dbUtil.tryCallAsync(
    "makeMemberModeratorInCommunity",
    { communityId, userId },
    () => {
      return dbUtil
        .updateMany(
          'usersCommunities',
          { 
            userId: userId, 
            communityId: communityId 
          },
          {
            $set: {
              isBlocked: false,
              isMember: true,
              isModerator: true,
              receiveNotifications: true,
            }
          }
        )
        .then((result) => {
          return result[0]
        });
    },
    null
  )
};

// moves a moderator to be only a member in a community. does not remove them from the community
// prettier-ignore
// export const removeModeratorInCommunity = (communityId: string, userId: string): Promise<Object> => {
//   return db
//     .table('usersCommunities')
//     .getAll([userId, communityId], { index: 'userIdAndCommunityId'})
//     .update(
//       {
//         isModerator: false,
//       },
//       { returnChanges: true }
//     )
//     .run()
//     .then(result => {
//       return result.changes[0].new_val
//     });
// };
export const removeModeratorInCommunity = (communityId: string, userId: string): Promise<Object> => {
  return dbUtil.tryCallAsync(
    "removeModeratorInCommunity",
    { communityId, userId },
    () => {
      return dbUtil
        .updateMany(
          'usersCommunities',
          { 
            userId: userId, 
            communityId: communityId 
          },
          {
            $set: {
              isModerator: false,
            }
          }
        )
        .then((result) => {
          return result[0]
        });
    },
    null
  )
};

// changes all moderators in a community to members
// prettier-ignore
// export const removeModeratorsInCommunity = async (communityId: string): Promise<?Object> => {
//   const moderators = await db
//     .table('usersCommunities')
//     .getAll(communityId, { index: 'communityId' })
//     .filter({ isModerator: true })
//     .run()

//   if (!moderators || moderators.length === 0) return

//   return await db
//     .table('usersCommunities')
//     .getAll(communityId, { index: 'communityId' })
//     .filter({ isModerator: true })
//     .update({ isModerator: false }, { returnChanges: true })
//     .run();
// };
export const removeModeratorsInCommunity = async (communityId: string): Promise<?Object> => {
  return dbUtil.tryCallAsync(
    "removeModeratorsInCommunity",
    { communityId },
    async () => {
      const moderators = await db
        .collection('usersCommunities')
        .find({ 
          communityId: communityId, 
          isModerator: true 
        })
        .toArray()

      if (!moderators || moderators.length === 0) return

      return await dbUtil
        .updateMany(
          'usersCommunities',
          { 
            communityId: communityId, 
            isModerator: true 
          },
          {
            $set: {
              isModerator: false
            }
          }
        )
    },
    null
  )
};

// invoked when a user is deleting their account or being banned
// export const removeUsersCommunityMemberships = async (userId: string) => {
//   const memberships = await db
//     .table('usersCommunities')
//     .getAll(userId, { index: 'userId' })
//     .run();

//   if (!memberships || memberships.length === 0) return;

//   const memberCountPromises = memberships.map(member => {
//     return decrementMemberCount(member.communityId);
//   });

//   const removeMembershipsPromise = db
//     .table('usersCommunities')
//     .getAll(userId, { index: 'userId' })
//     .update({
//       isOwner: false,
//       isModerator: false,
//       isMember: false,
//       isPending: false,
//       receiveNotifications: false,
//     })
//     .run();

//   return Promise.all([memberCountPromises, removeMembershipsPromise]);
// };

export const removeUsersCommunityMemberships = async (userId: string) => {
  return dbUtil.tryCallAsync(
    'removeUsersCommunityMemberships',
    { userId },
    async () => {
      const memberships = await db
        .collection('usersCommunities')
        .find({ userId: userId })
        .toArray();

      if (!memberships || memberships.length === 0) return;

      const memberCountPromises = memberships.map(member => {
        return decrementMemberCount(member.communityId);
      });

      const removeMembershipsPromise = dbUtil.updateMany(
        db,
        'usersCommunities',
        {
          userId: userId,
        },
        {
          $set: {
            isOwner: false,
            isModerator: false,
            isMember: false,
            isPending: false,
            receiveNotifications: false,
          },
        }
      );

      return Promise.all([memberCountPromises, removeMembershipsPromise]);
    },
    null
  );
};

// prettier-ignore
// export const createPendingMemberInCommunity = async (communityId: string, userId: string): Promise<DBUsersCommunities> => {
//   return db
//     .table('usersCommunities')
//     .getAll([userId, communityId], { index: 'userIdAndCommunityId' })
//     .run()
//     .then(result => {
//       if (result && result.length > 0) {
//         // if the result exists, it means the user has a previous relationship
//         // with this community - we handle blocked logic upstream in the mutation,
//         // so in this case we can just update the record to be pending

//         return db
//           .table('usersCommunities')
//           .getAll([userId, communityId], { index: 'userIdAndCommunityId' })
//           .update(
//             {
//               createdAt: new Date(),
//               isPending: true
//             },
//             { returnChanges: 'always' }
//           )
//           .run();
//       } else {
//         // if no relationship exists, we can create a new one from scratch
//         return db
//           .table('usersCommunities')
//           .insert(
//             {
//               communityId,
//               userId,
//               createdAt: new Date(),
//               isMember: false,
//               isOwner: false,
//               isModerator: false,
//               isBlocked: false,
//               isPending: true,
//               receiveNotifications: true,
//               reputation: 0,
//             },
//             { returnChanges: true }
//           )
//           .run();
//       }
//     })
//     .then(result => {
//       return result.changes[0].new_val;
//     });
// }
export const createPendingMemberInCommunity = async (communityId: string, userId: string): Promise<DBUsersCommunities> => {
  return dbUtil.tryCallAsync(
    "createPendingMemberInCommunity",
    { communityId, userId },
    () => {
      return db
        .collection('usersCommunities')
        .find({ userId: userId, communityId: communityId })
        .toArray()
        .then(result => {
          if (result && result.length > 0) {
            // if the result exists, it means the user has a previous relationship
            // with this community - we handle blocked logic upstream in the mutation,
            // so in this case we can just update the record to be pending

            return dbUtil
              .updateMany(
                'usersCommunities',
                { 
                  userId: userId, 
                  communityId: communityId 
                },
                {
                  $set: {
                    createdAt: new Date(),
                    isPending: true
                  }
                }
              )
          } else {
            // if no relationship exists, we can create a new one from scratch
            
            return dbUtil
              .insert(
                'usersCommunities',
                {
                  communityId,
                  userId,
                  createdAt: new Date(),
                  isMember: false,
                  isOwner: false,
                  isModerator: false,
                  isBlocked: false,
                  isPending: true,
                  receiveNotifications: true,
                  reputation: 0,
                }
              )
              .then((result) => {
                return [result]
              })
          }
        })
        .then(result => {
          return result[0];
        });
    },
    null
  )
}

// prettier-ignore
// export const removePendingMemberInCommunity = async (communityId: string, userId: string): Promise<Object> => {
//   return db
//     .table('usersCommunities')
//     .getAll([userId, communityId], { index: 'userIdAndCommunityId'})
//     .update({
//       isPending: false,
//     })
//     .run()
// }
export const removePendingMemberInCommunity = async (communityId: string, userId: string): Promise<Object> => {
  return dbUtil.tryCallAsync(
    "removePendingMemberInCommunity",
    { communityId, userId },
    () => {
      return dbUtil
        .updateOne(
          'usersCommunities',
          { 
            userId: userId, 
            communityId: communityId 
          },
          {
            $set: {
              isPending: true
            }
          }
        )
    },
    null
  )
}

// export const approvePendingMemberInCommunity = async (
//   communityId: string,
//   userId: string
// ): Promise<DBUsersCommunities> => {
//   return db
//     .table('usersCommunities')
//     .getAll([userId, communityId], { index: 'userIdAndCommunityId' })
//     .update(
//       {
//         isMember: true,
//         isPending: false,
//         receiveNotifications: true,
//       },
//       { returnChanges: 'always' }
//     )
//     .run()
//     .then(result => {
//       incrementMemberCount(communityId);

//       return result.changes[0].new_val;
//     });
// };
export const approvePendingMemberInCommunity = async (
  communityId: string,
  userId: string
): Promise<DBUsersCommunities> => {
  return dbUtil.tryCallAsync(
    'approvePendingMemberInCommunity',
    { communityId, userId },
    () => {
      return dbUtil
        .updateMany(
          'usersCommunities',
          {
            userId: userId,
            communityId: communityId,
          },
          {
            $set: {
              isMember: true,
              isPending: false,
              receiveNotifications: true,
            },
          }
        )
        .then(result => {
          incrementMemberCount(communityId);

          return result[0];
        });
    },
    null
  );
};

// export const blockPendingMemberInCommunity = async (
//   communityId: string,
//   userId: string
// ): Promise<DBUsersCommunities> => {
//   return db
//     .table('usersCommunities')
//     .getAll([userId, communityId], { index: 'userIdAndCommunityId' })
//     .update(
//       {
//         isPending: false,
//         isBlocked: true,
//       },
//       { returnChanges: 'always' }
//     )
//     .run()
//     .then(result => {
//       return result.changes[0].new_val;
//     });
// };
export const blockPendingMemberInCommunity = async (
  communityId: string,
  userId: string
): Promise<DBUsersCommunities> => {
  return dbUtil.tryCallAsync(
    'blockPendingMemberInCommunity',
    { communityId, userId },
    () => {
      return dbUtil
        .updateMany(
          'usersCommunities',
          {
            userId: userId,
            communityId: communityId,
          },
          {
            $set: {
              isPending: false,
              isBlocked: true,
            },
          }
        )
        .then(result => {
          return result[0];
        });
    },
    null
  );
};

/*
===========================================================

            GETTING DATA FROM USERSCOMMUNITIES

===========================================================
*/

type Options = { first: number, after: number };

// prettier-ignore
// export const getMembersInCommunity = (communityId: string, options: Options): Promise<Array<string>> => {
//   const { first, after } = options
//   return db
//     .table('usersCommunities')
//     .between([communityId, true, db.minval], [communityId, true, db.maxval], {
//       index: 'communityIdAndIsMemberAndReputation',
//       leftBound: 'open',
//       rightBound: 'open',
//     })
//     .orderBy({ index: db.desc('communityIdAndIsMemberAndReputation') })
//     .skip(after || 0)
//     .limit(first || 25)
//     .map(userCommunity => userCommunity('userId'))
//     .run()
// };
export const getMembersInCommunity = (communityId: string, options: Options): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    "getMembersInCommunity",
    { communityId, options },
    () => {
      const { first, after } = options
      return db
        .collection('usersCommunities')
        .find({
          communityId: communityId,
          isMember: true,
          reputation: { 
            $gte: 0, 
            $lt: 999999 
          }
        })
        .sort({ communityId: -1, isMember: -1, reputation: -1 })
        .skip(after || 0)
        .limit(first || 25)
        .map(userCommunity => userCommunity.userId)
        .toArray()
    },
    []
  )
};

// prettier-ignore
// export const getBlockedUsersInCommunity = (communityId: string, options: Options): Promise<Array<string>> => {
//   return (
//     db
//       .table('usersCommunities')
//       .getAll([communityId, false], { index: 'communityIdAndIsMember' })
//       .filter({ isBlocked: true })
//       .skip(options.after || 0)
//       .limit(options.first || 25)
//       .map(userCommunity => userCommunity('userId'))
//       .run()
//   );
// };
export const getBlockedUsersInCommunity = (communityId: string, options: Options): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    "getBlockedUsersInCommunity",
    { communityId, options },
    () => {
      return (
        db
          .collection('usersCommunities')
          .find({ communityId: communityId, isMember: false })
          .filter({ isBlocked: true })
          .skip(options.after || 0)
          .limit(options.first || 25)
          .map(userCommunity => userCommunity.userId)
          .toArray()
        );
    },
    []
  )
};

// prettier-ignore
// export const getPendingUsersInCommunity = (communityId: string, options: Options): Promise<Array<string>> => {
//   return (
//     db
//       .table('usersCommunities')
//       .getAll([communityId, false], { index: 'communityIdAndIsMember' })
//       .filter({ isPending: true })
//       .skip(options.after || 0)
//       .limit(options.first || 25)
//       .map(userCommunity => userCommunity('userId'))
//       .run()
//   );
// };
export const getPendingUsersInCommunity = (communityId: string, options: Options): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    "getPendingUsersInCommunity",
    { communityId, options },
    () => {
      return (
        db
          .collection('usersCommunities')
          .find({ communityId: communityId, isMember: false })
          .filter({ isPending: true })
          .skip(options.after || 0)
          .limit(options.first || 25)
          .map(userCommunity => userCommunity.userId)
          .toArray()
      );
    },
    []
  )
};

// prettier-ignore
// export const getModeratorsInCommunity = (communityId: string, options: Options): Promise<Array<string>> => {
//   return (
//     db
//       .table('usersCommunities')
//       .getAll([communityId, true], { index: 'communityIdAndIsModerator' })
//       .skip(options.after || 0)
//       .limit(options.first || 25)
//       .map(userCommunity => userCommunity('userId'))
//       .run()
//   );
// };
export const getModeratorsInCommunity = (communityId: string, options: Options): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    "getModeratorsInCommunity",
    { communityId, options },
    () => {
      return (
        db
          .collection('usersCommunities')
          .find({ communityId: communityId, isModerator: true })
          .skip(options.after || 0)
          .limit(options.first || 25)
          .map(userCommunity => userCommunity.userId)
          .toArray()
      );
    },
    []
  )
};

// export const getOwnersInCommunity = (
//   communityId: string,
//   options: Options
// ): Promise<Array<string>> => {
//   return db
//     .table('usersCommunities')
//     .getAll([communityId, true], { index: 'communityIdAndIsOwner' })
//     .skip(options.after || 0)
//     .limit(options.first || 25)
//     .map(userCommunity => userCommunity('userId'))
//     .run();
// };
export const getOwnersInCommunity = (
  communityId: string,
  options: Options
): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    'getOwnersInCommunity',
    { communityId, options },
    () => {
      return db
        .collection('usersCommunities')
        .find({ communityId: communityId, isOwner: true })
        .skip(options.after || 0)
        .limit(options.first || 25)
        .map(userCommunity => userCommunity.userId)
        .toArray();
    },
    []
  );
};

// export const getTeamMembersInCommunity = (
//   communityId: string,
//   options: Options
// ): Promise<Array<string>> => {
//   return db
//     .table('usersCommunities')
//     .getAll([communityId, true], { index: 'communityIdAndIsTeamMember' })
//     .skip(options.after || 0)
//     .limit(options.first || 25)
//     .map(userCommunity => userCommunity('userId'))
//     .run();
// };
export const getTeamMembersInCommunity = (
  communityId: string,
  options: Options
): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    'getTeamMembersInCommunity',
    { communityId, options },
    () => {
      return db
        .collection('usersCommunities')
        .find({ communityId: communityId, isTeamMember: true })
        .skip(options.after || 0)
        .limit(options.first || 25)
        .map(userCommunity => userCommunity.userId)
        .toArray();
    },
    []
  );
};

export const DEFAULT_USER_COMMUNITY_PERMISSIONS = {
  isOwner: false,
  isMember: false,
  isModerator: false,
  isBlocked: false,
  isPending: false,
  receiveNotifications: false,
  reputation: 0,
};

// NOTE @BRIAN: DEPRECATED - DONT USE IN THE FUTURE
// prettier-ignore
// export const getUserPermissionsInCommunity = (communityId: string, userId: string): Promise<Object> => {
//   return db
//     .table('usersCommunities')
//     .getAll([userId, communityId], {
//       index: 'userIdAndCommunityId',
//     })
//     .run()
//     .then(data => {
//       // if a record exists
//       if (data.length > 0) {
//         return data[0];
//       } else {
//         // if a record doesn't exist, we're creating a new relationship
//         // so default to false for everything
//         return {
//           ...DEFAULT_USER_COMMUNITY_PERMISSIONS,
//           userId,
//           communityId,
//         };
//       }
//     });
// };
export const getUserPermissionsInCommunity = (communityId: string, userId: string): Promise<Object> => {
  return dbUtil.tryCallAsync(
    "getUserPermissionsInCommunity",
    { communityId, userId },
    () => {
      return db
        .collection('usersCommunities')
        .find({ userId: userId, communityId: communityId })
        .toArray()
        .then(data => {
          // if a record exists
          if (data.length > 0) {
            return data[0];
          } else {
            // if a record doesn't exist, we're creating a new relationship
            // so default to false for everything
            return {
              ...DEFAULT_USER_COMMUNITY_PERMISSIONS,
              userId,
              communityId,
            };
          }
        });
    },
    null
  )
};

// prettier-ignore
// export const checkUserPermissionsInCommunity = (communityId: string, userId: string): Promise<DBUsersCommunities> => {
//   return db
//     .table('usersCommunities')
//     .getAll([userId, communityId], { index: 'userIdAndCommunityId' })
//     .run();
// };
export const checkUserPermissionsInCommunity = (communityId: string, userId: string): Promise<DBUsersCommunities> => {
  return dbUtil.tryCallAsync(
    "checkUserPermissionsInCommunity",
    { communityId, userId },
    () => {
      return db
        .collection('usersCommunities')
        .find({ userId: userId, communityId: communityId })
        .toArray();
    },
    []
  )
};

type UserIdAndCommunityId = [?string, string];

// prettier-ignore
// export const getUsersPermissionsInCommunities = (input: Array<UserIdAndCommunityId>) => {
//   return db
//     .table('usersCommunities')
//     .getAll(...input, { index: 'userIdAndCommunityId' })
//     .run()
//     .then(data => {
//       if (!data)
//         return Array.from({ length: input.length }, (_, index) => ({
//           ...DEFAULT_USER_COMMUNITY_PERMISSIONS,
//           userId: input[index][0],
//           communityId: input[index][1],
//         }));

//       return data.map(
//         (rec, index) =>
//           rec
//             ? rec
//             : {
//                 ...DEFAULT_USER_COMMUNITY_PERMISSIONS,
//                 userId: input[index][0],
//                 communityId: input[index][1],
//               }
//       );
//     });
// };
export const getUsersPermissionsInCommunities = async (input: Array<UserIdAndCommunityId>) => {
  return dbUtil.tryCallAsync(
    "getUsersPermissionsInCommunities",
    { input },
    () => {
      return db
        .collection('usersCommunities')
        .find({
          $or: input.map(element => {
            return {
              userId: element[0],
              communityId: element[1]
            }
          })
        })
        .toArray()
        .then(data => {
          if (!data)
            return Array.from({ length: input.length }, (_, index) => ({
              ...DEFAULT_USER_COMMUNITY_PERMISSIONS,
              userId: input[index][0],
              communityId: input[index][1],
            }));

          return data.map(
            (rec, index) =>
              rec
                ? rec
                : {
                    ...DEFAULT_USER_COMMUNITY_PERMISSIONS,
                    userId: input[index][0],
                    communityId: input[index][1],
                  }
          );
        })
    },
    []
  )
};

// export const getReputationByUser = (userId: string): Promise<Number> => {
//   return db
//     .table('usersCommunities')
//     .getAll([userId, true], { index: 'userIdAndIsMember' })
//     .map(rec => rec('reputation'))
//     .count()
//     .default(0)
//     .run();
// };
export const getReputationByUser = (userId: string): Promise<Number> => {
  return dbUtil.tryCallAsync(
    'getReputationByUser',
    { userId },
    async () => {
      let ret = await db
        .collection('usersCommunities')
        .find({ userId: userId, isMember: true })
        .map(rec => rec.reputation)
        .toArray();
      ret = dbUtil.count(ret);
      return ret;
    },
    null
  );
};

// prettier-ignore
// export const getUsersTotalReputation = (userIds: Array<string>): Promise<Array<number>> => {
//   return db
//     .table('usersCommunities')
//     .getAll(...userIds.map(userId => ([userId, true])), { index: 'userIdAndIsMember' })
//     .group('userId')
//     .map(rec => rec('reputation'))
//     .reduce((l, r) => l.add(r))
//     .default(0)
//     .run()
//     .then(res =>
//       res.map(
//         res =>
//           res && {
//             reputation: res.reduction,
//             userId: res.group,
//           }
//       )
//     );
// };
export const getUsersTotalReputation = async (userIds: Array<string>): Promise<Array<number>> => {
  return dbUtil.tryCallAsync(
    "getUsersTotalReputation",
    { userIds },
    async () => {
      let ret = await db
        .collection("usersCommunities")
        .find({  
          userId: { $in: userIds },
          isMember: true
        })
        .toArray();
      ret = dbUtil.group(ret, "userId");
      ret = dbUtil.groupMap(ret, rec => {
        return rec.reputation;
      });
      ret = dbUtil.groupReduce(ret, (l, r) => {
        return l + r;
      }, 0);
      ret = dbUtil.then(ret, (res) => {
        res.map(
          res =>
            res && {
              reputation: res.reduction,
              userId: res.group,
            }
        )
      });
      return ret;
    },
    []
  )
};

// export const setCommunityLastSeen = (
//   communityId: string,
//   userId: string,
//   lastSeen: Date
// ) => {
//   return db
//     .table('usersCommunities')
//     .getAll([userId, communityId], { index: 'userIdAndCommunityId' })
//     .update(
//       {
//         lastSeen: db.branch(
//           db.row('lastSeen').lt(lastSeen),
//           lastSeen,
//           db.row('lastSeen')
//         ),
//       },
//       {
//         returnChanges: true,
//       }
//     )
//     .run();
// };
export const setCommunityLastSeen = (
  communityId: string,
  userId: string,
  lastSeen: Date
) => {
  return dbUtil.tryCallAsync(
    'setCommunityLastSeen',
    { communityId, userId, lastSeen },
    () => {
      return dbUtil.updateMany(
        db,
        'usersCommunities',
        {
          userId: userId,
          communityId: communityId,
        },
        {
          $set: {
            lastSeen: lastSeen,
          },
        }
      );
    },
    null
  );
};
