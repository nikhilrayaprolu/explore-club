// @flow
const { db } = require('shared/db');
const dbUtil = require('shared/dbUtil');

// export const getChannelSettings = (id: string) => {
//   return db
//     .table('channelSettings')
//     .getAll(id, { index: 'channelId' })
//     .run()
//     .then(data => {
//       if (!data || data.length === 0) return null;
//       return data[0];
//     });
// };
export const getChannelSettings = (id: string) => {
  return dbUtil.tryCallAsync(
    'getChannelSettings',
    { id },
    () => {
      return db
        .collection('channelSettings')
        .find({ channelId: id })
        .toArray()
        .then(data => {
          if (!data || data.length === 0) return null;
          return data[0];
        });
    },
    null
  );
};
