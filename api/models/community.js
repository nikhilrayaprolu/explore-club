// @flow
const { db } = require('shared/db');
import intersection from 'lodash.intersection';
import { parseRange } from './utils';
import { uploadImage } from '../utils/file-storage';
import getRandomDefaultPhoto from '../utils/get-random-default-photo';
import {
  sendNewCommunityWelcomeEmailQueue,
  _adminSendCommunityCreatedEmailQueue,
  searchQueue,
} from 'shared/bull/queues';
import { createChangefeed } from 'shared/changefeed-utils';
import type { DBCommunity, DBUser } from 'shared/types';
import type { Timeframe } from './utils';
import { find } from 'lodash';
const dbUtil = require('shared/dbUtil');

// export const getCommtyById = (id: string): Promise<DBCommunity> => {
//   return db
//     .table('communities')
//     .get(id)
//     .run()
//     .then(result => {
//       if (result && result.deletedAt) return null;
//       return result;
//     });
// };
// checked
export const getCommunityById = (id: string): Promise<DBCommunity> => {
  return dbUtil.tryCallAsync(
    'getCommunityById',
    { id },
    () => {
      return db.collection('communities').findOne({ id: id, deletedAt: null });
    },
    null
  );
};

// prettier-ignore
// export const getCommunities = (communityIds: Array<string>): Promise<Array<DBCommunity>> => {
//   return db
//     .table('communities')
//     .getAll(...communityIds)
//     .filter(community => db.not(community.hasFields('deletedAt')))
//     .run();
// };
// checked
export const getCommunities = (communityIds: Array<string>): Promise<Array<DBCommunity>> => {
  return dbUtil
    .tryCallAsync(
      "getCommunities", 
      { communityIds },
      async () => {
        const communities = await db
          .collection('communities')
          .find({ id: { $in: communityIds }, deletedAt: null })
          .toArray();
        return communities.map(community => {
          if (!community.slug) {
            community.slug = "dummy-slug"
          }
          return community;
        })
      }, 
      []
    )
};

// prettier-ignore
// export const getCommunitiesBySlug = (slugs: Array<string>): Promise<Array<DBCommunity>> => {
//   return db
//     .table('communities')
//     .getAll(...slugs, { index: 'slug' })
//     .filter(community => db.not(community.hasFields('deletedAt')))
//     .run();
// };
// checked
export const getCommunitiesBySlug = (slugs: Array<string>): Promise<Array<DBCommunity>> => {
  return dbUtil.tryCallAsync(
    "getCommunitiesBySlug",
    { slugs },
    () => {
      return db
        .collection('communities')
        .find({ slug: { $in: slugs}, deletedAt: null })
        .toArray();
    },
    []
  )
};

// export const getCommunityBySlug = (slug: string): Promise<?DBCommunity> => {
//   return db
//     .table('communities')
//     .getAll(slug, { index: 'slug' })
//     .filter(community => db.not(community.hasFields('deletedAt')))
//     .run()
//     .then(results => {
//       if (!results || results.length === 0) return null;
//       return results[0];
//     });
// };
// checked
export const getCommunityBySlug = (slug: string): Promise<?DBCommunity> => {
  return dbUtil.tryCallAsyc(
    'getCommunityBySlug',
    () => {
      return db
        .collection('communities')
        .find({ slug: slug, deletedAt: null })
        .toArray()
        .then(results => {
          if (!results || results.length === 0) return null;
          return results[0];
        });
    },
    null
  );
};

// prettier-ignore
// export const getCommunitiesByUser = (userId: string): Promise<Array<DBCommunity>> => {
//   return (
//     db
//       .table('usersCommunities')
//       // get all the user's communities
//       .getAll([userId, true], { index: 'userIdAndIsMember' })
//       // get the community objects for each community
//       .eqJoin('communityId', db.table('communities'))
//       // get rid of unnecessary info from the usersCommunities object on the left
//       .without({ left: ['id', 'communityId', 'userId', 'createdAt'] })
//       // zip the tables
//       .zip()
//       // ensure we don't return any deleted communities
//       .filter(community => db.not(community.hasFields('deletedAt')))
//       .run()
//   );
// };
// checked
export const getCommunitiesByUser = (userId: string): Promise<Array<DBCommunity>> => {
  return dbUtil
    .tryCallAsync(
      "getCommunitiesByUser",
      { userId },
      async () => {
        let ret = await db
          .collection("usersCommunities")
          .find({ 
            userId: userId,
            isMember: true
          })
          .toArray();
        ret = await dbUtil.eqJoin(db, ret, "communityId", "communities");
        ret = dbUtil.without(ret, { left: ['id', 'communityId', 'userId', 'createdAt'] })
        ret = dbUtil.zip(ret);
        ret = ret.filter(community => {
          return !community.deletedAt
        })
        return ret;
      },
      []
    )
};

// prettier-ignore
// export const getVisibleCommunitiesByUser = async (evaluatingUserId: string, currentUserId: string) => {
//   const evaluatingUserMemberships = await db
//     .table('usersCommunities')
//     // get all the user's communities
//     .getAll([evaluatingUserId, true], { index: 'userIdAndIsMember' })
//     // get the community objects for each community
//     .eqJoin('communityId', db.table('communities'))
//     // get rid of unnecessary info from the usersCommunities object on the left
//     .without({ left: ['id', 'communityId', 'userId', 'createdAt'] })
//     // zip the tables
//     .zip()
//     // ensure we don't return any deleted communities
//     .filter(community => db.not(community.hasFields('deletedAt')))
//     .run()

