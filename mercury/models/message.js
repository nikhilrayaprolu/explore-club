// @flow
const { db } = require('shared/db');
const dbUtil = require('shared/dbUtil');

// export const getMessage = (id: string): Promise<Object> => {
//   return db
//     .table('messages')
//     .get(id)
//     .run();
// };
export const getMessage = (id: string): Promise<Object> => {
  return dbUtil.tryCallAsync(
    'getMessage',
    { id },
    () => {
      return db
        .collection('messages')
        .findOne({ id: id })
        .run();
    },
    null
  );
};

// export const getMessagesByThreadId = (
//   threadId: string
// ): Promise<Array<Object>> => {
//   return db
//     .table('messages')
//     .getAll(threadId, { index: 'threadId' })
//     .run();
// };
export const getMessagesByThreadId = (
  threadId: string
): Promise<Array<Object>> => {
  return dbUtil.tryCallAsync(
    'getMessagesByThreadId',
    { threadId },
    () => {
      return db
        .collection('messages')
        .find({ threadId: threadId })
        .toArray();
    },
    []
  );
};
