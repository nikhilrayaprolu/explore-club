// @flow
const { db } = require('shared/db');
import {
  incrementMemberCount,
  decrementMemberCount,
  setMemberCount,
} from './channel';
import type { DBUsersChannels, DBChannel } from 'shared/types';
const dbUtil = require('shared/dbUtil');

/*
===========================================================

        MODIFYING AND CREATING DATA IN USERSCHANNELS

===========================================================
*/

// invoked only when a new channel is being created. the user who is doing
// the creation is automatically an owner and a member
// prettier-ignore
// const createOwnerInChannel = (channelId: string, userId: string): Promise<DBChannel> => {
//   return db
//     .table('usersChannels')
//     .insert(
//       {
//         channelId,
//         userId,
//         createdAt: new Date(),
//         isOwner: true,
//         isMember: true,
//         isModerator: false,
//         isBlocked: false,
//         isPending: false,
//         receiveNotifications: true,
//       },
//       { returnChanges: true }
//     )
//     .run()
//     .then(async result => {
//       const join = result.changes[0].new_val;
//       await incrementMemberCount(channelId)
//       return db.table('channels').get(join.channelId).run();
//     });
// };
const createOwnerInChannel = (channelId: string, userId: string): Promise<DBChannel> => {
  return dbUtil.tryCallAsync(
    "createOwnerInChannel",
    { channelId, userId },
    () => {
      return dbUtil
        .insert(
          db,
          'usersChannels',
          {
            channelId,
            userId,
            createdAt: new Date(),
            isOwner: true,
            isMember: true,
            isModerator: false,
            isBlocked: false,
            isPending: false,
            receiveNotifications: true,
          }
        )
        .then(async result => {
          const join = result[0];
          await incrementMemberCount(channelId)
          return db.collection('channels').findOne({id: join.channelId});
        });
    },
    null
  )
};

// creates a single member in a channel. invoked when a user joins a public channel
// prettier-ignore
// const createMemberInChannel = (channelId: string, userId: string): Promise<DBChannel> => {
//   return db
//     .table('usersChannels')
//     .getAll([userId, channelId], { index: 'userIdAndChannelId' })
//     .run()
//     .then(result => {
//       if (result && result.length > 0) {
//         return db
//           .table('usersChannels')
//           .getAll([userId, channelId], { index: 'userIdAndChannelId' })
//           .filter({ isBlocked: false })
//           .update(
//             {
//               createdAt: new Date(),
//               isMember: true,
//               receiveNotifications: true,
//             },
//             { returnChanges: 'always' }
//           )
//           .run();
//       } else {
//         return db
//           .table('usersChannels')
//           .insert(
//             {
//               channelId,
//               userId,
//               createdAt: new Date(),
//               isMember: true,
//               isOwner: false,
//               isModerator: false,
//               isBlocked: false,
//               isPending: false,
//               receiveNotifications: true,
//             },
//             { returnChanges: true }
//           )
//           .run();
//       }
//     })
//     .then(async () => {
//       await incrementMemberCount(channelId)
//       return db.table('channels').get(channelId).run()
//     });
// };
const createMemberInChannel = (channelId: string, userId: string): Promise<DBChannel> => {
  return dbUtil.tryCallAsync(
    "createMemberInChannel",
    { channelId, userId },
    () => {
      return db
        .collection('usersChannels')
        .find({ userId: userId, channelId: channelId })
        .toArray()
        .then(result => {
          if (result && result.length > 0) {
            return dbUtil
              .updateMany(
                'usersChannels',
                { 
                  userId: userId, 
                  channelId: channelId, 
                  isBlocked: false 
                },
                {
                  $set: {
                    createdAt: new Date(),
                    isMember: true,
                    receiveNotifications: true,
                  }
                }
              );
          } else {
            return dbUtil
              .insert(
                'usersChannels',
                {
                  channelId,
                  userId,
                  createdAt: new Date(),
                  isMember: true,
                  isOwner: false,
                  isModerator: false,
                  isBlocked: false,
                  isPending: false,
                  receiveNotifications: true,
                },
              )
          }
        })
        .then(async () => {
          await incrementMemberCount(channelId)
          return db.table('channels').get(channelId).run()
        });
    },
    null
  )
};