//   const currentUserMemberships = await db
//     .table('usersCommunities')
//     // get all the user's communities
//     .getAll([currentUserId, true], { index: 'userIdAndIsMember' })
//     // get the community objects for each community
//     .eqJoin('communityId', db.table('communities'))
//     // get rid of unnecessary info from the usersCommunities object on the left
//     .without({ left: ['id', 'communityId', 'userId', 'createdAt'] })
//     // zip the tables
//     .zip()
//     // ensure we don't return any deleted communities
//     .filter(community => db.not(community.hasFields('deletedAt')))
//     .run()

//   const evaluatingUserCommunityIds = evaluatingUserMemberships.map(community => community.id)
//   const currentUserCommunityIds = currentUserMemberships.map(community => community.id)
//   const publicCommunityIds = evaluatingUserMemberships
//     .filter(community => !community.isPrivate)
//     .map(community => community.id)

//   const overlappingMemberships = intersection(evaluatingUserCommunityIds, currentUserCommunityIds)
//   const allVisibleCommunityIds = [...publicCommunityIds, ...overlappingMemberships]
//   const distinctCommunityIds = allVisibleCommunityIds.filter((x, i, a) => a.indexOf(x) === i)

//   return await db
//     .table('communities')
//     .getAll(...distinctCommunityIds)
//     .run()
// }
// checked
export const getVisibleCommunitiesByUser = (evaluatingUserId: string, currentUserId: string) => {
  return dbUtil
    .tryCallAsync(
      "getVisibleCommunitiesByUser",
      { evaluatingUserId, currentUserId },
      async () => {
        let evaluatingUserMemberships = await db
          .collection("usersCommunities")
          .find({
            userId: evaluatingUserId
          })
          .toArray();
        evaluatingUserMemberships = await dbUtil.eqJoin(db, evaluatingUserMemberships, "communityId", "communities");
        evaluatingUserMemberships = dbUtil.without(evaluatingUserMemberships, { left: ['id', 'communityId', 'userId', 'createdAt'] });
        evaluatingUserMemberships = dbUtil.zip(evaluatingUserMemberships);
        evaluatingUserMemberships = evaluatingUserMemberships.filter(community => {
          return !community.deletedAt
        });
      
        let currentUserMemberships = await db
          .collection("usersCommunities")
          .find({ 
            userId: currentUserId,
            isMember: true
          })
          .toArray();
        currentUserMemberships = await dbUtil.eqJoin(db, currentUserMemberships, "communityId", "communities");
        currentUserMemberships = dbUtil.without(currentUserMemberships, { left: ['id', 'communityId', 'userId', 'createdAt'] });
        currentUserMemberships = dbUtil.zip(currentUserMemberships);
        currentUserMemberships = currentUserMemberships.filter(community => {
          return !community.deletedAt
        })
      
        const evaluatingUserCommunityIds = evaluatingUserMemberships.map(community => community.id)
        const currentUserCommunityIds = currentUserMemberships.map(community => community.id)
        const publicCommunityIds = evaluatingUserMemberships
          .filter(community => !community.isPrivate)
          .map(community => community.id)
          
        const overlappingMemberships = intersection(evaluatingUserCommunityIds, currentUserCommunityIds)
        const allVisibleCommunityIds = [...publicCommunityIds, ...overlappingMemberships]
        const distinctCommunityIds = allVisibleCommunityIds.filter((x, i, a) => a.indexOf(x) === i)
      
        return await db
          .collection('communities')
          .find({ id: { $in: distinctCommunityIds } })
          .toArray()
      },
      []
    )
}

// export const getPublicCommunitiesByUser = async (userId: string) => {
//   return await db
//     .table('usersCommunities')
//     // get all the user's communities
//     .getAll([userId, true], { index: 'userIdAndIsMember' })
//     // get the community objects for each community
//     .eqJoin('communityId', db.table('communities'))
//     // only return public community ids
//     .filter(row => row('right')('isPrivate').eq(false))
//     // get rid of unnecessary info from the usersCommunities object on the left
//     .without({ left: ['id', 'communityId', 'userId', 'createdAt'] })
//     // zip the tables
//     .zip()
//     // ensure we don't return any deleted communities
//     .filter(community => db.not(community.hasFields('deletedAt')))
//     .run();
// };
// checked
export const getPublicCommunitiesByUser = (userId: string) => {
  return dbUtil.tryCallAsync(
    'getPublicCommunitiesByUser',
    { userId },
    async () => {
      let ret = await db
        .collection('usersCommunities')
        .find({
          userId: userId,
          isMember: true,
        })
        .toArray();
      ret = await dbUtil.eqJoin(db, ret, 'communityId', 'communities');
      ret = ret.filter(row => {
        return row.right.isPrivate == false;
      });
      ret = dbUtil.without(ret, {
        left: ['id', 'communityId', 'userId', 'createdAt'],
      });
      ret = dbUtil.zip(ret);
      return ret;
    },
    []
  );
};

