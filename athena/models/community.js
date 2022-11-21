// @flow
const { db } = require('shared/db');
import type { DBCommunity } from 'shared/types';
const dbUtil = require('shared/dbUtil');

// export const getCommunityById = (id: string): Promise<DBCommunity> => {
//   return db
//     .table('communities')
//     .get(id)
//     .run();
// };
export const getCommunityById = (id: string): Promise<DBCommunity> => {
  return dbUtil.tryCallAsync(
    'getCommunityById',
    { id },
    () => {
      return db.collection('communities').findOne({ id: id });
    },
    null
  );
};
