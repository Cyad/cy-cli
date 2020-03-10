// create 创建项目
// 拉去所有项目列表 根据选项安装项目
// 选择项目并显示版本号
// 根据用户配置结合渲染项目
// https://api.github.com/orgs/cy-cli-template/repos 获取用户下的仓库
// https://api.github.com/repos/cy-cli-template/vue-template/tags 获取用户下的仓库

const axios = require('axios');
const ora = require('ora');
const Inquirer = require('inquirer'); // 选择list
let downloadGitRepo = require('download-git-repo'); // 下载仓库地址
const { promisify } = require('util');
let ncp = require('ncp'); // 拷贝
const path = require('path');
const fs = require('fs');
const Metalsmith = require('metalsmith'); // 遍历文件需不需要渲染
// 统一所有模版引擎
let { render } = require('consolidate').ejs;
const { downLoadDirectory } = require('./constants'); // 本地地址

// promisify 将异步api转换成promise
downloadGitRepo = promisify(downloadGitRepo);
ncp = promisify(ncp);
render = promisify(render);
// 获取repos
const fetchRepoList = async () => {
  const { data } = await axios.get('https://api.github.com/orgs/cy-cli-template/repos');
  return data;
};
// 通过repo获取tags
const fetchTagList = async (repo) => {
  const { data } = await axios.get(`https://api.github.com/repos/cy-cli-template/${repo}/tags`);
  return data;
};
// 封装loading
const waitFnLoading = (fn, message) => async (...args) => {
  const spinner = ora(message);
  spinner.start();
  const result = await fn(...args);
  spinner.succeed();
  return result;
};

// 封装下载
const download = async (repo, tag) => {
  let api = `cy-cli-template/${repo}`; // github版
  if (tag) {
    api += `#${tag}`;
  }
  const dest = `${downLoadDirectory}/${repo}`;
  await downloadGitRepo(api, dest); // 输出路径
  return dest; // 下载的最终目录
};

module.exports = async (projectName) => {
  // 获取所选模版
  let repos = await waitFnLoading(fetchRepoList, 'fetcing template .......')();
  repos = repos.map((item) => item.name);
  const { repo } = await Inquirer.prompt({
    name: 'repo', // 获取选择后的结果
    type: 'list',
    message: '请选择模版去创建项目',
    choices: repos,
  });
  // 获取所选版本
  let tags = await waitFnLoading(fetchTagList, 'fecting tags .......')(repo);
  tags = tags.map((item) => item.name);
  const { tag } = await Inquirer.prompt({
    name: 'tag', // 获取选择后的结果
    type: 'list',
    message: '请选择版本',
    choices: tags,
  });
  // 获取下载目录
  const result = await waitFnLoading(download, 'downloading .......')(repo, tag);

  // 下载目录 直接拷贝当前目录  ncp
  // 把下载的模版文件 拷贝到当前执行目录下
  // 复杂的需要模版渲染 渲染后拷贝
  // ask ejs模版
  // 把git上项目下载下来，如果有ask文件是复杂模版，需要用户选择后编译模版
  // metalsmith 遍历目录文件 只要是编译都需要
  if (!fs.existsSync(path.join(result, 'ask.js'))) {
    await ncp(result, path.resolve(projectName));
  } else {
    // 1.用户填写信息
    // 2.通过信息渲染模版
    await new Promise((resolve, reject) => {
      Metalsmith(__dirname) // 如果传入路径 默认遍历当前路径下的src文件夹
        .source(result) // 遍历路径下载内容
        .destination(path.resolve(projectName)) // copy到目录下
        .use(async (files, metal, done) => { // params files 文件，metal 信息, done 完成后调用
          const args = require(path.join(result, 'ask.js'));
          const obj = await Inquirer.prompt(args);
          const meta = metal.metadata(); // 传递信息
          Object.assign(meta, obj);
          delete files['ask.js'];
          done();
        })
        .use((files, metal, done) => {
          const obj = metal.metadata();
          // 根据用户输入 下载模版
          Reflect.ownKeys(files).forEach(async (file) => {
            if (file.includes('js') || file.includes('json')) {
              let content = files[file].contents.toString(); // 文件内容
              if (content.includes('<%')) {
                content = await render(content, obj);
                files[file].contents = Buffer.from(content); // 渲染
              }
            }
          });
          done();
        })
        .build((err) => {
          if (err) {
            reject();
          } else {
            resolve();
          }
        });
    });
  }
};