// export const getCommunitiesChannelCounts = (communityIds: Array<string>) => {
//   return db
//     .table('channels')
//     .getAll(...communityIds, { index: 'communityId' })
//     .filter(channel => db.not(channel.hasFields('deletedAt')))
//     .group('communityId')
//     .count()
//     .run();
// };
// checked
export const getCommunitiesChannelCounts = (communityIds: Array<string>) => {
  return dbUtil.tryCallAsync(
    'getCommunitiesChannelCounts',
    { communityIds },
    async () => {
      let ret = await db
        .collection('channels')
        .find({ communityId: { $in: communityIds }, deletedAt: null })
        .toArray();
      ret = dbUtil.group(ret, 'communityId');
      ret = dbUtil.groupCount(ret);
      return ret;
    },
    []
  );
};

// export const getCommunitiesMemberCounts = (communityIds: Array<string>) => {
//   return db
//     .table('usersCommunities')
//     .getAll(...communityIds.map(id => [id, true]), {
//       index: 'communityIdAndIsMember',
//     })
//     .group('communityId')
//     .count()
//     .run();
// };
// checked
export const getCommunitiesMemberCounts = (communityIds: Array<string>) => {
  return dbUtil.tryCallAsync(
    'getCommunitiesMemberCounts',
    { communityIds },
    async () => {
      let ret = await db
        .collection('usersCommunities')
        .find({ communityId: { $in: communityIds }, isMember: true })
        .toArray();
      ret = dbUtil.group(ret, 'communityId');
      ret = dbUtil.groupCount(ret);
      return ret;
    },
    []
  );
};

// export const getCommunitiesOnlineMemberCounts = (
//   communityIds: Array<string>
// ) => {
//   return db
//     .table('usersCommunities')
//     .getAll(...communityIds.map(id => [id, true]), {
//       index: 'communityIdAndIsMember',
//     })
//     .pluck(['communityId', 'userId'])
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
//     .group('communityId')
//     .count()
//     .run();
// };
// checked
export const getCommunitiesOnlineMemberCounts = (
  communityIds: Array<string>
) => {
  return dbUtil.tryCallAsync(
    'getCommunitiesOnlineMemberCounts',
    { communityIds },
    async () => {
      let ret = await db
        .collection('usersCommunities')
        .find({ communityId: { $in: communityIds }, isMember: true })
        .toArray();
      ret = dbUtil.pluck(ret, ['communityId', 'userId']);
      ret = await dbUtil.eqJoin(db, ret, 'userId', 'users');
      ret = dbUtil.pluck(ret, { right: ['lastSeen', 'isOnline'] });
      ret = dbUtil.zip(ret);
      ret = ret.filter(rec => {
        return rec.isOnline == true;
      });
      return ret;
    },
    []
  );
};

// export const setCommunityLastActive = (id: string, lastActive: Date) => {
//   return db
//     .table('communities')
//     .get(id)
//     .update({
//       lastActive: new Date(lastActive),
//     })
//     .run();
// };
// checked
export const setCommunityLastActive = (id: string, lastActive: Date) => {
  return dbUtil.tryCallAsync(
    'setCommunityLastActive',
    { id, lastActive },
    () => {
      return dbUtil
        .updateOne(
          db,
          'communities',
          {
            id: id,
          },
          {
            $set: {
              lastActive: new Date(lastActive),
            },
          }
        )
        .then(result => {
          return result[0];
        })
        .then(result => {
          dbUtil.pubsub.publish('COMMUNITY_UPDATED', result);
          return result;
        });
    },
    []
  );
};

export type CreateCommunityInput = {
  input: {
    name: string,
    slug: string,
    description: string,
    website: string,
    file: Object,
    coverFile: Object,
    isPrivate: boolean,
  },
};

export type EditCommunityInput = {
  input: {
    name: string,
    slug: string,
    description: string,
    website: string,
    file: Object,
    coverFile: Object,
    coverPhoto: string,
    communityId: string,
    watercoolerId?: boolean,
  },
};

// prettier-ignore
// export const createCommunity = ({ input }: CreateCommunityInput, user: DBUser): Promise<DBCommunity> => {
//   const { name, slug, description, website, file, coverFile, isPrivate } = input

//   return db
//     .table('communities')
//     .insert(
//       {
//         createdAt: new Date(),
//         name,
//         description,
//         website,
//         profilePhoto: null,
//         coverPhoto: null,
//         slug,
//         modifiedAt: null,
//         creatorId: user.id,
//         administratorEmail: user.email,
//         isPrivate,
//         memberCount: 0,
//       },
//       { returnChanges: true }
//     )
//     .run()
//     .then(result => result.changes[0].new_val)
//     .then(community => {
//       searchQueue.add({
//         id: community.id,
//         type: 'community',
//         event: 'created'
//       })

//       // send a welcome email to the community creator
//       sendNewCommunityWelcomeEmailQueue.add({ user, community });
//       // email brian with info about the community and owner
//       _adminSendCommunityCreatedEmailQueue.add({ user, community });

//       // if no file was uploaded, update the community with new string values
//       if (!file && !coverFile) {
//         const { coverPhoto, profilePhoto } = getRandomDefaultPhoto();
//         return db
//           .table('communities')
//           .get(community.id)
//           .update(
//             { ...community, profilePhoto, coverPhoto },
//             { returnChanges: 'always' }
//           )
//           .run()
//           .then(result => {
//             // if an update happened
//             if (result.replaced === 1) {
//               return result.changes[0].new_val;
//             }

