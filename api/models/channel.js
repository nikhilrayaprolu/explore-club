// -@-f-l-o-w
const { db } = require('shared/db');
import { sendChannelNotificationQueue } from 'shared/bull/queues';
import type { DBChannel } from 'shared/types';
const dbUtil = require('shared/dbUtil');

// reusable query parts -- begin
// const channelsByCommunitiesQuery = (...communityIds: string[]) =>
//   db
//     .table('channels')
//     .getAll(...communityIds, { index: 'communityId' })
//     .filter(channel => channel.hasFields('deletedAt').not());
// checked
const channelsByCommunitiesQuery = (...communityIds) => {
  return dbUtil.tryCallAsync(
    'channelsByCommunitiesQuery',
    { communityIds },
    () => {
      return db
        .collection('channels')
        .find({
          communityId: {
            $in: communityIds,
          },
          deletedAt: null,
        })
        .toArray();
    },
    []
  );
};

// const channelsByIdsQuery = (...channelIds: string[]) =>
//   db
//     .table('channels')
//     .getAll(...channelIds)
//     .filter(channel => channel.hasFields('deletedAt').not());
// checked
const channelsByIdsQuery = (...channelIds) => {
  return dbUtil.tryCallAsync(
    'channelsByIdsQuery',
    { channelIds },
    () => {
      return db
        .collection('channels')
        .find({
          id: { $in: channelIds },
          deletedAt: null,
        })
        .toArray();
    },
    []
  );
};

// const threadsByChannelsQuery = (...channelIds: string[]) =>
//   channelsByIdsQuery(...channelIds)
//     .eqJoin('id', db.table('threads'), { index: 'channelId' })
//     .map(row => row('right'))
//     .filter(thread => db.not(thread.hasFields('deletedAt')));
// checked
const threadsByChannelsQuery = (...channelIds) => {
  return dbUtil.tryCallAsync(
    'threadsByChannelsQuery',
    { channelIds },
    async () => {
      let ret = await channelsByIdsQuery(...channelIds);
      ret = await dbUtil.eqJoin(db, ret, 'id', 'threads', 'channeId');
      ret = ret
        .map(row => {
          return row.right;
        })
        .filter(thread => {
          return !thread.deletedAt;
        });
      return ret;
    },
    []
  );
};

// const membersByChannelsQuery = (...channelIds: string[]) =>
//   channelsByIdsQuery(...channelIds)
//     .eqJoin('id', db.table('usersChannels'), { index: 'channelId' })
//     .map(row => row('right'))
//     .filter({ isBlocked: false, isPending: false, isMember: true });
// checked
const membersByChannelsQuery = (...channelIds) => {
  return dbUtil.tryCallAsyc(
    'membersByChannelsQuery',
    { channelIds },
    async () => {
      let ret = await channelsByIdsQuery(channelIds);
      ret = await dbUtil.eqJoin(
        db,
        channels,
        'id',
        'usersChannels',
        'channelId'
      );
      ret = ret
        .map(row => {
          return row.right;
        })
        .filter(usersChannel => {
          return (
            usersChannel.isBlocked == false &&
            usersChannel.isPending == false &&
            usersChannel.isMember == true
          );
        });
      return ret;
    },
    []
  );
};

// reusable query parts -- end

// prettier-ignore
// const getChannelsByCommunity = (communityId: string): Promise<Array<DBChannel>> => {
//   return channelsByCommunitiesQuery(communityId).run();
// };
// checked
const getChannelsByCommunity = (communityId: string): Promise<Array<DBChannel>> => {
  return channelsByCommunitiesQuery(communityId)
};

