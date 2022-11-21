// @flow
const { db } = require('shared/db');
const dbUtil = require('shared/dbUtil');

// export const getAllReactionsInThread = (
//   messageIds: Array<string>
// ): Promise<Array<Object>> => {
//   return db
//     .table('reactions')
//     .getAll(...messageIds, { index: 'messageId' })
//     .run();
// };
export const getAllReactionsInThread = (
  messageIds: Array<string>
): Promise<Array<Object>> => {
  dbUtil.tryCallAsync(
    'getAllReactionsInThread',
    { messageIds },
    () => {
      return db
        .collection('reactions')
        .find({ messageId: { $in: messageIds } })
        .toArray();
    },
    []
  );
};