// removes a single member from a channel. will be invoked if a user leaves a channel
// prettier-ignore
// const removeMemberInChannel = (channelId: string, userId: string): Promise<?DBChannel> => {
//   return db
//     .table('usersChannels')
//     .getAll([userId, channelId], { index: 'userIdAndChannelId' })
//     .update(
//       {
//         isModerator: false,
//         isMember: false,
//         isPending: false,
//         receiveNotifications: false,
//       },
//       { returnChanges: 'always' }
//     )
//     .run()
//     .then(async result => {
//       if (result && result.changes && result.changes.length > 0) {
//         const join = result.changes[0].old_val;

//         await decrementMemberCount(channelId)
//         return db.table('channels').get(join.channelId).run();
//       } else {
//         return null;
//       }
//     });
// };
const removeMemberInChannel = async (channelId: string, userId: string): Promise<?DBChannel> => {
  return dbUtil.tryCallAsync(
    "removeMemberInChannel",
    { channelId, userId },
    () => {
      return db
        .updateMany(
          'usersChannels',
          { 
            userId: userId, 
            channelId: channelId 
          }, 
          {
            $set: {
              isModerator: false,
              isMember: false,
              isPending: false,
              receiveNotifications: false,
            }
          }
        )
        .then(async result => {
          const join = result;

          await decrementMemberCount(channelId)
          return db.collection('channels').find({ id: join.channelId });
        });
    },
    null
  )
};

// prettier-ignore
// const unblockMemberInChannel = (channelId: string, userId: string): Promise<?DBChannel> => {
//   return db
//     .table('usersChannels')
//     .getAll([userId, channelId], { index: 'userIdAndChannelId' })
//     .update(
//       {
//         isBlocked: false,
//       },
//       { returnChanges: 'always' }
//     )
//     .run()
//     .then(result => {
//       if (result && result.changes && result.changes.length > 0) {
//         return db.table('channels').get(channelId).run();
//       } else {
//         return null;
//       }
//     });
// };
const unblockMemberInChannel = (channelId: string, userId: string): Promise<?DBChannel> => {
  return dbUtil.tryCallAsync(
    "unblockMemberInChannel",
    { channelId, userId },
    () => {
      return dbUtil
        .updateMany(
          'usersChannels',
          { 
            userId: userId, 
            channelId: channelId 
          }, 
          {
            $set: {
              isBlocked: false,
            }
          }
        )
        .then(result => {
          return db.collection('channels').findOne({ id: channelId });
        });
    },
    null
  )
};

// removes all the user relationships to a channel. will be invoked when a
// channel is deleted, at which point we don't want any records in the
// database to show a user relationship to the deleted channel
// prettier-ignore
// const removeMembersInChannel = async (channelId: string): Promise<Array<?DBUsersChannels>> => {
//   await setMemberCount(channelId, 0)

//   return db
//     .table('usersChannels')
//     .getAll(channelId, { index: 'channelId' })
//     .update({
//       isMember: false,
//       receiveNotifications: false,
//     })
//     .run();
// };
const removeMembersInChannel = async (channelId: string): Promise<Array<?DBUsersChannels>> => {
  return dbUtil.tryCallAsync(
    "removeMembersInChannel",
    { channelId },
    async () => {
      await setMemberCount(channelId, 0)

      return dbUtil
        .updateMany(
          'usersChannels',
          { 
            channelId: channelId 
          }, 
          {
            $set: {
              isMember: false,
              receiveNotifications: false,
            }
          });
        },
    []
  )
};

// creates a single pending user in channel. invoked only when a user is requesting
// to join a private channel
// prettier-ignore
// const createOrUpdatePendingUserInChannel = (channelId: string, userId: string): Promise<DBChannel> => {
//   return db
//     .table('usersChannels')
//     .getAll([userId, channelId], { index: 'userIdAndChannelId' })
//     .run()
//     .then(data => {
//       if (data && data.length > 0) {
//         return db
//           .table('usersChannels')
//           .getAll([userId, channelId], { index: 'userIdAndChannelId' })
//           .update(
//             {
//               isPending: true,
//             },
//             { returnChanges: true }
//           )
//           .run();
//       } else {
//         return db
//           .table('usersChannels')
//           .insert(
//             {
//               channelId,
//               userId,
//               createdAt: new Date(),
//               isMember: false,
//               isOwner: false,
//               isModerator: false,
//               isBlocked: false,
//               isPending: true,
//               receiveNotifications: false,
//             },
//             { returnChanges: true }
//           )
//           .run();
//       }
//     })
//     .then(() => {
//       return db.table('channels').get(channelId).run();
//     });
// };
const createOrUpdatePendingUserInChannel = (channelId: string, userId: string): Promise<DBChannel> => {
  return dbUtil.tryCallAsync(
    "createOrUpdatePendingUserInChannel",
    { channelId, userId },
    () => {
      return db
        .collection('usersChannels')
        .find({ 
          userId: userId, 
          channelId: channelId 
        })
        .toArray()
        .then(data => {
          if (data && data.length > 0) {
            return dbUtil
              .updateMany(
                'usersChannels',
                { 
                  userId: userId, 
                  channelId: channelId 
                }, 
                {
                  $set: {
                    isPending: false
                  }
                }
              )
          } else {
            return dbUtil
              .insert(
                'usersChannels',
                {
                  channelId,
                  userId,
                  createdAt: new Date(),
                  isMember: false,
                  isOwner: false,
                  isModerator: false,
                  isBlocked: false,
                  isPending: true,
                  receiveNotifications: false,
                }
              )
          }
        })
        .then(() => {
          return db.collection('channels').findOne({ id: channelId });
        });
    },
    null
  )
};

