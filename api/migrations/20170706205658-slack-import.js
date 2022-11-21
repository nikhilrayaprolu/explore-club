// exports.up = function(r, conn) {
//   return Promise.all([
//     r
//       .tableCreate('slackImports')
//       .run(conn)
//       .catch(err => {
//         console.log(err);
//         throw err;
//       }),
//   ])
//     .then(() =>
//       Promise.all([
//         r
//           .table('slackImports')
//           .indexCreate('communityId', r.row('communityId'))
//           .run(conn)
//           .catch(err => {
//             console.log(err);
//             throw err;
//           }),
//         r
//           .table('users')
//           .indexCreate('email', r.row('email'))
//           .run(conn),
//       ])
//     )
//     .catch(err => {
//       console.log(err);
//       throw err;
//     });

const dbUtil = require("./dbUtil");

// };
exports.up = function(r, conn) {
  return Promise.all([
    dbUtil.createCollections(r, 'slackImports').catch(err => {
      console.log(err);
      throw err;
    }),
  ])
    .then(() => Promise.all([Promise.resolve()]))
    .catch(err => {
      console.log(err);
      throw err;
    });
};

// exports.down = function(r, conn) {
//   return Promise.all([r.tableDrop('slackImports').run(conn)]);
// };
exports.down = function(r, conn) {
  return Promise.all([dbUtil.dropCollections(r, 'slackImports')]);
};