//             // an update was triggered from the client, but no data was changed
//             if (result.unchanged === 1) {
//               return result.changes[0].old_val;
//             }
//             return null;
//           });
//       }

//       if (file || coverFile) {
//         if (file && !coverFile) {
//           const { coverPhoto } = getRandomDefaultPhoto();
//           return uploadImage(file, 'communities', community.id)
//             .then(profilePhoto => {
//               return (
//                 db
//                   .table('communities')
//                   .get(community.id)
//                   .update(
//                     {
//                       ...community,
//                       profilePhoto,
//                       coverPhoto,
//                     },
//                     { returnChanges: 'always' }
//                   )
//                   .run()
//                   // return the resulting community with the profilePhoto set
//                   .then(result => {
//                     // if an update happened
//                     if (result.replaced === 1) {
//                       return result.changes[0].new_val;
//                     }

//                     // an update was triggered from the client, but no data was changed
//                     if (result.unchanged === 1) {
//                       return result.changes[0].old_val;
//                     }
//                   })
//               );
//             })
//             .catch(err => {
//               console.error(err);
//             });
//         } else if (!file && coverFile) {
//           const { profilePhoto } = getRandomDefaultPhoto();
//           return uploadImage(coverFile, 'communities', community.id)
//             .then(coverPhoto => {
//               // update the community with the profilePhoto
//               return (
//                 db
//                   .table('communities')
//                   .get(community.id)
//                   .update(
//                     {
//                       ...community,
//                       coverPhoto,
//                       profilePhoto,
//                     },
//                     { returnChanges: 'always' }
//                   )
//                   .run()
//                   // return the resulting community with the profilePhoto set
//                   .then(result => {
//                     // if an update happened
//                     if (result.replaced === 1) {
//                       return result.changes[0].new_val;
//                     }

//                     // an update was triggered from the client, but no data was changed
//                     if (result.unchanged === 1) {
//                       return result.changes[0].old_val;
//                     }

//                     return null;
//                   })
//               );
//             })
//             .catch(err => {
//               console.error(err);
//             });
//         } else if (file && coverFile) {
//           const uploadFile = file => {
//             return uploadImage(file, 'communities', community.id).catch(err => {
//               console.error(err);
//             });
//           };

//           const uploadCoverFile = coverFile => {
//             return uploadImage(coverFile, 'communities', community.id).catch(
//               err => {
//                 console.error(err);
//               }
//             );
//           };

//           return Promise.all([
//             uploadFile(file),
//             uploadCoverFile(coverFile),
//           ]).then(([profilePhoto, coverPhoto]) => {
//             return (
//               db
//                 .table('communities')
//                 .get(community.id)
//                 .update(
//                   {
//                     ...community,
//                     coverPhoto,
//                     profilePhoto,
//                   },
//                   { returnChanges: 'always' }
//                 )
//                 .run()
//                 // return the resulting community with the profilePhoto set
//                 .then(result => {
//                   // if an update happened
//                   if (result.replaced === 1) {
//                     return result.changes[0].new_val;
//                   }

//                   // an update was triggered from the client, but no data was changed
//                   if (result.unchanged === 1) {
//                     return result.changes[0].old_val;
//                   }

//                   return null;
//                 })
//             );
//           });
//         }
//       }
//     });
// };
export const createCommunity = ({ input }: CreateCommunityInput, user: DBUser): any => {
  return dbUtil.tryCallAsync(
    "createCommunity",
    { input, user },
    () => {
      const { name, slug, description, website, file, coverFile, isPrivate } = input

      return dbUtil
        .insert(
          db,
          'communities',
          {
            createdAt: new Date(),
            name,
            description,
            website,
            profilePhoto: null,
            coverPhoto: null,
            slug,
            modifiedAt: null,
            creatorId: user.id,
            administratorEmail: user.email,
            isPrivate,
            memberCount: 0,
          }
        )
        .then(results => {
          return results[0];
        })
        .then(community => {
          searchQueue.add({
            id: community.id,
            type: 'community',
            event: 'created'
          })

          // send a welcome email to the community creator
          sendNewCommunityWelcomeEmailQueue.add({ user, community });
          // email brian with info about the community and owner
          _adminSendCommunityCreatedEmailQueue.add({ user, community });

          // if no file was uploaded, update the community with new string values
          if (!file && !coverFile) {
            const { coverPhoto, profilePhoto } = getRandomDefaultPhoto();
            return dbUtil
              .updateOne(
                db,
                'communities',
                { 
                  id: community.id 
                },
                { 
                  $set: dbUtil.flattenSafe({
                    ...community, 
                    profilePhoto, 
                    coverPhoto 
                  })
                },
              )
              .then(result => {
                return result[0];
              })
          }

          if (file || coverFile) {
            if (file && !coverFile) {
              const { coverPhoto } = getRandomDefaultPhoto();
              return uploadImage(file, 'communities', community.id)
                .then(profilePhoto => {
                  return (
                    dbUtil
                      .updateOne(
                        'communities',
                        { 
                          id: community.id 
                        },
                        {
                          $set: dbUtil.flattenSafe({
                            ...community,
                            profilePhoto,
                            coverPhoto,
                          })
                        },
                      )
                      .then(result => {
                        return result[0];
                      })
                  );
                })
                .catch(err => {
                  console.error(err);
                });
            } else if (!file && coverFile) {
              const { profilePhoto } = getRandomDefaultPhoto();
              return uploadImage(coverFile, 'communities', community.id)
                .then(coverPhoto => {
                  // update the community with the profilePhoto
                  return (
                    dbUtil
                      .updateOne(
                        'communities',
                        {
                          id : community.id 
                        },
                        {
                          $set: dbUtil.flattenSafe({
                            ...community,
                            coverPhoto,
                            profilePhoto,
                          })
                        },
                      )
                      .then(result => {
                        return result[0];
                      })
                  );
                })
                .catch(err => {
                  console.error(err);
                });
            } else if (file && coverFile) {
              const uploadFile = file => {
                return uploadImage(file, 'communities', community.id).catch(err => {
                  console.error(err);
                });
              };

              const uploadCoverFile = coverFile => {
                return uploadImage(coverFile, 'communities', community.id).catch(
                  err => {
                    console.error(err);
                  }
                );
              };

              return Promise.all([
                uploadFile(file),
                uploadCoverFile(coverFile),
              ]).then(([profilePhoto, coverPhoto]) => {
                return (
                  dbUtil
                    .updateOne(
                      'communities',
                      { id: community.id }
                      ,
                      {
                        ...community,
                        coverPhoto,
                        profilePhoto,
                      },
                    )
                    .then(result => {
                      return result[0];
                    })
                );
              });
            }
          }
        }); 
    },
    null
  )
};