// removes a collection of pending users from a channel. invoked only when a private
// channel is converted into a public channel, at which point we delete all pending
// user associations. this will allow those pending users to re-join if they
// choose, but will not add unwanted users to the now-public channel
// const removePendingUsersInChannel = (channelId: string): Promise<DBChannel> => {
//   return db
//     .table('usersChannels')
//     .getAll([channelId, 'pending'], { index: 'channelIdAndRole' })
//     .update({
//       isPending: false,
//       receiveNotifications: false,
//     })
//     .run()
//     .then(result => {
//       const join = result.changes[0].new_val;
//       return db
//         .table('channels')
//         .get(join.channelId)
//         .run();
//     });
// };
const removePendingUsersInChannel = async (
  channelId: string
): Promise<DBChannel> => {
  return dbUtil.tryCallAsync(
    'removePendingUsersInChannel',
    { channelId },
    () => {
      return dbUtil
        .updateMany(
          'usersChannels',
          {
            channelId: channelId,
            isPending: true,
          },
          {
            $set: {
              isPending: false,
              receiveNotifications: false,
            },
          }
        )
        .then(result => {
          const join = result[0];
          return db.collection('channels').findOne({ id: join.channelId });
        });
    },
    null
  );
};

// toggles user to blocked in a channel. invoked by a channel or community
// owner when managing a private channel. sets pending to false to handle
// private channels modifying pending users to be blocked
// prettier-ignore
// const blockUserInChannel = async (channelId: string, userId: string): Promise<DBUsersChannels> => {
//   await decrementMemberCount(channelId)

//   return db
//     .table('usersChannels')
//     .getAll([userId, channelId], { index: 'userIdAndChannelId' })
//     .update(
//       {
//         isMember: false,
//         isModerator: false,
//         isOwner: false,
//         isPending: false,
//         isBlocked: true,
//         receiveNotifications: false,
//       },
//       { returnChanges: true }
//     )
//     .run();
// };
const blockUserInChannel = async (channelId: string, userId: string): Promise<DBUsersChannels> => {
  return dbUtil.tryCallAsync(
    "blockUserInChannel",
    { channelId, userId },
    async () => {
      await decrementMemberCount(channelId)

      return dbUtil
        .updateMany(
          'usersChannels',
          { 
            userId: userId, 
            channelId: channelId 
          }, 
          {
            $set: {
              isMember: false,
              isModerator: false,
              isOwner: false,
              isPending: false,
              isBlocked: true,
              receiveNotifications: false,
            }
          }
        )
    },
    null
  )
};

// toggles a pending user to member in a channel. invoked by a channel or community
// owner when managing a private channel
// prettier-ignore
// const approvePendingUserInChannel = async (channelId: string, userId: string): Promise<DBUsersChannels> => {
//   await incrementMemberCount(channelId)

//   return db
//     .table('usersChannels')
//     .getAll([userId, channelId], { index: 'userIdAndChannelId' })
//     .update(
//       {
//         isMember: true,
//         isPending: false,
//         receiveNotifications: true,
//       },
//       { returnChanges: true }
//     )
//     .run()
//     .then(() => {
//       return db.table('channels').get(channelId).run();
//     });
// };
const approvePendingUserInChannel = async (channelId: string, userId: string): Promise<DBUsersChannels> => {
  return dbUtil.tryCallAsync(
    "approvePendingUserInChannel",
    { channelId, userId },
    async () => {
      await incrementMemberCount(channelId)

      return dbUtil
        .updateMany(
          'usersChannels',
          { 
            userId: userId, 
            channelId: channelId 
          },
          {
            $set: {
              isMember: true,
              isPending: false,
              receiveNotifications: true,
            }
          }
        )
        .then(() => {
          return db.collection('channels').findOne({ id: channelId });
        });
    },
    null
  )
};

