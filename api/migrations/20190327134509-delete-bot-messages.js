// exports.up = function(r, conn) {
//   return r
//     .table('messages')
//     .filter({ bot: true })
//     .delete()
//     .run(conn);
// };
exports.up = function(r, conn) {
  return Promise.resolve();
};

// exports.down = function(r, conn) {
//   return Promise.resolve();
// };
exports.down = function(r, conn) {
  return Promise.resolve();
};
