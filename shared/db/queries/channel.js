// @flow
import { createReadQuery, db } from 'shared/db';
import type { DBChannel } from 'shared/types';
import dbUtil from 'shared/dbUtil';

// export const getChannelById = createReadQuery((id: string) => ({
//   query: db.table('channels').get(id),
//   tags: (channel: ?DBChannel) => (channel ? [channel.id] : []),
// }));
export const getChannelById = createReadQuery((id: string) => ({
  query: dbUtil.tryCallAsync(
    '[Shared] getChannelById',
    { id },
    () => {
      return db.collection('channels').findOne({ id: id });
    },
    null
  ),
  tags: (channel: ?DBChannel) => (channel ? [channel.id] : []),
}));

// export const getChannelsById = createReadQuery((ids: Array<string>) => ({
//   query: db.table('channels').getAll(...ids),
//   tags: (channels: ?Array<DBChannel>) =>
//     channels ? channels.map(({ id }) => id) : [],
// }));
export const getChannelsById = createReadQuery((ids: Array<string>) => ({
  query: dbUtil.tryCallAsync(
    '[Shared] getChannelsById',
    { ids },
    () => {
      return db
        .collection('channels')
        .find({ id: { $in: ids } })
        .toArray();
    },
    []
  ),
  tags: (channels: ?Array<DBChannel>) =>
    channels ? channels.map(({ id }) => id) : [],
}));
