//@flow
const { db } = require('shared/db');
const dbUtil = require('shared/dbUtil');

// prettier-ignore
// export const getPublicChannelIdsInCommunity = (communityId: string): Promise<Array<string>> => {
//   return db
//     .table('channels')
//     .getAll(communityId, { index: 'communityId' })
//     .filter(row =>
//       row
//         .hasFields('deletedAt')
//         .not()
//         .and(row('isPrivate').eq(false))
//     )
//     .map(row => row('id'))
//     .run();
// };
export const getPublicChannelIdsInCommunity = (communityId: string): Promise<Array<string>> => {
  return dbUtil
    .tryCallAsync(
      "getPublicChannelIdsInCommunity", 
      async () => {
        let ret = await db
          .collection('channels')
          .find({ communityId: communityId, deletedAt: null, isPrivate: false })
          .toArray();
        ret = ret.map(channel => {
          return channel.id;
        });
        return ret;
      }, 
      []
    )
};

// prettier-ignore
// export const getPrivateChannelIdsInCommunity = (communityId: string): Promise<Array<string>> => {
//   return db
//     .table('channels')
//     .getAll(communityId, { index: 'communityId' })
//     .filter(row =>
//       row
//         .hasFields('deletedAt')
//         .not()
//         .and(row('isPrivate').eq(true))
//     )
//     .map(row => row('id'))
//     .run();
// };
export const getPrivateChannelIdsInCommunity = (communityId: string): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    "getPrivateChannelIdsInCommunity",
    { communityId },
    async () => {
      let ret = await db
        .collection('channels')
        .find({ communityId: communityId, deletedAt: null, isPrivate: true })
        .toArray();
      ret = ret.map(row => {
        return row.id
      })
      return ret;
    },
    []
  )
};

// prettier-ignore
// export const getPublicChannelIdsForUsersThreads = (userId: string): Promise<Array<string>> => {
//   return db
//     .table('threads')
//     .getAll(userId, { index: 'creatorId' })
//     .filter(row => row.hasFields('deletedAt').not())
//     .eqJoin('channelId', db.table('channels'))
//     .filter(row => row('right')('isPrivate').eq(false))
//     .zip()
//     .map(row => row('channelId'))
//     .run();
// };
export const getPublicChannelIdsForUsersThreads = (userId: string): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    "getPublicChannelIdsForUsersThreads",
    { userId },
    async () => {
      let ret = await db
        .collection('threads')
        .find({ creatorId: userId, deletedAt: null })
        .toArray();
      ret = await dbUtil.eqJoin(db, ret, "channelId", "channels");
      ret = ret.filter(row => {
        return row.right.isPrivate == false
      });
      ret = dbUtil.zip(ret);
      ret = ret.map(row => {
        return row.channelId;
      });
      return ret;
    },
    []
  )
};

// export const getPublicCommunityIdsForUsersThreads = (
//   userId: string
// ): Promise<Array<string>> => {
//   return db
//     .table('threads')
//     .getAll(userId, { index: 'creatorId' })
//     .filter(row => row.hasFields('deletedAt').not())
//     .eqJoin('communityId', db.table('communities'))
//     .filter(row => row('right')('isPrivate').eq(false))
//     .zip()
//     .map(row => row('communityId'))
//     .run();
// };
export const getPublicCommunityIdsForUsersThreads = (
  userId: string
): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    'getPublicCommunityIdsForUsersThreads',
    { userId },
    async () => {
      let ret = await db
        .collection('threads')
        .find({ creatorId: userId, deletedAt: null })
        .toArray();
      ret = await dbUtil.eqJoin(db, ret, 'communityId', 'communities');
      ret = ret.filter(row => {
        return row.right.isPrivate == false;
      });
      ret = dbUtil.zip(ret);
      ret = ret.map(row => {
        return row.communityId;
      });
      return ret;
    },
    []
  );
};

// prettier-ignore
// export const getPrivateChannelIdsForUsersThreads = (userId: string): Promise<Array<string>> => {
//   return db
//     .table('threads')
//     .getAll(userId, { index: 'creatorId' })
//     .filter(row => row.hasFields('deletedAt').not())
//     .eqJoin('channelId', db.table('channels'))
//     .filter(row => row('right')('isPrivate').eq(true))
//     .zip()
//     .map(row => row('channelId'))
//     .run();
// };
export const getPrivateChannelIdsForUsersThreads = (userId: string): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    "getPrivateChannelIdsForUsersThreads",
    { userId },
    async () => {
      let ret = await db
        .collection('threads')
        .find({ creatorId: userId, deletedAt: null })
        .toArray();
      ret = await dbUtil.eqJoin(db, ret, "channelId", "channels");
      ret = ret.filter(row => {
        return row.right.isPrivate == true
      });
      ret = dbUtil.zip(ret);
      ret = ret.map(row => {
        return row.channelId;
      })
      return ret;
    },
    []
  )
};