/*
  If a non-user is viewing a community page, they should only see threads
  from public channels. We use this function to return an array of channelIds
  that are public, and pass them into a getThreads function
*/
// prettier-ignore
// const getPublicChannelsByCommunity = (communityId: string): Promise<Array<string>> => {
//   return channelsByCommunitiesQuery(communityId)
//     .filter({ isPrivate: false })
//     .filter(row => row.hasFields('archivedAt').not())
//     .map(c => c('id'))
//     .run();
// };
// checked
const getPublicChannelsByCommunity = (communityId: string): Promise<Array<string>> => {  
  return dbUtil.tryCallAsync(
    "getPublicChannelsByCommunity",
    { communityId },
    async () => {
      return (await channelsByCommunitiesQuery(communityId))
        .filter(channel => {
          return channel.isPrivate == false && !channel.archivedAt
        })
        .map(c => {
          return c.id
        })
    },
    []
  )
};

/*
  If a user is viewing a community, they should see threads from all public channels as well as from private channels they are a member of.

  This function returns an array of objects with the field 'id' that corresponds
  to a channelId. This array of IDs will be passed into a threads method which
  will only return threads in those channels
*/
// prettier-ignore
// const getChannelsByUserAndCommunity = async (communityId: string, userId: string): Promise<Array<string>> => {
//   const channels = await channelsByCommunitiesQuery(communityId).run();
//   const unarchived = channels.filter(channel => !channel.archivedAt)
//   const channelIds = unarchived.map(channel => channel.id)

//   return db
//     .table('usersChannels')
//     .getAll(...channelIds.map(id => ([userId, id])), {
//       index: 'userIdAndChannelId',
//     })
//     .filter({ isMember: true })('channelId')
//     .run();
// };
// checked
const getChannelsByUserAndCommunity = (communityId: string, userId: string): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    "getChannelsByUserAndCommunity",
    { communityId, userId },
    async () => {
      const channels = await channelsByCommunitiesQuery(communityId);
      const unarchived = channels.filter(channel => !channel.archivedAt)
      const channelIds = unarchived.map(channel => channel.id)
    
      return db.collection("usersChannels")
        .find({  
          userId: userId,
          channelId: {
            $in: channelIds
          },
          isMember: true
        })
        .map(usersChannel => {
          return usersChannel.channelId;
        })
        .toArray();
    },
    []
  )
};

// const getChannelsByUser = async (userId: string): Promise<Array<DBChannel>> => {
//   return db
//     .table('usersChannels')
//     .getAll([userId, 'member'], [userId, 'moderator'], [userId, 'owner'], {
//       index: 'userIdAndRole',
//     })
//     .eqJoin('channelId', db.table('channels'))
//     .without({ left: ['id', 'channelId', 'userId', 'createdAt'] })
//     .zip()
//     .filter(channel => db.not(channel.hasFields('deletedAt')))
//     .run();
// };
// checked
const getChannelsByUser = (userId: string): Promise<Array<DBChannel>> => {
  return dbUtil.tryCallAsync(
    'getChannelsByUser',
    { userId },
    async () => {
      let ret = await db
        .collection('usersChannels')
        .find({
          userId: userId,
          $or: [{ isMember: true }, { isModerator: true }, { isOwner: true }],
        })
        .toArray();
      ret = await dbUtil.eqJoin(db, usersChannels, 'channelId', 'channels');
      ret = dbUtil.without(ret, {
        left: ['id', 'channelId', 'userId', 'createdAt'],
      });
      ret = dbUtil.zip(ret);
      ret = ret.filter(channel => {
        return !channel.deletedAt;
      });
      return ret;
    },
    []
  );
};

// const getChannelBySlug = async (
//   channelSlug: string,
//   communitySlug: string
// ): Promise<?DBChannel> => {
//   const [communityId] = await db
//     .table('communities')
//     .getAll(communitySlug, { index: 'slug' })('id')
//     .run();

//   if (!communityId) return null;

