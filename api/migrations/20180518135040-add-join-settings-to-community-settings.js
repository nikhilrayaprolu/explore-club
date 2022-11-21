// exports.up = async (r, conn) => {
//   return r
//     .table('communitySettings')
//     .update({
//       joinSettings: {
//         tokenJoinEnabled: false,
//         token: null,
//       },
//     })
//     .run(conn);
// };
exports.up = async (r, conn) => {
  return Promise.resolve();
};

// exports.down = function(r, conn) {
//   return Promise.resolve();
// };
exports.down = function(r, conn) {
  return Promise.resolve();
};
