//@flow
const { db } = require('shared/db');
import type { DBCommunity } from 'shared/types';
import { getCommunitiesBySlug } from './community';
const dbUtil = require('shared/dbUtil');

// prettier-ignore
// export const getCuratedCommunities = (type: string): Promise<Array<DBCommunity>> => {
//   return db
//     .table('curatedContent')
//     .filter({ type })
//     .run()
//     .then(results => (results && results.length > 0 ? results[0] : null))
//     .then(result => result && getCommunitiesBySlug(result.data));
// };
export const getCuratedCommunities = (type: string): Promise<Array<DBCommunity>> => {
  return dbUtil.tryCallAsync(
    "getCuratedCommunities",
    { type },
    () => {
      return db
        .collection('curatedContent')
        .find({ type: type })
        .toArray()
        .then(results => (results && results.length > 0 ? results[0] : null))
        .then(result => result && getCommunitiesBySlug(result.data));
    },
    []
  )
};