// toggles all pending users to make them a member in a channel. invoked by a
// channel or community owner when turning a private channel into a public
// channel
// prettier-ignore
// const approvePendingUsersInChannel = async (channelId: string): Promise<DBUsersChannels> => {
//   const currentCount = await db.table('usersChannels')
//     .getAll(
//       [channelId, 'member'],
//       [channelId, 'moderator'],
//       [channelId, 'owner'],
//       {
//         index: 'channelIdAndRole',
//       }
//     )
//     .count()
//     .default(1)
//     .run()

//   const pendingCount = await db.table('usersChannels')
//     .getAll([channelId, "pending"], { index: 'channelIdAndRole' })
//     .count()
//     .default(0)
//     .run()

//   setMemberCount(channelId, currentCount + pendingCount)

//   return db
//     .table('usersChannels')
//     .getAll([channelId, "pending"], { index: 'channelIdAndRole' })
//     .update(
//       {
//         isMember: true,
//         isPending: false,
//         receiveNotifications: true,
//       },
//       { returnChanges: true }
//     )
//     .run()
// };
const approvePendingUsersInChannel = async (channelId: string): Promise<DBUsersChannels> => {
  return dbUtil.tryCallAsync(
    "approvePendingUsersInChannel",
    { channelId },
    async () => {
      const currentCount = await db
        .collection('usersChannels')
        .countDocuments({
          channelId: channelId,
          $or: [
            { isMember: true },
            { isModerator: true },
            { isOwner: true }
          ]
        });

      const pendingCount = await db
        .collection('usersChannels')
        .countDocuments({ 
          channelId: channelId, 
          isPending: true 
        });

      setMemberCount(channelId, currentCount + pendingCount)

      return db
        .collection('usersChannels')
        .updateMany(
          { 
            channelId: channelId, 
            isPending: true 
          },
          {
            $set: {
              isMember: true,
              isPending: false,
              receiveNotifications: true,
            }
          }
        )
    },
    null
  )
};

// unblocks a blocked user in a channel. invoked by a channel or community
// owner when managing a private channel. this *does* add the user
// as a member
// prettier-ignore
// const approveBlockedUserInChannel = async (channelId: string, userId: string): Promise<DBUsersChannels> => {
//   await incrementMemberCount(channelId)

//   return db
//     .table('usersChannels')
//     .getAll([userId, channelId], { index: 'userIdAndChannelId' })
//     .filter({ isBlocked: true })
//     .update(
//       {
//         isMember: true,
//         isBlocked: false,
//         receiveNotifications: false,
//       },
//       { returnChanges: true }
//     )
//     .run();
// };
const approveBlockedUserInChannel = async (channelId: string, userId: string): Promise<DBUsersChannels> => {
  return dbUtil.tryCallAsync(
    "approveBlockedUserInChannel",
    { channelId, userId },
    async () => {
      await incrementMemberCount(channelId)

      return dbUtil
        .updateMany(
          'usersChannels',
          { 
            userId: userId, 
            channelId: channelId, 
            isBlocked: true 
          },
          {
            $set: {
              isMember: true,
              isBlocked: false,
              receiveNotifications: false,
            }
          }
        )
    },
    null
  )
};

// moves a moderator to be only a member in a channel. does not remove them from the channel
// const removeModeratorInChannel = (
//   channelId: string,
//   userId: string
// ): Promise<DBUsersChannels> => {
//   return db
//     .table('usersChannels')
//     .getAll([userId, channelId], { index: 'userIdAndChannelId' })
//     .update({
//       isModerator: false,
//     })
//     .run();
// };
const removeModeratorInChannel = (
  channelId: string,
  userId: string
): Promise<DBUsersChannels> => {
  return dbUtil.tryCallAsync(
    'removeModeratorInChannel',
    { channelId, userId },
    () => {
      return dbUtil.updateMany(
        db,
        'usersChannels',
        {
          userId: userId,
          channelId: channelId,
        },
        {
          $set: {
            isModerator: false,
          },
        }
      );
    },
    null
  );
};

