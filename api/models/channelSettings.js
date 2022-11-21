// @flow
const { db } = require('shared/db');
import type { DBChannelSettings, DBChannel } from 'shared/types';
import { getChannelById } from './channel';
const dbUtil = require('shared/dbUtil');

const defaultSettings = {
  joinSettings: {
    tokenJoinEnabled: false,
    token: null,
  },
  slackSettings: {
    botLinks: {
      threadCreated: null,
    },
  },
};

// prettier-ignore
// export const getOrCreateChannelSettings = async (channelId: string): Promise<DBChannelSettings> => {
//   const settings = await db
//     .table('channelSettings')
//     .getAll(channelId, { index: 'channelId' })
//     .run();

//   if (!settings || settings.length === 0) {
//     return await db
//       .table('channelSettings')
//       .insert(
//         {
//           ...defaultSettings,
//           channelId,
//         },
//         { returnChanges: true }
//       )
//       .run()
//       .then(results => results.changes[0].new_val);
//   }

//   return settings[0];
// };
// checked
export const getOrCreateChannelSettings = (channelId: string): Promise<DBChannelSettings> => {
  return dbUtil.tryCallAsync(
    'getOrCreateChannelSettings', 
    { channelId },
    async () => {
      const settings = await db
        .collection("channelSettings")
        .find({ channelId: channelId })
        .toArray();

      if (!settings || settings.length === 0) {
        return dbUtil.insert(db, 
          "channelSettings",
          {
            ...defaultSettings,
            channelId: channelId
          }
        )
        .then(results => {
          return results[0]
        });
      }

      return settings;
    }, 
    null
  )
};

// prettier-ignore
// export const getChannelsSettings = async (channelIds: Array<string>): Promise<?DBChannelSettings> => {
//   return db
//     .table('channelSettings')
//     .getAll(...channelIds, { index: 'channelId' })
//     .run()
//     .then(data => {
//       if (!data || data.length === 0)
//         return Array.from({ length: channelIds.length }, (_, index) => ({
//           ...defaultSettings,
//           channelId: channelIds[index],
//         }));

//       return data.map(
//         (rec, index) =>
//           rec
//             ? rec
//             : {
//                 ...defaultSettings,
//                 channelId: channelIds[index],
//               }
//       );
//     });
// };
// checked
export const getChannelsSettings = (channelIds: Array<string>): any => {
  return dbUtil.tryCallAsync(
    "getChannelsSettings",
    { channelIds },
    () => {
      return db
        .collection("channelSettings")
        .find({ channelId: { $in: channelIds } })
        .toArray()
        .then(data => {
          if (!data || data.length === 0)
            return Array.from({ length: channelIds.length }, (_, index) => ({
              ...defaultSettings,
              channelId: channelIds[index],
            }));
    
          return data.map(
            (rec, index) =>
              rec
                ? rec
                : {
                    ...defaultSettings,
                    channelId: channelIds[index],
                  }
          );
        });
    },
    null
  ) 
};

// export const enableChannelTokenJoin = (channelId: string) => {
//   return db
//     .table('channelSettings')
//     .getAll(channelId, { index: 'channelId' })
//     .update({
//       joinSettings: {
//         tokenJoinEnabled: true,
//         token: uuidv4(),
//       },
//     })
//     .run()
//     .then(async () => {
//       return await getChannelById(channelId);
//     });
// };
// checked
export const enableChannelTokenJoin = (channelId: string) => {
  return dbUtil.tryCallAsync(
    'enableChannelTokenJoin',
    { channelId },
    () => {
      return dbUtil
        .updateMany(
          'channelSettings',
          {
            channelId: channelId,
          },
          {
            $set: dbUtil.flattenSafe({
              joinSettings: {
                tokenJoinEnabled: true,
                token: dbUtil.generateUuid(),
              },
            }),
          }
        )
        .then(() => {
          return getChannelById(channelId);
        });
    },
    null
  );
};