// export const getPrivateCommunityIdsForUsersThreads = (
//   userId: string
// ): Promise<Array<string>> => {
//   return db
//     .table('threads')
//     .getAll(userId, { index: 'creatorId' })
//     .filter(row => row.hasFields('deletedAt').not())
//     .eqJoin('communityId', db.table('communities'))
//     .filter(row => row('right')('isPrivate').eq(true))
//     .zip()
//     .map(row => row('communityId'))
//     .run();
// };
export const getPrivateCommunityIdsForUsersThreads = (
  userId: string
): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    'getPrivateCommunityIdsForUsersThreads',
    { userId },
    async () => {
      let ret = await db
        .collection('threads')
        .find({ creatorId: userId, deletedAt: null })
        .toArray();
      ret = await dbUtil.eqJoin(db, ret, 'communityId', 'communities');
      ret = ret.filter(row => {
        return row.right.isPrivate == true;
      });
      ret = dbUtil.zip(ret);
      ret = ret.map(row => {
        return row.communityId;
      });
      return ret;
    },
    []
  );
};

// prettier-ignore
// export const getUsersJoinedChannels = (userId: string): Promise<Array<string>> => {
//   return db
//     .table('usersChannels')
//     .getAll([userId, "member"], [userId, "moderator"], [userId, "owner"], { index: 'userIdAndRole' })
//     .eqJoin('channelId', db.table('channels'))
//     .filter(row => row('right').hasFields('deletedAt').not())
//     .zip()
//     .map(row => row('channelId'))
//     .run();
// };
export const getUsersJoinedChannels = (userId: string): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    "getUsersJoinedChannels",
    { userId },
    async () => {
      let ret = await db
        .collection('usersChannels')
        .find({ creatorId: userId, $or: [{isMember: true}, {isModerator: true}, {isOwner: true}] })
        .toArray();
      ret = await dbUtil.eqJoin(db, ret, "channelId", "channels");
      ret = ret.filter(row => {
        return !row.right.deletedAt
      });
      ret = dbUtil.zip(ret);
      ret = ret.map(row => {
        return row.channelId;
      });
      return ret;
    },
    []
  )
};

// prettier-ignore
// export const getUsersJoinedCommunities = (userId: string): Promise<Array<string>> => {
//   return db
//     .table('usersCommunities')
//     .getAll([userId, true], { index: 'userIdAndIsMember' })
//     .eqJoin('communityId', db.table('communities'))
//     .filter(row => row('right').hasFields('deletedAt').not())
//     .zip()
//     .map(row => row('communityId'))
//     .run();
// };
export const getUsersJoinedCommunities = async (userId: string): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    "getUsersJoinedCommunities",
    { userId },
    async () => {
      let ret = await db
        .collection('usersCommunities')
        .find({ userId: userId, isMember: true })
        .toArray();
      ret = await dbUtil.eqJoin(db, ret, "communityId", "communities");
      ret = ret.filter(row => {
        return !row.right.deletedAt;
      });
      ret = dbUtil.zip(ret);
      ret = ret.map(row => {
        return row.communityId;
      });
      return ret;
    },
    []
  )
};

// prettier-ignore
// export const getUsersJoinedPrivateChannelIds = (userId: string): Promise<Array<string>> => {
//   return db
//     .table('usersChannels')
//     .getAll([userId, "member"], [userId, "moderator"], [userId, "owner"], { index: 'userIdAndRole' })
//     .eqJoin('channelId', db.table('channels'))
//     .filter(row => row('right')('isPrivate').eq(true).and(row('right').hasFields('deletedAt').not()))
//     .without({ left: ['id'] })
//     .zip()
//     .map(row => row('id'))
//     .run();
// };
export const getUsersJoinedPrivateChannelIds = async (userId: string): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    "getUsersJoinedPrivateChannelIds",
    { userId },
    async () => {
      let ret = await db
        .collection('usersChannels')
        .find({ userId: userId, $or: [{isMember: true}, {isModerator: true}, {isOwner: true}] })
        .toArray();
      ret = await dbUtil.eqJoin(db, "channelId", "channels");
      ret = ret.filter(row => {
        return row.right.isPrivate == true && !row.right.deletedAt
      });
      ret = dbUtil.without(ret, { left: ['id'] });
      ret = dbUtil.zip(ret);
      ret = ret.map(row => {
        return row.id;
      });
      return ret;
    },
    []
  )
};

// prettier-ignore
// export const getUsersJoinedPrivateCommunityIds = (userId: string): Promise<Array<string>> => {
//   return db
//     .table('usersCommunities')
//     .getAll([userId, true], { index: 'userIdAndIsMember' })
//     .eqJoin('communityId', db.table('communities'))
//     .filter(row => row('right')('isPrivate').eq(true).and(row('right').hasFields('deletedAt').not()))
//     .without({ left: ['id'] })
//     .zip()
//     .map(row => row('id'))
//     .run();
// };
export const getUsersJoinedPrivateCommunityIds = async (userId: string): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    "getUsersJoinedPrivateCommunityIds",
    { userId },
    async () => {
      let ret = await db
        .collection('usersCommunities')
        .find({ userId: userId, isMember: true })
        .toArray();
      ret = await dbUtil.eqJoin(db, ret, "communityId", "communities");
      ret = ret.filter(row => {
        return row.right.isPrivate == true && !row.right.deletedAt;
      });
      ret = dbUtil.without(ret, { left: ['id'] });
      ret = dbUtil.zip(ret);
      ret = ret.map(row => {
        return row.id;
      });
      return ret;
    },
    []
  )
};