// prettier-ignore
// export const editCommunity = async ({ input }: EditCommunityInput, userId: string): Promise<DBCommunity> => {
//   const { name, slug, description, website, watercoolerId, file, coverPhoto, coverFile, communityId } = input

//   let community = await db.table('communities').get(communityId).run()

//   // if the input comes in with a coverPhoto of length 0 (empty string), it means
//   // the user was trying to delete or reset their cover photo from the front end.
//   // in this case we can just set a new default. Otherwise, just keep their
//   // original cover photo
//   let updatedCoverPhoto = community.coverPhoto
//   if (input.coverPhoto.length === 0) {
//     ({ coverPhoto: updatedCoverPhoto } = getRandomDefaultPhoto())
//   }

//   return db
//     .table('communities')
//     .get(communityId)
//     .update({
//       ...community,
//       name,
//       slug,
//       description,
//       website,
//       watercoolerId: watercoolerId || community.watercoolerId,
//       coverPhoto: coverFile
//         ? await uploadImage(coverFile, 'communities', community.id)
//         : updatedCoverPhoto,
//       profilePhoto: file
//         ? await uploadImage(file, 'communities', community.id)
//         : community.profilePhoto,
//       modifiedAt: new Date()
//     }, { returnChanges: 'always' })
//     .run()
//     .then(result => {
//       if (result.replaced === 1) {
//         community = result.changes[0].new_val;
//       }

//       // an update was triggered from the client, but no data was changed
//       if (result.unchanged === 1) {
//         community = result.changes[0].old_val;
//       }

//       searchQueue.add({
//         id: communityId,
//         type: 'community',
//         event: 'edited'
//       })

//       return community
//     })
// };
export const editCommunity = ({ input }: EditCommunityInput, userId: string): Promise<DBCommunity> => {
  return dbUtil
    .tryCallAsync(
      "editCommunity",
      { input },
      async () => {
        const { name, slug, description, website, watercoolerId, file, coverPhoto, coverFile, communityId } = input;

        let community = await db.collection('communities').findOne({ id: communityId });
      
        // if the input comes in with a coverPhoto of length 0 (empty string), it means
        // the user was trying to delete or reset their cover photo from the front end.
        // in this case we can just set a new default. Otherwise, just keep their
        // original cover photo
        let updatedCoverPhoto = community.coverPhoto
        if (input.coverPhoto.length === 0) {
          ({ coverPhoto: updatedCoverPhoto } = getRandomDefaultPhoto())
        }

        return dbUtil
          .updateOne(
            db,
            "communities", 
            { 
              id: communityId
            },
            {
              $set: dbUtil.flattenSafe({
                ...community,
                name: name || community.name,
                slug: slug || community.slug,
                description: description || community.description,
                website: website || community.website,
                watercoolerId: watercoolerId || community.watercoolerId,
                coverPhoto: coverFile
                  ? await uploadImage(coverFile, 'communities', community.id)
                  : updatedCoverPhoto,
                profilePhoto: file
                  ? await uploadImage(file, 'communities', community.id)
                  : community.profilePhoto,
                modifiedAt: new Date()
              }),
            }
          )
          .then(result => {
            searchQueue.add({
              id: communityId,
              type: 'community',
              event: 'edited'
            })

            return result[0];
          })
          .then(result => {
            // #marker 
            dbUtil.pubsub.publish("COMMUNITY_UPDATED", result)

            return result;
          })
      },
      null
    )
};

// export const toggleCommunityRedirect = async (communityId: string) => {
//   const community = await db.table('communities').get(communityId);
//   if (!community) return null;

