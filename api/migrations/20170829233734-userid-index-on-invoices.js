// exports.up = function(r, conn) {
//   return Promise.all([
//     r
//       .table('invoices')
//       .indexCreate('userId')
//       .run(conn),
//   ]).catch(err => {
//     console.log(err);
//     throw err;
//   });
// };
exports.up = function(r, conn) {
  return Promise.all([Promise.resolve()]).catch(err => {
    console.log(err);
    throw err;
  });
};

// exports.down = function(r, conn) {
//   return Promise.resolve();
// };
exports.down = function(r, conn) {
  return Promise.resolve();
};