//   return db
//     .table('channels')
//     .getAll(communityId, { index: 'communityId' })
//     .filter(channel =>
//       channel('slug')
//         .eq(channelSlug)
//         .and(db.not(channel.hasFields('deletedAt')))
//     )
//     .run()
//     .then(res => {
//       if (Array.isArray(res) && res.length > 0) return res[0];
//       return null;
//     });
// };
// checked
const getChannelBySlug = (
  channelSlug: string,
  communitySlug: string
): Promise<?DBChannel> => {
  return dbUtil.tryCallAsync(
    'getChannelBySlug',
    { channelSlug, communitySlug },
    async () => {
      const [communityId] = await db
        .collection('communities')
        .find({ communitySlug: communitySlug })
        .toArray();

      if (!communityId) {
        return null;
      }

      return db
        .collection('channels')
        .find({
          communityId: communityId,
          slug: channelSlug,
          deletedAt: null,
        })
        .toArray()
        .then(res => {
          if (Array.isArray(res) && res.length > 0) {
            return res[0];
          }

          return null;
        });
    },
    null
  );
};

// const getChannelById = async (id: string) => {
//   return (await channelsByIdsQuery(id).run())[0] || null;
// };
// checked
const getChannelById = (id: string) => {
  return dbUtil.tryCallAsync(
    'getChannelById',
    { id },
    async () => {
      return (await channelsByIdsQuery(id))[0] || null;
    },
    null
  );
};

type GetChannelByIdArgs = {|
  id: string,
|};

type GetChannelBySlugArgs = {|
  slug: string,
  communitySlug: string,
|};

export type GetChannelArgs = GetChannelByIdArgs | GetChannelBySlugArgs;

// const getChannels = (channelIds: Array<string>): Promise<Array<DBChannel>> => {
//   return channelsByIdsQuery(...channelIds).run();
// };
const getChannels = (channelIds: Array<string>): Promise<Array<DBChannel>> => {
  return channelsByIdsQuery(...channelIds);
};

type GroupedCount = {
  group: string,
  reduction: number,
};

// prettier-ignore
// const getChannelsThreadCounts = (channelIds: Array<string>): Promise<Array<GroupedCount>> => {
//   return threadsByChannelsQuery(...channelIds)
//     .group('channelId')
//     .count()
//     .run();
// };
// checked
const getChannelsThreadCounts = (channelIds: Array<string>): Promise<Array<GroupedCount>> => {
  return dbUtil.tryCallAsync(
    "getChannelsThreadCounts",
    { channelIds },
    async () => {
      let ret = await threadsByChannelsQuery(...channelIds);
      ret = dbUtil.group(ret, "channelId");
      ret = dbUtil.groupCount(grouped);
      return ret
    },
    []
  )
};

// prettier-ignore
// const getChannelsMemberCounts = (channelIds: Array<string>): Promise<Array<GroupedCount>> => {
//   return membersByChannelsQuery(...channelIds)
//     .group('channelId')
//     .count()
//     .run();
// };
// checked
const getChannelsMemberCounts = (channelIds: Array<string>): Promise<Array<GroupedCount>> => {
  return dbUtil.tryCallAsync(
    "getChannelsMemberCounts",
    { channelIds },
    async () => {
      let ret = await membersByChannelsQuery(...channelIds);
      ret = dbUtil.group(members, "channelId");
      ret = dbUtil.groupCount(grouped);
      return ret;
    },
    []
  )
};

export type CreateChannelInput = {
  input: {
    communityId: string,
    name: string,
    description: string,
    slug: string,
    isPrivate: boolean,
    isDefault: boolean,
  },
};

export type EditChannelInput = {
  input: {
    channelId: string,
    name: string,
    description: string,
    slug: string,
    isPrivate: Boolean,
  },
};

// prettier-ignore
// const createChannel = ({ input }: CreateChannelInput, userId: string): Promise<DBChannel> => {
//   const { communityId, name, slug, description, isPrivate, isDefault } = input;

