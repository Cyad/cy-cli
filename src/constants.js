// 用户常量

const { version } = require('../package.json');

const downLoadDirectory = `${process.env[process.platform === 'darwin' ? 'HOME' : 'USERPROFILE']}/.template`;
module.exports = {
  version,
  downLoadDirectory,
};
