// @flow
const { db } = require('shared/db');
import type { DBChannel } from 'shared/types';
const dbUtil = require('shared/dbUtil');

// export const getChannelById = (id: string): Promise<DBChannel> => {
//   return db
//     .table('channels')
//     .get(id)
//     .run();
// };
export const getChannelById = (id: string): Promise<DBChannel> => {
  return dbUtil.tryCallAsync(
    'getChannelById',
    { id },
    () => {
      return db.collection('channels').findOne({ id: id });
    },
    null
  );
};