//   return db
//     .table('channels')
//     .insert(
//       {
//         communityId,
//         createdAt: new Date(),
//         name,
//         description,
//         slug,
//         isPrivate,
//         isDefault: isDefault ? true : false,
//         memberCount: 0,
//       },
//       { returnChanges: true }
//     )
//     .run()
//     .then(result => result.changes[0].new_val)
//     .then(channel => {
//       // only trigger a new channel notification is the channel is public
//       if (!channel.isPrivate) {
//         sendChannelNotificationQueue.add({ channel, userId });
//       }

//       return channel;
//     });
// };
// checked
const createChannel = ({ input }: CreateChannelInput, userId: string): Promise<DBChannel> => {
  return dbUtil.tryCallAsync(
    "createChannel",
    { input, userId },
    () => {
      const { communityId, name, slug, description, isPrivate, isDefault } = input;

      return dbUtil.insert(db, 
        "channels", 
        {
          communityId,
          createdAt: new Date(),
          name,
          description,
          slug,
          isPrivate,
          isDefault: isDefault ? true : false,
          memberCount: 0,
        })
        .then(result => {
          return result[0]
        })
        .then(channel => {
          if (!channel.isPrivate) {
            sendChannelNotificationQueue.add({ channel, userId });
          }
      
          return channel;
        })
    },
    null
  )
};

// prettier-ignore
// const createGeneralChannel = (communityId: string, userId: string): Promise<DBChannel> => {
//   return createChannel(
//     {
//       input: {
//         name: 'General',
//         slug: 'general',
//         description: 'General Chatter',
//         communityId,
//         isPrivate: false,
//         isDefault: true,
//       },
//     },
//     userId
//   );
// };
// checked
const createGeneralChannel = (communityId: string, userId: string): Promise<DBChannel> => {
  return createChannel(
    {
      input: {
        name: 'General',
        slug: 'general',
        description: 'General Chatter',
        communityId,
        isPrivate: false,
        isDefault: true,
      },
    },
    userId
  );
};

// prettier-ignore
// const editChannel = async ({ input }: EditChannelInput): Promise<DBChannel> => {
//   const { name, slug, description, isPrivate, channelId } = input;

//   const channelRecord = await db
//     .table('channels')
//     .get(channelId)
//     .run()
//     .then(result => {
//       return Object.assign({}, result, {
//         name,
//         description,
//         slug,
//         isPrivate,
//       });
//     });

//   return db
//     .table('channels')
//     .get(channelId)
//     .update({ ...channelRecord }, { returnChanges: 'always' })
//     .run()
//     .then(result => {
//       // if an update happened
//       if (result.replaced === 1) {
//         return result.changes[0].new_val;
//       }

//       // an update was triggered from the client, but no data was changed
//       if (result.unchanged === 1) {
//         return result.changes[0].old_val;
//       }

//       return null;
//     });
// };
// checked
const editChannel = ({ input }: EditChannelInput): Promise<DBChannel> => {
  return dbUtil.tryCallAsync(
    "editChannel",
    { input },
    async () => {
      const { name, slug, description, isPrivate, channelId } = input;
  
      const channelRecord = await db
        .collection('channels')
        .findOne({ id: channelId })
        .then(result => {
          return Object.assign({}, result, {
            name,
            description,
            slug,
            isPrivate,
          });
        });

      return dbUtil.updateOne(db, 
        "channels", 
        { 
          id: channelId 
        }, 
        {
          $set: dbUtil.flattenSafe({
            ...channelRecord
          })
      })
      .then(result => {
        return result[0]
      })
    },
    null
  )
};