//   return db
//     .table('communities')
//     .get(communityId)
//     .update(
//       {
//         redirect: !community.redirect,
//       },
//       {
//         returnChanges: true,
//       }
//     )
//     .then(result => {
//       if (!Array.isArray(result.changes) || result.changes.length === 0)
//         return getCommunityById(communityId);
//       return result.changes[0].new_val;
//     });
// };
export const toggleCommunityRedirect = (communityId: string) => {
  return dbUtil.tryCallAsync(
    'toggleCommunityRedirect',
    { communityId },
    async () => {
      const community = await db
        .collection('communities')
        .findOne({ id: communityId });
      if (!community) return null;

      return dbUtil
        .updateOne(
          'communities',
          {
            id: communityId,
          },
          {
            $set: {
              redirect: !community.redirect,
            },
          }
        )
        .then(result => {
          return result[0];
        })
        .then(result => {
          dbUtil.pubsub.publish('COMMUNITY_UPDATED', result);

          return result;
        });
    },
    null
  );
};

// export const toggleCommunityNoindex = async (communityId: string) => {
//   const community = await db.table('communities').get(communityId);
//   if (!community) return null;

//   return db
//     .table('communities')
//     .get(communityId)
//     .update(
//       {
//         noindex: !community.noindex,
//       },
//       {
//         returnChanges: true,
//       }
//     )
//     .then(result => {
//       if (!Array.isArray(result.changes) || result.changes.length === 0)
//         return getCommunityById(communityId);
//       return result.changes[0].new_val;
//     });
// };
export const toggleCommunityNoindex = (communityId: string) => {
  return dbUtil.tryCallAsync(
    'toggleCommunityNoindex',
    { communityId },
    async () => {
      const community = await db
        .table('communities')
        .findOne({ id: communityId });
      if (!community) return null;

      return dbUtil
        .updateOne(
          db,
          'communities',
          {
            id: communityId,
          },
          {
            noindex: !community.noindex,
          }
        )
        .then(result => {
          if (!Array.isArray(result.changes) || result.changes.length === 0)
            return getCommunityById(communityId);
          return result[0];
        })
        .then(result => {
          dbUtil.pubsub.publish('COMMUNITY_UPDATED', result);

          return result;
        });
    },
    null
  );
};

// export const setCommunityWatercoolerId = (
//   communityId: string,
//   threadId: ?string
// ) => {
//   return db
//     .collection('communities')
//     .findOneAndUpdate(
//       { id: communityId },
//       {
//         watercoolerId: threadId,
//       },
//       {
//         returnDocument: 'after',
//         returnNewDocument: true,
//       }
//     )
//     .then(result => {
//       if (!result) return getCommunityById(communityId);
//       return result;
//     });
// };
export const setCommunityWatercoolerId = (
  communityId: string,
  threadId: ?string
) => {
  return dbUtil.tryCallAsync(
    'setCommunityWatercoolerId',
    { communityId, threadId },
    () => {
      return dbUtil
        .updateOne(
          db,
          'communities',
          { id: communityId },
          {
            $set: {
              watercoolerId: threadId,
            },
          }
        )
        .then(result => {
          return result[0];
        })
        .then(result => {
          dbUtil.pubsub.publish('COMMUNITY_UPDATED', result);

          return result;
        });
    },
    null
  );
};

// prettier-ignore
// export const deleteCommunity = (communityId: string, userId: string): Promise<DBCommunity> => {
//   return db
//     .table('communities')
//     .get(communityId)
//     .update(
//       {
//         deletedBy: userId,
//         deletedAt: new Date(),
//         slug: db.uuid(),
//       },
//       {
//         returnChanges: 'always',
//         nonAtomic: true,
//       }
//     )
//     .run()
//     .then(() => {
//       searchQueue.add({
//         id: communityId,
//         type: 'community',
//         event: 'deleted'
//       })
//     });
// };
export const deleteCommunity = (communityId: string, userId: string): Promise<DBCommunity> => {
  return dbUtil
    .tryCallAsync(
      "deleteCommunity",
      () => {
        return dbUtil.updateOne(db, 
          'communities',
          { 
            id: communityId 
          },
          {
            $set: {
              deletedBy: userId,
              deletedAt: new Date(),
              slug: dbUtil.generateUuid(),
            }
          })
          .then((result) => {
            searchQueue.add({
              id: communityId,
              type: 'community',
              event: 'deleted'
            })

            return result
          })
          .then(result => {
            dbUtil.pubsub.publish("COMMUNITY_UPDATED", result);
            return result;
          });
      },
      null
    )
};

// prettier-ignore
// export const setPinnedThreadInCommunity = (communityId: string, value: ?string, userId: string): Promise<DBCommunity> => {
//   return db
//     .table('communities')
//     .get(communityId)
//     .update(
//       {
//         pinnedThreadId: value,
//       },
//       { returnChanges: 'always' }
//     )
//     .run()
//     .then(result => {
//       // prettier-ignore
//       return result.changes[0].new_val
//     });
// };
// checked
export const setPinnedThreadInCommunity = (communityId: string, value: ?string, userId: string): Promise<DBCommunity> => {
  return dbUtil
    .tryCallAsync(
      "setPinnedThreadInCommunity",
      () => {
        return dbUtil
          .updateOne(
            'communities',
            { 
              id: communityId 
            },
            {
              $set: {
                pinnedThreadId: value,
              }
            }
          ).then(result => {
            return result[0];
          })
          .then(result => {
            dbUtil.pubsub.publish("COMMUNITY_UPDATED", result);
            return result;
          });
      },
      null
    )  
};

