// @flow
const { db } = require('shared/db');
import { intersection } from 'lodash';
import {
  getCommunitiesWithMinimumMembers,
  getCommunitiesWithActiveThreadsInTimeframe,
} from './community';
import { getCommunitiesById } from 'shared/db/queries/community';
import type { DBCommunity, DBCoreMetric } from 'shared/types';
import { getRangeFromTimeframe } from './utils';
import type { Timeframe } from 'chronos/types';
const dbUtil = require('shared/dbUtil');

// export const saveCoreMetrics = (data: DBCoreMetric): Promise<DBCoreMetric> => {
//   return db
//     .table('coreMetrics')
//     .insert(
//       {
//         date: new Date(),
//         ...data,
//       },
//       {
//         returnChanges: true,
//       }
//     )
//     .run()
//     .then(result => result.changes[0].new_val);
// };
export const saveCoreMetrics = (data: DBCoreMetric): Promise<DBCoreMetric> => {
  return db.tryCallAsync(
    'saveCoreMetrics',
    () => {
      return dbUtil
        .insert(db, 'coreMetrics', {
          date: new Date(),
          ...data,
        })
        .then(result => {
          return result[0];
        });
    },
    null
  );
};

// export const getActiveUsersInTimeframe = (
//   timeframe: Timeframe
// ): Promise<number> => {
//   const range = getRangeFromTimeframe(timeframe);
//   return db
//     .table('users')
//     .filter(row =>
//       row
//         .hasFields('lastSeen')
//         .and(row('lastSeen').during(db.now().sub(range), db.now()))
//     )
//     .count()
//     .default(0)
//     .run();
// };
export const getActiveUsersInTimeframe = (
  timeframe: Timeframe
): Promise<number> => {
  return dbUtil.tryCallAsync(
    'getActiveUsersInTimeframe',
    { timeframe },
    () => {
      const range = getRangeFromTimeframe(timeframe);
      return db.collection('users').countDocuments({
        lastSeen: {
          $exists: true,
          $gte: new Date(new Date() - range),
          $lte: new Date(),
        },
      });
    },
    0
  );
};

type ACData = {
  count: number,
  communities: Array<DBCommunity>,
};

// prettier-ignore
export const getActiveCommunitiesInTimeframe = async (timeframe: Timeframe): Promise<ACData> => {
  const [
    activeCommunitiesByMemberCount,
    activeCommunitiesByActiveThreads
  ] = await Promise.all([ 
    getCommunitiesWithMinimumMembers(2),
    getCommunitiesWithActiveThreadsInTimeframe(timeframe)
  ])

  const intersectingIds = intersection(activeCommunitiesByActiveThreads, activeCommunitiesByMemberCount)

  return {
    count: intersectingIds.length,
    communities: await getCommunitiesById(intersectingIds),
  };
};

// export const getTableRecordCount = (
//   table: string,
//   filter: mixed
// ): Promise<number> => {
//   if (filter) {
//     return db
//       .table(table)
//       .filter(row => db.not(row.hasFields('deletedAt')))
//       .count()
//       .run();
//   }

//   return db
//     .table(table)
//     .filter(row => db.not(row.hasFields('deletedAt')))
//     .count()
//     .run();
// };
export const getTableRecordCount = (
  table: string,
  filter: mixed
): Promise<number> => {
  return dbUtil.tryCallAsync(
    'getTableRecordCount',
    { table, filter },
    () => {
      if (filter) {
        return db.collection(table).countDocuments({ deletedAt: null });
      }

      return db.collection(table).countDocuments({ deletedAt: null });
    },
    0
  );
};

// export const getLastTwoCoreMetrics = (): Promise<Array<DBCoreMetric>> => {
//   return (
//     db
//       .table('coreMetrics')
//       .orderBy(db.desc('date'))
//       .run()
//       // send back the most recent 2 records
//       .then(results => resuxwlts.slice(0, 2))
//   );
// };
export const getLastTwoCoreMetrics = (): Promise<Array<DBCoreMetric>> => {
  return dbUtil.tryCallAsync(
    'getLastTwoCoreMetrics',
    {},
    () => {
      return db
        .collection('coreMetrics')
        .find({})
        .sort({ date: -1 })
        .toArray()
        .then(results => {
          return results.slice(0, 2);
        });
    },
    []
  );
};
