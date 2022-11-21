// @flow
import { createReadQuery, db } from 'shared/db';
import type { DBCommunity } from 'shared/types';
import dbUtil from 'shared/dbUtil';

// export const getCommunityById = createReadQuery((id: string) => ({
//   query: db.table('communities').get(id),
//   tags: (community: ?DBCommunity) => (community ? [community.id] : []),
// }));
export const getCommunityById = createReadQuery((id: string) => ({
  query: dbUtil.tryCallAsync(
    '[Shared] getCommunityById',
    { id },
    () => {
      return db.collection('communities').findOne({ id: id });
    },
    null
  ),
  tags: (community: ?DBCommunity) => (community ? [community.id] : []),
}));

// export const getCommunitiesById = createReadQuery((ids: Array<string>) => ({
//   query: db.table('communities').getAll(...ids),
//   tags: (communities: ?Array<DBCommunity>) =>
//     communities ? communities.map(({ id }) => id) : [],
// }));
export const getCommunitiesById = createReadQuery((ids: Array<string>) => ({
  query: dbUtil.tryCallAsync(
    '[Shared] getCommunitiesById',
    { ids },
    () => {
      return db
        .collection('communities')
        .find({ id: { $in: ids } })
        .toArray();
    },
    []
  ),
  tags: (communities: ?Array<DBCommunity>) =>
    communities ? communities.map(({ id }) => id) : [],
}));

// export const getTopCommunitiesByMemberCount = createReadQuery(
//   (amount: number) => ({
//     query: db
//       .table('communities')
//       .orderBy({ index: db.desc('memberCount') })
//       .filter(community => community.hasFields('deletedAt').not())
//       .limit(amount),
//     tags: (communities: Array<DBCommunity>) =>
//       communities ? communities.map(({ id }) => id) : [],
//   })
// );
export const getTopCommunitiesByMemberCount = createReadQuery(
  (amount: number) => ({
    query: dbUtil.tryCallAsync(
      '[Shared] getTopCommunitiesByMemberCount',
      { amount },
      () => {
        return db
          .collection('communities')
          .find({ deletedAt: null })
          .sort({ memberCount: -1 })
          .limit(amount)
          .toArray();
      },
      []
    ),
    tags: (communities: Array<DBCommunity>) =>
      communities ? communities.map(({ id }) => id) : [],
  })
);