// prettier-ignore
// export const userIsMemberOfAnyChannelInCommunity = (communityId: string, userId: string): Promise<Boolean> => {
//   return db('spectrum')
//     .table('channels')
//     .getAll(communityId, { index: 'communityId' })
//     .eqJoin('id', db.table('usersChannels'), { index: 'channelId' })
//     .zip()
//     .filter({ userId })
//     .pluck('isMember')
//     .run()
//     .then(channels => channels.some(channel => channel.isMember));
// };
// checked
export const userIsMemberOfAnyChannelInCommunity = (communityId: string, userId: string): Promise<Boolean> => {
  return dbUtil
    .tryCallAsync(
      "userIsMemberOfAnyChannelInCommunity",
      async () => {
        let ret = await db
          .collection("channels")
          .find({ communityId: communityId })
          .toArray();
        ret = await dbUtil.eqJoin(db, ret, "id", "usersChannels", "channelId")
        ret = dbUtil.zip(ret);
        ret = ret.filter(rec => {
          return rec.userId == userId
        });
        ret = dbUtil.pluck(ret, "isMember");
        ret = ret.some(channel => {
          return channel.isMember
        })
        return ret;
      },
      false
    )
};

// export const getRecentCommunities = (): Array<DBCommunity> => {
//   return db
//     .table('communities')
//     .orderBy({ index: db.desc('createdAt') })
//     .filter(community => db.not(community.hasFields('deletedAt')))
//     .limit(100)
//     .run();
// };
export const getRecentCommunities = (): Array<DBCommunity> => {
  return dbUtil.tryCallAsync(
    'getRecentCommunities',
    () => {
      return db
        .collection('communities')
        .find({ deletedAt: null })
        .sort({ createdAt: -1 })
        .limit(100);
    },
    []
  );
};

// export const getThreadCount = (communityId: string) => {
//   return db
//     .table('threads')
//     .getAll(communityId, { index: 'communityId' })
//     .filter(thread => db.not(thread.hasFields('deletedAt')))
//     .count()
//     .run();
// };
export const getThreadCount = (communityId: string) => {
  return dbUtil.tryCallAsync(
    'getThreadCount',
    { communityId },
    () => {
      return db
        .collection('threads')
        .find({ communityId: communityId, deletedAt: null })
        .count();
    },
    0
  );
};

// export const getCommunityGrowth = async (
//   table: string,
//   range: Timeframe,
//   field: string,
//   communityId: string,
//   filter?: mixed
// ) => {
//   const { current, previous } = parseRange(range);
//   const currentPeriodCount = await db
//     .table(table)
//     .getAll(communityId, { index: 'communityId' })
//     .filter(db.row(field).during(db.now().sub(current), db.now()))
//     .filter(filter ? filter : '')
//     .count()
//     .run();

//   const prevPeriodCount = await db
//     .table(table)
//     .getAll(communityId, { index: 'communityId' })
//     .filter(db.row(field).during(db.now().sub(previous), db.now().sub(current)))
//     .filter(filter ? filter : '')
//     .count()
//     .run();

//   const rate = (await (currentPeriodCount - prevPeriodCount)) / prevPeriodCount;
//   return {
//     currentPeriodCount,
//     prevPeriodCount,
//     growth: Math.round(rate * 100),
//   };
// };
export const getCommunityGrowth = (
  table: string,
  range: Timeframe,
  field: string,
  communityId: string,
  filter?: mixed
) => {
  return dbUtil.tryCallAsync(
    'getCommunityGrowth',
    { table, range, field, communityId, filter },
    async () => {
      const { current, previous } = parseRange(range);
      const currentPeriodCount = await db.collection(table).countDocuments({
        communityId: communityId,
        [field]: {
          $gt: new Date(new Date() - current),
          $lt: new Date(),
        },
      });

      const prevPeriodCount = await db.collection(table).countDocuments({
        communityId: communityId,
        [field]: {
          $gt: new Date(new Date() - previous),
          $lt: new Date(new Date() - current),
        },
      });

      const rate =
        (await (currentPeriodCount - prevPeriodCount)) / prevPeriodCount;

      return {
        currentPeriodCount,
        prevPeriodCount,
        growth: Math.round(rate * 100),
      };
    },
    null
  );
};

// prettier-ignore
// export const setCommunityPendingAdministratorEmail = (communityId: string, email: string, userId: string): Promise<DBCommunity> => {
//   return db
//     .table('communities')
//     .get(communityId)
//     .update({
//       pendingAdministratorEmail: email,
//     })
//     .run()
//     .then(async () => {
//       return await getCommussnityById(communityId)
//     });
// };
export const setCommunityPendingAdministratorEmail = (communityId: string, email: string, userId: string): Promise<DBCommunity> => {
  return dbUtil
    .tryCallAsync(
      "setCommunityPendingAdministratorEmail",
      () => {
        return dbUtil
          .updateOne(
            'communities',
            { 
              id: communityId 
            },
            {
              $set: {
                pendingAdministratorEmail: email,
              }
            })
          .then(async () => {
            return await getCommunityById(communityId)
          })
          .then(result => {
            dbUtil.pubsub.publish("COMMUNITY_UPDATED", result);
            return result;
          });
      },
      null
    )
};

