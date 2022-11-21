// @flow
const { db } = require('shared/db');
const dbUtil = require('shared/dbUtil');

// export const getMembersInCommunity = (
//   communityId: string
// ): Promise<Array<string>> => {
//   return db
//     .table('usersCommunities')
//     .getAll([communityId, true], { index: 'communityIdAndIsMember' })
//     .filter({ receiveNotifications: true })('userId')
//     .run();
// };
export const getMembersInCommunity = (
  communityId: string
): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    'getMembersInCommunity',
    { communityId },
    () => {
      return db
        .collection('usersCommunities')
        .find({
          communityId: communityId,
          isMember: true,
          receiveNotifications: true,
        })
        .map(row => {
          return row.userId;
        })
        .toArray();
    },
    []
  );
};

// export const getOwnersInCommunity = (
//   communityId: string
// ): Promise<Array<string>> => {
//   return db
//     .table('usersCommunities')
//     .getAll([communityId, true], { index: 'communityIdAndIsOwner' })('userId')
//     .run();
// };
export const getOwnersInCommunity = (
  communityId: string
): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    'getOwnersInCommunity',
    { communityId },
    () => {
      return db
        .collection('usersCommunities')
        .find({ communityId: communityId, isOwner: true })
        .map(row => {
          return row.userId;
        })
        .toArray();
    },
    []
  );
};

// export const getModeratorsInCommunity = (
//   communityId: string
// ): Promise<Array<string>> => {
//   return db
//     .table('usersCommunities')
//     .getAll([communityId, true], { index: 'communityIdAndIsModerator' })(
//       'userId'
//     )
//     .run();
// };
export const getModeratorsInCommunity = (
  communityId: string
): Promise<Array<string>> => {
  return dbUtil.tryCallAsync(
    'getModeratorsInCommunity',
    { communityId },
    () => {
      return db
        .collection('usersCommunities')
        .find({ communityId: communityId, isModerator: true })
        .map(row => {
          return row.userId;
        })
        .toArray();
    },
    []
  );
};

// export const getUserPermissionsInCommunity = (
//   communityId: string,
//   userId: string
// ): Promise<Object> => {
//   return db
//     .table('usersCommunities')
//     .getAll([userId, communityId], { index: 'userIdAndCommunityId' })
//     .run()
//     .then(data => {
//       // if a record exists
//       if (data.length > 0) {
//         return data[0];
//       } else {
//         // if a record doesn't exist, we're creating a new relationship
//         // so default to false for everything
//         return {
//           isOwner: false,
//           isMember: false,
//           isModerator: false,
//           isBlocked: false,
//           receiveNotifications: false,
//         };
//       }
//     });
// };
export const getUserPermissionsInCommunity = (
  communityId: string,
  userId: string
): Promise<Object> => {
  return dbUtil.tryCallAsync(
    'getUserPermissionsInCommunity',
    { communityId, userId },
    () => {
      return db
        .colllection('usersCommunities')
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
              isOwner: false,
              isMember: false,
              isModerator: false,
              isBlocked: false,
              receiveNotifications: false,
            };
          }
        });
    },
    null
  );
};
