// exports.up = function(r, conn) {
//   return Promise.all([
//     r
//       .table('usersSettings')
//       .update({
//         notifications: {
//           types: {
//             newMention: {
//               email: true,
//             },
//           },
//         },
//       })
//       .run(conn),
//   ]);
// };
exports.up = function(r, conn) {
  return Promise.all([Promise.resolve()]);
};

// exports.down = function(r, conn) {
//   return Promise.resolve();
// };
exports.down = function(r, conn) {
  return Promise.resolve();
};
