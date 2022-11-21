// exports.up = function(r, conn) {
//   return r
//     .tableCreate('webPushSubscriptions')
//     .run(conn)
//     .catch(err => {
//       throw new Error(err);
//     })
//     .then(() =>
//       r
//         .table('webPushSubscriptions')
//         .indexCreate('userId')
//         .run(conn)
//     )
//     .then(() =>
//       r
//         .table('webPushSubscriptions')
//         .indexCreate('endpoint')
//         .run(conn)
//     );

const dbUtil = require("./dbUtil");

// };
exports.up = function(r, conn) {
  return dbUtil.createCollections(r, 'webPushSubscriptions').catch(err => {
    throw new Error(err);
  });
};

// exports.down = function(r, conn) {
//   return r
//     .tableDrop('webPushSubscriptions')
//     .run(conn)
//     .catch(err => {
//       throw new Error(err);
//     });
// };
exports.down = function(r, conn) {
  return dbUtil.dropCollections(r, 'webPushSubscriptions').catch(err => {
    throw new Error(err);
  });
};
