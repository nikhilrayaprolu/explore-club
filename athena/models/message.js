// @flow
const { db } = require('shared/db');
import type { DBMessage } from 'shared/types';
const dbUtil = require('shared/dbUtil');

// export const getMessageById = (id: string): Promise<DBMessage> => {
//   return db
//     .table('messages')
//     .get(id)
//     .run();
// };
export const getMessageById = (id: string): Promise<DBMessage> => {
  return dbUtil.tryCallAsync(
    'getMessageById',
    { id },
    () => {
      return db.collection('messages').findOne({ id: id });
    },
    null
  );
};
