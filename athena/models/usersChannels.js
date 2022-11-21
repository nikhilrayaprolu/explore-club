// @flow
const { db } = require('shared/db');
const dbUtil = require('shared/dbUtil');

// export const getMembersInChannelWithNotifications = (
//   channelId: string
// ): Promise<Array<string>> => {
//   return db
//     .table('usersChannels')
//     .getAll(
//       [channelId, 'member'],
//       [channelId, 'moderator'],
//       [channelId, 'owner'],
//       { index: 'channelIdAndRole' }
//     )
//     .filter({ receiveNotifications: true })
//     .group('userId')
//     .run()
//     .then(users => users.map(u => u.group));
// };
export const getMembersInChannelWithNotifications = async (
  channelId: string
): Promise<Array<string>> => {
  let ret = await db
    .collection('usersChannels')
    .find({
      channelId: channelId,
      $or: [{ isMember: true }, { isModerator: true }, { isOwner: true }],
      receiveNotifications: true,
    })
    .toArray();
  ret = dbUtil.group(ret, 'userId');
  ret = ret.map(u => {
    return u.group;
  });
  return ret;
};

// export const getUserPermissionsInChannel = (
//   userId: string,
//   channelId: string
// ): Promise<Object> => {
//   return db
//     .table('usersChannels')
//     .getAll([userId, channelId], { index: 'userIdAndChannelId' })
//     .group('userId')
//     .run()
//     .then(groups => {
//       // if no relationship exists
//       if (!groups || groups.length === 0) {
//         return {
//           isMember: false,
//           isBlocked: false,
//           isPending: false,
//         };
//       }

//       return groups[0].reduction[0]; // returns the usersChannel record
//     });
// };
export const getUserPermissionsInChannel = (
  userId: string,
  channelId: string
): Promise<Object> => {
  return dbUtil.tryCallAsync(
    'getUserPermissionsInChannel',
    { userId, channelId },
    async () => {
      let ret = await db
        .collection('usersChannels')
        .find({ userId: userId, channelId: channelId })
        .toArray();
      ret = dbUtil.group(ret, 'userId');
      ret = dbUtil.then(groups => {
        // if no relationship exists
        if (!groups || groups.length === 0) {
          return {
            isMember: false,
            isBlocked: false,
            isPending: false,
          };
        }

        return groups[0].reduction[0]; // returns the usersChannel record
      });
      return ret;
    },
    null
  );
};

// get the email address and id of all the channel owners
// export const getOwnersInChannel = (
//   channelId: string
// ): Promise<Array<string>> => {
//   return db
//     .table('usersChannels')
//     .getAll([channelId, 'owner'], { index: 'channelIdAndRole' })
//     .map(user => user('userId'))
//     .run();
// };
export const getOwnersInChannel = (
  channelId: string
): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    'getOwnersInChannel',
    { channelId },
    async () => {
      return db
        .table('usersChannels')
        .getAll({ channelId: channelId, isOwner: true })
        .map(user => {
          return user.userId;
        })
        .toArray();
    },
    null
  );
};

// export const getModeratorsInChannel = (
//   channelId: string
// ): Promise<Array<string>> => {
//   return db
//     .table('usersChannels')
//     .getAll([channelId, 'moderator'], { index: 'channelIdAndRole' })
//     .map(user => user('userId'))
//     .run();
// };
export const getModeratorsInChannel = (
  channelId: string
): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    'getModeratorsInChannel',
    { channelId },
    () => {
      return db
        .collection('usersChannels')
        .find({ channelId: channelId, isModerator: true })
        .map(user => {
          return user.userId;
        })
        .toArray();
    },
    []
  );
};
