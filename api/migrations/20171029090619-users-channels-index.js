// exports.up = function(r, conn) {
//   return r
//     .table('usersChannels')
//     .indexCreate('userIdAndChannelId', [r.row('userId'), r.row('channelId')])
//     .run(conn);
// };
exports.up = function(r, conn) {
  return Promise.resolve();
};

exports.down = function(r, conn) {
  return Promise.resolve();
};
