// @flow
import { createReadQuery, db } from 'shared/db';
import type { DBMessage } from 'shared/types';
import dbUtil from 'shared/dbUtil';

// export const getMessageById = createReadQuery((id: string) => ({
//   query: db.table('messages').get(id),
//   tags: (message: ?DBMessage) => (message ? [message.id] : []),
// }));
export const getMessageById = createReadQuery((id: string) => ({
  query: dbUtil.tryCallAsync(
    '[Shared] getMessageById',
    { id },
    () => {
      return db.collection('messages').findOne({ id: id });
    },
    null
  ),
  tags: (message: ?DBMessage) => (message ? [message.id] : []),
}));
