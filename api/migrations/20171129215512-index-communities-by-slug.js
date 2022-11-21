// exports.up = function(r, conn) {
//   return Promise.all([
//     r
//       .table('communities')
//       .indexCreate('slug')
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
