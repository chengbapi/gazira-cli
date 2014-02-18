#!/usr/bin/env node

/**
 * 确保系统已经安装node，git，grunt-cli，gazira-cli
 *
 * $: gazira init static
 *     该命令会在当前项目目录下构建gazira项目，将得到下面的目录结构：
 *     |-static <静态资源目录>
 *         |-js <javascript目录>
 *             |-dist <压缩合并后的js文件目录>
 *             |-jquery <jquery目录>
 *             |-seajs <seajs目录>
 *             |-src <源码目录>
 *                 |-app <应用源码目录，一般每个模块单独一个目录，目录下入口为index.js，模版放在该模块目录下的tpl目录>
 *                     |-common.js <项目的通用设置，例如ajax请求通用设定，顶部操作栏逻辑 以及一些通用的函数>
 *                     |-...
 *                 |-lib <gazira目录>
 *                 |-test <单元测试目录>
 *         |-swf <swf文件目录>
 *         |-themes <主题目录>
 *             |-default <默认主题>
 *                 |-scss
 *                 |-css
 *                 |-images
 *             |-bootstrap <bootstrap主题>
 *                 |-scss
 *                 |-css
 *                 |-images
 *             |-reset.css
 *         |-fonts <字体目录>
 *         |-docs <前端文档目录>
 *
 *     1. 该命令会通过git获取最新的gazira代码，放入<gazira目录>，当然，jquery，seajs，swf，themes也会同时获取，并放入对应目录
 *     2. 该命令会生成 package.json，同时将依赖包安装(需要使用-d参数)
 *     3. 该命令会生成 Gruntfile.js，具有常用jshint，transport，concat，uglify，clean功能
 *
 * $: gazira update static
 *     该命令会将gazira库更新到最新的版本，使用-d命令则会同步更新依赖包
 */
var fs = require('fs-extra');
var EventProxy = require('eventproxy');

var path = require('path');
var program = require('commander');
var npm = require('npm');
var spawn = require('child_process').spawn;
var StringDecoder = require('string_decoder').StringDecoder;

var root = path.dirname(__dirname); // gazira-cli 根目录
var currentPath = process.cwd(); // 当前命令行所在目录
var templatePath = path.join(root, 'template'); // 模版目录
var cachePath = path.join(currentPath, '.cache'); // 临时缓存目录

