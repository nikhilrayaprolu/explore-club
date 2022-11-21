// @flow
const { db } = require('shared/db');
import type { DBThread } from 'shared/types';
const dbUtil = require('shared/dbUtil');

// export const getThreadById = (id: string): Promise<DBThread> => {
//   return db
//     .table('threads')
//     .get(id)
//     .run();
// };
export const getThreadById = (id: string): Promise<DBThread> => {
  return dbUtil.tryCallAsync(
    'getThreadById',
    { id },
    () => {
      return db.collection('threads').findOne({ id: id });
    },
    null
  );
};