// creates a new relationship between the user and all of a community's
// default channels, skipping over any relationships that already exist
// prettier-ignore
// const createMemberInDefaultChannels = (communityId: string, userId: string): Promise<Array<Object>> => {
//   // get the default channels for the community being joined
//   const defaultChannels = db
//     .table('channels')
//     .getAll(communityId, { index: 'communityId' })
//     .filter({ isDefault: true })
//     .run();

//   // get the current user's relationships to all channels

//   const usersChannels = db
//     .table('usersChannels')
//     .getAll(userId, { index: 'userId' })
//     .run();

//   return Promise.all([defaultChannels, usersChannels]).then(
//     ([defaultChannels, usersChannels]) => {
//       // convert default channels and users channels to arrays of ids
//       // to efficiently filter down to find the default channels that exist
//       // which a user has not joined
//       const defaultChannelIds = defaultChannels.map(channel => channel.id);
//       const usersChannelIds = usersChannels.map(e => e.channelId);

//       // returns a list of Ids that represent channels which are defaults
//       // in the community but the user has no relationship with yet
//       const defaultChannelsTheUserHasNotJoined = defaultChannelIds.filter(
//         channelId => usersChannelIds.indexOf(channelId) >= -1
//       );

//       // create all the necessary relationships
//       return Promise.all(
//         defaultChannelsTheUserHasNotJoined.map(channel =>
//           createMemberInChannel(channel, userId)
//         )
//       );
//     }
//   );
// };
const createMemberInDefaultChannels = (communityId: string, userId: string): Promise<Array<Object>> => {
  return dbUtil.tryCallAsync(
    "createMemberInDefaultChannels",
    { communityId, userId },
    () => {
      // get the default channels for the community being joined
      const defaultChannels = db
        .collection('channels')
        .find({ 
          communityId: communityId, 
          isDefault: true 
        })
        .toArray();

      // get the current user's relationships to all channels

      const usersChannels = db
        .collection('usersChannels')
        .find({ userId: userId })
        .toArray();

      return Promise.all([defaultChannels, usersChannels]).then(
        ([defaultChannels, usersChannels]) => {
          // convert default channels and users channels to arrays of ids
          // to efficiently filter down to find the default channels that exist
          // which a user has not joined
          const defaultChannelIds = defaultChannels.map(channel => channel.id);
          const usersChannelIds = usersChannels.map(e => e.channelId);

          // returns a list of Ids that represent channels which are defaults
          // in the community but the user has no relationship with yet
          const defaultChannelsTheUserHasNotJoined = defaultChannelIds.filter(
            channelId => usersChannelIds.indexOf(channelId) >= -1
          );

          // create all the necessary relationships
          return Promise.all(
            defaultChannelsTheUserHasNotJoined.map(channel =>
              createMemberInChannel(channel, userId)
            )
          );
        }
      );
    },
    null
  )
};

// prettier-ignore
// const toggleUserChannelNotifications = async (userId: string, channelId: string, value: boolean): Promise<?DBChannel> => {
//   const permissions = await db
//     .table('usersChannels')
//     .getAll([userId, channelId], { index: 'userIdAndChannelId' })
//     .run();

//   const channel = await db
//     .table('channels')
//     .get(channelId)
//     .run()

//   // permissions exist, this user is trying to toggle notifications for a channel where they
//   // are already a member
//   if (permissions && permissions.length > 0) {
//     return db
//       .table('usersChannels')
//       .getAll([userId, channelId], { index: 'userIdAndChannelId' })
//       .update({ receiveNotifications: value })
//       .run();
//   }

//   // if the channel isn't private, it means the user is enabling notifications
//   // in a public channel that they have not yet joined - for example, if a user
//   // joins a community, then some time later the community creates a new channel,
//   // then again some time later the user wants notifications about that channel
//   if (!channel.isPrivate) {
//     // if permissions don't exist, create a usersChannel relationship with notifications on
//     return createMemberInChannel(channelId, userId)
//   }