var helper = {
    /**
     * 如果目录不存在则创建
     * @param {String} path 目录路径
     * @param {Function} callback 回调
     */
    createFolderIfNotExists: function (path, callback) {
        fs.exists(path, function (exists) {
            if (!exists) {
                fs.mkdir(path, function (err) {
                    if (err) {
                        return console.log('createFolderIfNotExists', err);
                    }
                    callback && callback();
                });
            } else {
                callback && callback();
            }
        });
    },
    /**
     * git clone
     * @param params
     *        {String} url git地址
     *        {String} git本地路径
     * @param {Function} callback 回调
     */
    git: function (params, callback) {
        var url = params.url;
        var dest = params.dest || '';

        fs.exists(dest, function (exists) {
            var git;
            var flag = true;
            var decoder = new StringDecoder('utf8');
            if (exists) {
                git = spawn('git', ['pull'], {
                    cwd: dest
                });
            } else {
                git = spawn('git', ['clone', url, dest]);
            }

            git.stdout.on('data', function (data) {
                console.log(decoder.write(data));
            });
            git.stderr.on('data', function (data) {
                flag = false;
                console.error('git error', decoder.write(data));
            });
            git.on('close', function (code) {
                if (flag) {
                    callback && callback();
                }
            });
        });
    },
    /**
     * 复制gazira所需文件到指定项目中
     * @param src {String} gazira所在目录
     * @param dest {String} 项目静态文件目录
     * @param {Function} callback 回调
     */
    copyGazira: function (src, dest, callback) {
        var ep = new EventProxy();
        ep.on('copyLib', function () {
            console.log('copy gazira library successfully');
        });
        ep.on('copySwf', function () {
            console.log('copy public/swf successfully');
        });
        ep.on('copyJQ', function () {
            console.log('copy jquery successfully');
        });
        ep.on('copySeajs', function () {
            console.log('copy seajs successfully');
        });
        ep.on('copyDist', function () {
            console.log('copy dist successfully');
        });
        ep.fail(function (err) {
            console.error('copyGazira', err);
        });
        ep.all('copyLib', 'copySwf', 'copyJQ', 'copySeajs', 'copyDist', function () {
            callback && callback();
        });

        fs.copy(path.resolve(src, 'js/lib'), path.resolve(dest, 'js/src/lib'), ep.done('copyLib'));
        fs.copy(path.resolve(src, 'public/swf'), path.resolve(dest, 'swf'), ep.done('copySwf'));
        fs.copy(path.resolve(src, 'public/js/jquery'), path.resolve(dest, 'js/jquery'), ep.done('copyJQ'));
        fs.copy(path.resolve(src, 'public/js/seajs'), path.resolve(dest, 'js/seajs'), ep.done('copySeajs'));
        fs.copy(path.resolve(src, 'public/js/dist/lib'), path.resolve(dest, 'js/dist/lib'), ep.done('copyDist'));
    },
    /**
     * 安装依赖
     * @param packageJson package.json所在路径
     * @param where 以来安装到哪里
     * @param callback 安装后的回调
     */
    installPackage: function (packageJson, where, callback) {
        console.log('\nstart to install dependencies');
        var dependencies = require(packageJson).dependencies;
        var arr = [];
        for (var depName in dependencies) {
            arr.push(depName + '@' + dependencies[depName]);
        }
        npm.load({
            prefix: where
        }, function (err) {
            if (err) {
                return console.error('npm load', err);
            }
            npm.commands.install(arr, function (err) {
                if (err) {
                    return console.error('npm install', err);
                }
                callback && callback();
            });
        });
    },
    /**
     * 初始化gazira：git clone，然后复制所需文件
     * @param staticFolderName 设定的静态目录名
     * @param init 是否是init，false表示update
     * @param installDependencies 是否需要安装依赖
     * @param callback
     */
    getGazira: function (staticFolderName, init, installDependencies, callback) {
        var src = path.join(cachePath, 'gazira');
        var dest = path.join(currentPath, staticFolderName);

        helper.git({
            url: 'git@github.com:caolvchong/gazira.git',
            dest: src
        }, function () {
            if(init) {
                helper.copyGazira(src, dest, function () {
                    if (installDependencies) {
                        helper.installPackage(path.join(currentPath, 'package.json'), cachePath, function () {
                            callback && callback();
                        });
                    } else {
                        callback && callback();
                    }
                });
            } else {
                fs.copy(path.resolve(src, 'js/lib'), path.resolve(dest, 'js/src/lib'), function(err) {
                    if (err) {
                        return console.error(err);
                    }
                    console.log('copy gazira library successfully');
                });
            }
        });
    }
};


program.version('0.0.2');
program
    .command('init [name] ')
    .option('-d, --dependencies', 'auto install gazira dependencies')
    .description('initialize gazira for your project')
    .action(function (name, options) {
        name = name || 'static';
        var destPath = path.join(currentPath, name);
        helper.createFolderIfNotExists(cachePath, function () {
            console.log('build gazira\'s directory structure successfully');
            fs.copy(templatePath, currentPath, function (err) {
                if (err) {
                    return console.log('copy template', err);
                }
                fs.exists(destPath, function (exists) {
                    if (exists) {
                        fs.copy(path.join(currentPath, '_static'), destPath, function (err) {
                            if (err) {
                                return console.error(err);
                            }
                            helper.getGazira(name, true, options.dependencies, function () {
                                fs.remove(path.join(currentPath, '_static'), function() {
                                    console.log('clean temp files successfully');
                                });
                            });
                        })
                    } else {
                        fs.rename(path.join(currentPath, '_static'), destPath, function (err) {
                            if (err) {
                                return console.error('init rename', err);
                            }
                            helper.getGazira(name, true, options.dependencies);
                        });
                    }
                });
            });
        });
    });
program
    .command('update [name]')
    .option('-d, --dependencies', 'auto install gazira dependencies')
    .description('update gazira')
    .action(function (name, options) {
        console.log('start to update gazira')
        name = name || 'static';
        var destPath = path.join(currentPath, name);
        fs.exists(destPath, function(exists) {
            if(!exists) {
                return console.error(destPath, 'does not exist');
            }
            helper.getGazira(name, false, options.dependencies);
        });
    });

program.parse(process.argv);

if (!program.args.length) {
    program.help();
}