// const deleteChannel = (channelId: string, userId: string): Promise<Boolean> => {
//   return db
//     .table('channels')
//     .get(channelId)
//     .update(
//       {
//         deletedBy: userId,
//         deletedAt: new Date(),
//         slug: db.uuid(),
//       },
//       {
//         returnChanges: true,
//         nonAtomic: true,
//       }
//     )
//     .run();
// };
// checked
const deleteChannel = (channelId: string, userId: string): Promise<Boolean> => {
  return dbUtil.tryCallAsync(
    'deleteChannel',
    { channelId, userId },
    () => {
      return dbUtil.updateOne(
        db,
        'channels',
        {
          id: channelId,
        },
        {
          $set: {
            deletedBy: userId,
            deletedAt: new Date(),
            slug: dbUtil.generateUuid(),
          },
        }
      );
    },
    false
  );
};

// prettier-ignore
// const archiveChannel = (channelId: string): Promise<DBChannel> => {
//   return db
//     .table('channels')
//     .get(channelId)
//     .update({ archivedAt: new Date() }, { returnChanges: 'always' })
//     .run()
//     .then(result => {
//       return result.changes[0].new_val || result.changes[0].old_val;
//     });
// };
const archiveChannel = (channelId: string): Promise<DBChannel> => {
  return dbUtil.tryCallAsync(
    "archiveChannel",
    { channelId },
    () => {
      return dbUtil.updateOne(db, 
        "channels", 
        { 
          id: channelId 
        },
        {
          $set: { 
            archivedAt: new Date() 
          }
        })
        .then(result => {
          return result[0];
        });
    },
    null
  )
};

// prettier-ignore
// const restoreChannel = (channelId: string): Promise<DBChannel> => {
//   return db
//     .table('channels')
//     .get(channelId)
//     .update({ archivedAt: db.literal() }, { returnChanges: 'always' })
//     .run()
//     .then(result => {
//       return result.changes[0].new_val || result.changes[0].old_val;
//     });
// };
const restoreChannel = (channelId: string): Promise<DBChannel> => {
  return dbUtil.tryCallAsync(
    "restoreChannel",
    { channelId },
    () => {
      return dbUtil.updateOne(db, 
        "channels",
        {
          id: channelId
        },
        {
          $unset: { 
            archivedAt: "" 
          }
        })
        .then(result => {
          return result[0];
        });
    },
    null
  )
};

// prettier-ignore
// const archiveAllPrivateChannels = async (communityId: string) => {
//   const channels = await db
//     .table('channels')
//     .getAll(communityId, { index: 'communityId' })
//     .filter({ isPrivate: true })
//     .run();

//   if (!channels || channels.length === 0) return;

//   return await db
//     .table('channels')
//     .getAll(communityId, { index: 'communityId' })
//     .filter({ isPrivate: true })
//     .update({ archivedAt: new Date() })
//     .run();
// };
const archiveAllPrivateChannels = (communityId: string) => {
  return dbUtil.tryCallAsync(
    "archiveAllPrivateChannels",
    { communityId },
    async () => {
      const channels = await db
        .collection('channels')
        .find({ communityId: communityId, isPrivate: true })
        .toArray()
    
      if (!channels || channels.length === 0) return;
    
      return dbUtil.updateMany(db, 
        "channels", 
        { 
          communityId: communityId, 
          isPrivate: true 
        }, 
        { 
          archivedAt: new Date()  
        })
    },
    []
  )
};

