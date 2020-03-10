const program = require('commander'); // 接续用户参数
const path = require('path');
const { version } = require('./constants');

const mapActions = {
  create: {
    alias: 'c',
    description: 'create a project',
    examples: [
      'cy-cli create <projectName>',
    ],
  },
  config: {
    alias: 'conf',
    description: 'config project variable',
    examples: [
      'cy-cli config set <key> <value>',
      'cy-cli config get <key>',
    ],
  },
  '*': { // 输入未有指令
    alias: '',
    description: 'command not found!!!',
    examples: [],
  },
};

// 遍历action
Reflect.ownKeys(mapActions).forEach((action) => {
  program
    .command(action) // 配置命令名字
    .alias(mapActions[action].alias) // 别名
    .description(mapActions[action].description) // 命令描述
    .action(() => {
      if (action === '*') { // 访问不到对应命令
        console.log(mapActions[action].description);
      } else {
        require(path.resolve(__dirname, action))(...process.argv.splice(3)); // 根据所输入命令引入相应逻辑
      }
    });
});

program.on('--help', () => {
  Reflect.ownKeys(mapActions).forEach((action) => {
    mapActions[action].examples.forEach((example) => {
      console.log(`  ${example}`);
    });
  });
});

// 接续用户传递参数  版本号
program.version(version).parse(process.argv);