//   return null
// };
const toggleUserChannelNotifications = async (userId: string, channelId: string, value: boolean): Promise<?DBChannel> => {
  return dbUtil.tryCallAsync(
    "toggleUserChannelNotifications",
    { userId, channelId, value },
    async () => {
      const permissions = await db
        .collection('usersChannels')
        .find({ 
          userId: userId, 
          channelId: channelId 
        })
        .toArray();

      const channel = await db
        .collection('channels')
        .findOne({ id: channelId })

      // permissions exist, this user is trying to toggle notifications for a channel where they
      // are already a member
      if (permissions && permissions.length > 0) {
        return db
          .collection('usersChannels')
          .updateMany({ userId: userId, channelId: channelId }, {
            $set: {
              receiveNotifications: valu
            }
          })
      }

      // if the channel isn't private, it means the user is enabling notifications
      // in a public channel that they have not yet joined - for example, if a user
      // joins a community, then some time later the community creates a new channel,
      // then again some time later the user wants notifications about that channel
      if (!channel.isPrivate) {
        // if permissions don't exist, create a usersChannel relationship with notifications on
        return createMemberInChannel(channelId, userId)
      }

      return null;
    },
    null
  )
};

// const removeUsersChannelMemberships = async (userId: string) => {
//   const usersChannels = await db
//     .table('usersChannels')
//     .getAll(userId, { index: 'userId' })
//     .run();

//   if (!usersChannels || usersChannels.length === 0) return;

//   const memberCountPromises = usersChannels.map(usersChannel => {
//     return decrementMemberCount(usersChannel.channelId);
//   });

//   const channelPromise = db
//     .table('usersChannels')
//     .getAll(userId, { index: 'userId' })
//     .update({
//       isOwner: false,
//       isModerator: false,
//       isMember: false,
//       receiveNotifications: false,
//     })
//     .run();

//   return await Promise.all([memberCountPromises, channelPromise]);
// };
const removeUsersChannelMemberships = async (userId: string) => {
  return dbUtil.tryCallAsync(
    'removeUsersChannelMemberships',
    { userId },
    async () => {
      const usersChannels = await db
        .collection('usersChannels')
        .find({ userId: userId })
        .toArray();

      if (!usersChannels || usersChannels.length === 0) return;

      const memberCountPromises = usersChannels.map(usersChannel => {
        return decrementMemberCount(usersChannel.channelId);
      });

      const channelPromise = dbUtil.updateMany(
        db,
        'usersChannels',
        { userId: userId },
        {
          $set: {
            isOwner: false,
            isModerator: false,
            isMember: false,
            receiveNotifications: false,
          },
        }
      );

      return await Promise.all([memberCountPromises, channelPromise]);
    },
    null
  );
};

/*
===========================================================

            GETTING DATA FROM USERSCHANNELS

===========================================================
*/

type Options = { first: number, after: number };
// prettier-ignore
// const getMembersInChannel = (channelId: string, options: Options): Promise<Array<string>> => {
//   const { first, after } = options

//   return (
//     db
//       .table('usersChannels')
//       .getAll([channelId, "member"], [channelId, "moderator"], [channelId, "owner"], { index: 'channelIdAndRole' })
//       .skip(after || 0)
//       .limit(first || 25)
//       // return an array of the userIds to be loaded by gql
//       .map(userChannel => userChannel('userId'))
//       .run()
//   );
// };
const getMembersInChannel = (channelId: string, options: Options): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    "getMembersInChannel",
    { channelId, options },
    () => {
      const { first, after } = options

      return (
        db
          .collection('usersChannels')
          .find({ 
            channelId: channelId,
            $or: [
              { isMember: true },
              { isModerator: true },
              { isOwner: true }
            ]
          })
          .skip(after || 0)
          .limit(first || 25)
          // return an array of the userIds to be loaded by gql
          .map(userChannel => userChannel.userId)
          .toArray()
      );
    },
    []
  )
};

// prettier-ignore
// const getPendingUsersInChannel = (channelId: string): Promise<Array<string>> => {
//   return (
//     db
//       .table('usersChannels')
//       .getAll([channelId, "pending"], { index: 'channelIdAndRole' })
//       // return an array of the userIds to be loaded by gql
//       .map(userChannel => userChannel('userId'))
//       .run()
//   );
// };
const getPendingUsersInChannel = (channelId: string): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    "getPendingUsersInChannel",
    { channelId },
    () => {
      return (
        db
          .collection('usersChannels')
          .find({ 
            channelId: channelId, 
            isPending: true 
          })
          // return an array of the userIds to be loaded by gql
          .map(userChannel => userChannel.userId)
          .toArray()
      );
    },
    null
  )
};

