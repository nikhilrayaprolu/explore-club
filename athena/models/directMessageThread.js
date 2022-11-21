// @flow
const { db } = require('shared/db');
import type { DBDirectMessageThread } from 'shared/types';
const dbUtil = require('shared/dbUtil');

// export const getDirectMessageThreadById = (
//   id: string
// ): Promise<DBDirectMessageThread> => {
//   return db
//     .table('directMessageThreads')
//     .get(id)
//     .run();
// };
export const getDirectMessageThreadById = (
  id: string
): Promise<DBDirectMessageThread> => {
  return dbUtil.tryCallAsync(
    'getDirectMessageThreadById',
    { id },
    () => {
      return db.collection('directMessageThreads').findOne({ id: id });
    },
    null
  );
};