// prettier-ignore
// export const updateCommunityAdministratorEmail = (communityId: string, email: string, userId: string): Promise<DBCommunity> => {
//   return db
//     .table('communities')
//     .get(communityId)
//     .update({
//       administratorEmail: email,
//       pendingAdministratorEmail: db.literal(),
//     })
//     .run()
//     .then(async () => {
//       return await getCommunityById(communityId)
//     });
// };
export const updateCommunityAdministratorEmail = (communityId: string, email: string, userId: string): Promise<DBCommunity> => {
  return dbUtil
    .tryCallAsync(
      "updateCommunityAdministratorEmail",
      () => {
        return dbUtil
          .updateOne(
            'communities',
            { 
              id: communityId 
            }, 
            {
              $set: {
                administratorEmail: email,
              },
              $unset: {
                pendingAdministratorEmail: ""
              }
            })
            .then(async () => {
              return await getCommunityById(communityId)
            })
            .then(result => {
              dbUtil.pubsub.publish("COMMUNITY_UPDATED", result);
              return result;
            });
      },
      null
    )
};

// export const resetCommunityAdministratorEmail = (communityId: string) => {
//   return db
//     .table('communities')
//     .get(communityId)
//     .update({
//       administratorEmail: null,
//       pendingAdministratorEmail: db.literal(),
//     })
//     .run();
// };
export const resetCommunityAdministratorEmail = (communityId: string) => {
  return dbUtil.tryCallAsync(
    'resetCommunityAdministratorEmail',
    { communityId },
    () => {
      return dbUtil
        .updateOne(
          'communities',
          {
            id: communityId,
          },
          {
            $set: {
              administratorEmail: null,
            },
            $unset: {
              pendingAdministratorEmail: '',
            },
          }
        )
        .then(result => {
          dbUtil.pubsub.publish('COMMUNITY_UPDATED', result);
          return result;
        });
    },
    null
  );
};

// export const incrementMemberCount = (
//   communityId: string
// ): Promise<DBCommunity> => {
//   return db
//     .table('communities')
//     .get(communityId)
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
export const incrementMemberCount = (
  communityId: string
): Promise<DBCommunity> => {
  return dbUtil.tryCallAsync(
    'incrementMemberCount',
    { communityId },
    () => {
      return dbUtil
        .updateOne(
          db,
          'communities',
          {
            id: communityId,
          },
          {
            $inc: {
              memberCount: 1,
            },
          }
        )
        .then(result => {
          return result[0];
        })
        .then(result => {
          dbUtil.pubsub.publish('COMMUNITY_UPDATED', result);
          return result;
        });
    },
    null
  );
};

// export const decrementMemberCount = (
//   communityId: string
// ): Promise<DBCommunity> => {
//   return db
//     .table('communities')
//     .get(communityId)
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
export const decrementMemberCount = (
  communityId: string
): Promise<DBCommunity> => {
  return dbUtil.tryCallAsync(
    'decrementMemberCount',
    { communityId },
    () => {
      return dbUtil
        .updateOne(
          db,
          'communities',
          {
            id: communityId,
          },
          {
            $sub: {
              memberCount: 1,
            },
          }
        )
        .then(result => {
          return result[0];
        })
        .then(result => {
          dbUtil.pubsub.publish('COMMUNITY_UPDATED', result);
          return result;
        });
    },
    null
  );
};

// export const setMemberCount = (
//   communityId: string,
//   value: number
// ): Promise<DBCommunity> => {
//   return db
//     .table('communities')
//     .get(communityId)
//     .update(
//       {
//         memberCount: value,
//       },
//       { returnChanges: true }
//     )
//     .run()
//     .then(result => result.changes[0].new_val || result.changes[0].old_val);
// };
export const setMemberCount = (
  communityId: string,
  value: number
): Promise<DBCommunity> => {
  return dbUtil.tryCallAsync(
    'setMemberCount',
    { communityId, value },
    () => {
      return dbUtil
        .updateOne(
          db,
          'communities',
          {
            id: communityId,
          },
          {
            $set: {
              memberCount: value,
            },
          }
        )
        .then(result => {
          return result[0];
        })
        .then(result => {
          dbUtil.pubsub.publish('COMMUNITY_UPDATED', result);
          return result;
        });
    },
    null
  );
};

// const getUpdatedCommunitiesChangefeed = () =>
//   db
//     .table('communities')
//     .changes({
//       includeInitial: false,
//     })('new_val')
//     .run();
const getUpdatedCommunitiesChangefeed = () => {};

// export const listenToUpdatedCommunities = (cb: Function): Function => {
//   return createChangefeed(
//     getUpdatedCommunitiesChangefeed,
//     cb,
//     'listenToUpdatedCommunities'
//   );
// };

export const listenToUpdatedCommunities = (cb: Function): Function => {
  return createChangefeed(
    getUpdatedCommunitiesChangefeed,
    cb,
    'listenToUpdatedCommunities'
  );
};