// const getPendingUsersInChannels = (channelIds: Array<string>) => {
//   return db
//     .table('usersChannels')
//     .getAll(...channelIds.map(id => [id, 'pending']), {
//       index: 'channelIdAndRole',
//     })
//     .group('channelId')
//     .run();
// };
const getPendingUsersInChannels = async (channelIds: Array<string>) => {
  return dbUtil.tryCallAsync(
    'getPendingUsersInChannels',
    { channelIds },
    () => {
      return db
        .collection('usersChannels')
        .find({
          channelId: {
            $in: channelIds,
          },
          isPending: true,
        })
        .toArray();
    },
    []
  );
};

// prettier-ignore
// const getBlockedUsersInChannel = (channelId: string): Promise<Array<string>> => {
//   return (
//     db
//       .table('usersChannels')
//       .getAll([channelId, 'blocked'], {
//         index: 'channelIdAndRole',
//       })
//       // return an array of the userIds to be loaded by gql
//       .map(userChannel => userChannel('userId'))
//       .run()
//   );
// };
const getBlockedUsersInChannel = (channelId: string): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    "getBlockedUsersInChannel",
    { channelId },
    () => {
      return (
        db
          .collection('usersChannels')
          .find({ 
            channelId: channelId, 
            isBlocked: true 
          })
          // return an array of the userIds to be loaded by gql
          .map(userChannel => userChannel.userId)
          .toArray()
      );
    },
    []
  )
};

// const getModeratorsInChannel = (channelId: string): Promise<Array<string>> => {
//   return (
//     db
//       .table('usersChannels')
//       .getAll([channelId, 'moderator'], {
//         index: 'channelIdAndRole',
//       })
//       // return an array of the userIds to be loaded by gql
//       .map(userChannel => userChannel('userId'))
//       .run()
//   );
// };
const getModeratorsInChannel = (channelId: string): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    'getModeratorsInChannel',
    { channelId },
    () => {
      return (
        db
          .collection('usersChannels')
          .find({
            channelId: channelId,
            isModerator: true,
          })
          // return an array of the userIds to be loaded by gql
          .map(userChannel => userChannel.userId)
          .toArray()
      );
    },
    null
  );
};

// const getOwnersInChannel = (channelId: string): Promise<Array<string>> => {
//   return (
//     db
//       .table('usersChannels')
//       .getAll([channelId, 'owner'], {
//         index: 'channelIdAndRole',
//       })
//       // return an array of the userIds to be loaded by gql
//       .map(userChannel => userChannel('userId'))
//       .run()
//   );
// };
const getOwnersInChannel = (channelId: string): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    'getOwnersInChannel',
    { channelId },
    () => {
      return (
        db
          .collection('usersChannels')
          .find({ channelId: channelId, isOwner: true })
          // return an array of the userIds to be loaded by gql
          .map(userChannel => userChannel.userId)
          .toArray()
      );
    },
    null
  );
};

const DEFAULT_USER_CHANNEL_PERMISSIONS = {
  isOwner: false,
  isMember: false,
  isModerator: false,
  isBlocked: false,
  isPending: false,
  receiveNotifications: false,
};

// prettier-ignore
// const getUserPermissionsInChannel = (channelId: string, userId: string): Promise<DBUsersChannels> => {
//   return db
//     .table('usersChannels')
//     .getAll([userId, channelId], { index: 'userIdAndChannelId' })
//     .run()
//     .then(data => {
//       // if a record exists
//       if (data.length > 0) {
//         return data[0];
//       } else {
//         // if a record doesn't exist, we're creating a new relationship
//         // so default to false for everything
//         return DEFAULT_USER_CHANNEL_PERMISSIONS;
//       }
//     });
// };
const getUserPermissionsInChannel = (channelId: string, userId: string): Promise<DBUsersChannels> => {
  return dbUtil.tryCallAsync(
    "getUserPermissionsInChannel",
    { channelId, userId },
    () => {
      return db
        .collection('usersChannels')
        .find({ 
          userId: userId, 
          channelId: channelId 
        })
        .toArray()
        .then(data => {
          // if a record exists
          if (data.length > 0) {
            return data[0];
          } else {
            // if a record doesn't exist, we're creating a new relationship
            // so default to false for everything
            return DEFAULT_USER_CHANNEL_PERMISSIONS;
          }
        });
    },
    null
  )
};

type UserIdAndChannelId = [?string, string];

