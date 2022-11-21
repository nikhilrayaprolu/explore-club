// exports.up = async (r, conn) => {
//   return r
//     .table('communities')
//     .update({
//       isPrivate: false,
//     })
//     .run(conn);
// };
exports.up = async (r, conn) => {
  return Promise.resolve();
};

exports.down = function(r, conn) {
  return Promise.resolve();
};