// const incrementMemberCount = (channelId: string): Promise<DBChannel> => {
//   return db
//     .table('channels')
//     .get(channelId)
//     .update(
//       {
//         memberCount: db
//           .row('memberCount')
//           .default(0)
//           .add(1),
//       },
//       { returnChanges: true }
//     )
//     .run()
//     .then(result => result.changes[0].new_val || result.changes[0].old_val);
// };
const incrementMemberCount = (channelId: string): Promise<DBChannel> => {
  return dbUtil.tryCallAsync(
    'incrementMemberCount',
    { channelId },
    () => {
      return dbUtil
        .updateOne(
          db,
          'channels',
          {
            id: channelId,
          },
          {
            $inc: {
              memberCount: 1,
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

// const decrementMemberCount = (channelId: string): Promise<DBChannel> => {
//   return db
//     .table('channels')
//     .get(channelId)
//     .update(
//       {
//         memberCount: db
//           .row('memberCount')
//           .default(1)
//           .sub(1),
//       },
//       { returnChanges: true }
//     )
//     .run()
//     .then(result => result.changes[0].new_val || result.changes[0].old_val);
// };
// checked
const decrementMemberCount = (channelId: string): Promise<DBChannel> => {
  return dbUtil.tryCallAsync(
    'decrementMemberCount',
    { channelId },
    () => {
      return dbUtil
        .updateOne(
          db,
          'channels',
          {
            id: channelId,
          },
          {
            $inc: {
              memberCount: -1,
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

// const setMemberCount = (
//   channelId: string,
//   value: number
// ): Promise<DBChannel> => {
//   return db
//     .table('channels')
//     .get(channelId)
//     .update(
//       {
//         memberCount: value,
//       },
//       { returnChanges: true }
//     )
//     .run()
//     .then(result => result.changes[0].new_val || result.changes[0].old_val);
// };
// checked
const setMemberCount = (
  channelId: string,
  value: number
): Promise<DBChannel> => {
  return dbUtil.tryCallAsync(
    'setMemberCount',
    { channelId, value },
    () => {
      return dbUtil
        .updateOne(
          db,
          'channels',
          {
            id: channelId,
          },
          {
            $set: {
              memberCount: value,
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

// const getChannelsOnlineMemberCounts = (channelIds: Array<string>) => {
//   return db
//     .table('usersChannels')
//     .getAll(...channelIds, {
//       index: 'channelId',
//     })
//     .filter({ isBlocked: false, isMember: true })
//     .pluck(['channelId', 'userId'])
//     .eqJoin('userId', db.table('users'))
//     .pluck('left', { right: ['lastSeen', 'isOnline'] })
//     .zip()
//     .filter(rec =>
//       rec('isOnline')
//         .eq(true)
//         .or(
//           rec('lastSeen')
//             .toEpochTime()
//             .ge(
//               db
//                 .now()
//                 .toEpochTime()
//                 .sub(86400)
//             )
//         )
//     )
//     .group('channelId')
//     .count()
//     .run();
// };
// checked
const getChannelsOnlineMemberCounts = (channelIds: Array<string>) => {
  return dbUtil.tryCallAsync(
    'getChannelsOnlineMemberCounts',
    { channelIds },
    async () => {
      let ret = await db
        .collection('usersChannels')
        .find({
          channelId: { $in: channelIds, isBlocked: false, isMember: false },
        })
        .toArray();
      ret = dbUtil.pluckMany(ret, ['channelId', 'userId']);
      ret = await dbUtil.eqJoin(db, ret, 'userId', 'users');
      ret = dbUtil.pluckMany(ret, {
        right: ['lastSeen', 'isOnline'],
      });
      ret = dbUtil.zip(plucked2);
      ret = ret.filter(rec => {
        return rec.isOnline == true;
      });
      ret = dbUtil.group(ret, 'channelId');
      ret = dbUtil.groupCount(grouped);
      return ret;
    },
    []
  );
};

module.exports = {
  getChannelBySlug,
  getChannelById,
  getChannelsByUser,
  getChannelsByCommunity,
  getPublicChannelsByCommunity,
  getChannelsByUserAndCommunity,
  createChannel,
  createGeneralChannel,
  editChannel,
  deleteChannel,
  getChannelsMemberCounts,
  getChannelsThreadCounts,
  getChannels,
  archiveChannel,
  restoreChannel,
  archiveAllPrivateChannels,
  incrementMemberCount,
  decrementMemberCount,
  setMemberCount,
  getChannelsOnlineMemberCounts,
  __forQueryTests: {
    channelsByCommunitiesQuery,
    channelsByIdsQuery,
    threadsByChannelsQuery,
    membersByChannelsQuery,
  },
};