// prettier-ignore
// const getUsersPermissionsInChannels = (input: Array<UserIdAndChannelId>): Promise<Array<DBUsersChannels>> => {
//   return db
//     .table('usersChannels')
//     .getAll(...input, { index: 'userIdAndChannelId' })
//     .run()
//     .then(data => {
//       if (!data || data.length === 0)
//         return Array.from({ length: input.length }).map((_, index) => ({
//           ...DEFAULT_USER_CHANNEL_PERMISSIONS,
//           userId: input[index][0],
//           channelId: input[index][1],
//         }));

//       return data.map((rec, index) => {
//         if (rec) return rec;

//         return {
//           ...DEFAULT_USER_CHANNEL_PERMISSIONS,
//           userId: input[index][0],
//           channelId: input[index][1],
//         };
//       });
//     });
// };
const getUsersPermissionsInChannels = async (input: Array<UserIdAndChannelId>): Promise<Array<DBUsersChannels>> => {
  return dbUtil.tryCallAsync(
    "getUsersPermissionsInChannels",
    { input },
    () => {
      return db
        .collection('usersChannels')
        .find({ 
          $or: input.map(value => {
            return {
              userId: value[0],
              channelId: value[1]
            }
          })
        })
        .toArray()
        .then(data => {
          if (!data || data.length === 0)
            return Array.from({ length: input.length }).map((_, index) => ({
              ...DEFAULT_USER_CHANNEL_PERMISSIONS,
              userId: input[index][0],
              channelId: input[index][1],
            }));
        
          return data.map((rec, index) => {
            if (rec) return rec;
        
            return {
              ...DEFAULT_USER_CHANNEL_PERMISSIONS,
              userId: input[index][0],
              channelId: input[index][1],
            };
          });
        })
    },
    null
  ) 
};

// const getUserUsersChannels = (userId: string) => {
//   return db
//     .table('usersChannels')
//     .getAll([userId, 'member'], [userId, 'owner'], [userId, 'moderator'], {
//       index: 'userIdAndRole',
//     })
//     .run();
// };
const getUserUsersChannels = (userId: string) => {
  return dbUtil.tryCallAsync(
    'getUserUsersChannels',
    { userId },
    () => {
      return db
        .collection('usersChannels')
        .find({
          userId: userId,
          $or: [{ isMember: true }, { isModerator: true }, { isOwner: true }],
        })
        .toArray();
    },
    []
  );
};

// const getUserChannelIds = (userId: string) => {
//   return db
//     .table('usersChannels')
//     .getAll([userId, 'member'], [userId, 'owner'], [userId, 'moderator'], {
//       index: 'userIdAndRole',
//     })
//     .map(rec => rec('channelId'))
//     .run();
// };
const getUserChannelIds = (userId: string) => {
  return dbUtil.tryCallAsync(
    'getUserChannelIds',
    { userId },
    () => {
      return db
        .collection('usersChannels')
        .find({
          userId: userId,
          $or: [{ isMember: true }, { isModerator: true }, { isOwner: true }],
        })
        .map(rec => rec.channelId)
        .toArray();
    },
    null
  );
};

// const getUserChannelIds = createQuery({
//   read: (userId: string) =>
//     db
//       .table('usersChannels')
//       .getAll(userId, { index: 'userId' })
//       .filter({ isMember: true })
//       .map(rec => rec('channelId')),
//   tags: (userId: string) => (usersChannels: ?Array<DBUsersChannels>) => [
//     userId,
//     ...(usersChannels || []).map(({ channelId }) => channelId),
//     ...(usersChannels || []).map(({ id }) => id),
//   ],
// });

module.exports = {
  // modify and create
  createOwnerInChannel,
  createMemberInChannel,
  removeMemberInChannel,
  unblockMemberInChannel,
  removeMembersInChannel,
  createOrUpdatePendingUserInChannel,
  removePendingUsersInChannel,
  blockUserInChannel,
  approvePendingUserInChannel,
  approvePendingUsersInChannel,
  approveBlockedUserInChannel,
  removeModeratorInChannel,
  createMemberInDefaultChannels,
  toggleUserChannelNotifications,
  removeUsersChannelMemberships,
  // get
  getMembersInChannel,
  getPendingUsersInChannel,
  getBlockedUsersInChannel,
  getModeratorsInChannel,
  getOwnersInChannel,
  getUserPermissionsInChannel,
  getUsersPermissionsInChannels,
  getPendingUsersInChannels,
  getUserUsersChannels,
  getUserChannelIds,
  // constants
  DEFAULT_USER_CHANNEL_PERMISSIONS,
};