// export const disableChannelTokenJoin = (channelId: string) => {
//   return db
//     .table('channelSettings')
//     .getAll(channelId, { index: 'channelId' })
//     .update({
//       joinSettings: {
//         tokenJoinEnabled: false,
//         token: null,
//       },
//     })
//     .run()
//     .then(async () => {
//       return await getChannelById(channelId);
//     });
// };
// checked
export const disableChannelTokenJoin = (channelId: string) => {
  return dbUtil.tryCallAsync(
    'disableChannelTokenJoin',
    { channelId },
    () => {
      return dbUtil
        .updateMany(
          'channelSettings',
          {
            channelId: channelId,
          },
          {
            $set: dbUtil.flattenSafe({
              joinSettings: {
                tokenJoinEnabled: false,
                token: null,
              },
            }),
          }
        )
        .then(async () => {
          return await getChannelById(channelId);
        });
    },
    null
  );
};

// export const resetChannelJoinToken = (channelId: string) => {
//   return db
//     .table('channelSettings')
//     .getAll(channelId, { index: 'channelId' })
//     .update({
//       joinSettings: {
//         token: uuidv4(),
//       },
//     })
//     .run()
//     .then(async () => {
//       return await getChannelById(channelId);
//     });
// };
// checked
export const resetChannelJoinToken = (channelId: string) => {
  return dbUtil.tryCallAsync(
    'resetChannelJoinToken',
    { channelId },
    () => {
      return dbUtil
        .updateMany(
          'channelSettings',
          {
            channelId: channelId,
          },
          {
            $set: dbUtil.flattenSafe({
              joinSettings: {
                token: dbUtil.generateUuid(),
              },
            }),
          }
        )
        .then(async () => {
          return await getChannelById(channelId);
        });
    },
    null
  );
};

type UpdateInput = {
  channelId: string,
  slackChannelId: ?string,
  eventType: 'threadCreated',
};

// prettier-ignore
// export const updateChannelSlackBotLinks = async ({ channelId, slackChannelId, eventType }: UpdateInput): Promise<DBChannel> => {
//   const settings: DBChannelSettings = await getOrCreateChannelSettings(
//     channelId
//   );

//   let newSettings;
//   if (!settings.slackSettings) {
//     settings.slackSettings = {
//       botLinks: {
//         [eventType]:
//           slackChannelId && slackChannelId.length > 0 ? slackChannelId : null,
//       },
//     };
//     newSettings = Object.assign({}, settings);
//   } else {
//     newSettings = Object.assign({}, settings, {
//       slackSettings: {
//         botLinks: {
//           [eventType]:
//             slackChannelId && slackChannelId.length > 0 ? slackChannelId : null,
//         },
//       },
//     });
//   }

//   return db
//     .table('channelSettings')
//     .getAll(channelId, { index: 'channelId' })
//     .update({
//       ...newSettings,
//     })
//     .run()
//     .then(async () => {
//       return await getChannelById(channelId)
//     });
// };
// checked
export const updateChannelSlackBotLinks = ({ channelId, slackChannelId, eventType }: UpdateInput): Promise<DBChannel> => {
  return dbUtil.tryCallAsync(
    "updateChannelSlackBotLinks",
    { channelId, slackChannelId, eventType },
    async () => {
      const settings: DBChannelSettings = await getOrCreateChannelSettings(
        channelId
      );
    
      let newSettings;
      if (!settings.slackSettings) {
        settings.slackSettings = {
          botLinks: {
            [eventType]:
              slackChannelId && slackChannelId.length > 0 ? slackChannelId : null,
          },
        };
        newSettings = Object.assign({}, settings);
      } else {
        newSettings = Object.assign({}, settings, {
          slackSettings: {
            botLinks: {
              [eventType]:
                slackChannelId && slackChannelId.length > 0 ? slackChannelId : null,
            },
          },
        });
      }
    
      return dbUtil
        .updateMany(
          'channelSettings',
          {
            channelId: channelId
          },
          {
            $set: dbUtil.flattenSafe(newSettings)
          }
        )
        .then(() => {
          return getChannelById(channelId)
        });
    },
    null
  )
};
