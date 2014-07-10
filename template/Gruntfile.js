module.exports = function (grunt) {

    var staticFolderName = '.';

    grunt.initConfig({
        // 代码检查
        jshint: {
            app: [staticFolderName + '/js/src/app/*.js', staticFolderName + '/js/src/app/**/*.js', '!' + staticFolderName + '/js/src/app/**/tpl/*.js'],
            options: {
                jshintrc: true
            }
        },
        // 转化
        transport: {
            options: {
                debug: false,
                idleading: 'dist/',
                alias: {
                    $: '$'
                }
            },
            app: {
                files: [
                    {
                        cwd: staticFolderName + '/js/src',
                        expand: true,
                        src: ['**/*.js', '!lib/cmp/editor/**/*.js'],
                        dest: '.build'
                    }
                ]
            }
        },
        // 合并
        concat: {
            app: {
                options: {
                    relative: true
                },
                files: [
                    {
                        expand: true,
                        cwd: '.build/app',
                        src: '**/index.js',
                        dest: staticFolderName + '/js/dist/app'
                    }
                ]
            },
            editor: {
                options: {
                    relative: true
                },
                files: [
                    {
                        src: '.build/lib/cmp/editor/ueditor/ueditor.js',
                        dest: staticFolderName + '/js/dist/lib/cmp/editor/ueditor/ueditor.js'
                    }
                ]
            }
        },
        // 压缩
        uglify: {
            app: {
                files: [
                    {
                        expand: true,
                        cwd: staticFolderName + '/js/dist/',
                        src: ['**/*.js', '!lib/**/*.js'],
                        dest: staticFolderName + '/js/dist/',
                        ext: '.js'
                    }
                ]
            }
        },
        // sass
        sass: {
            app: {
                options: {
                },
                files: [{
                    expand: true,
                    cwd: staticFolderName + '/themes/default/scss/',
                    src: ['**/*.scss'],
                    dest: staticFolderName + '/themes/default/css/',
                    ext: '.css'
                }]
            }
        },
        // CSS压缩
        cssmin: {
            app: {
                expand: true,
                cwd: staticFolderName + '/themes/default/css/',
                src: ['**/*.css'],
                dest: staticFolderName + '/themes/default/css/',
                ext: '.css'
            }
        },
        // 清理
        clean: {
            build: ['.build']
        },
        // 监听
        watch: {
            app: {

            }
        }
    });

    grunt.loadNpmTasks('grunt-cmd-transport');
    grunt.loadNpmTasks('grunt-cmd-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-cssmin');

    grunt.registerTask('app', ['jshint:app', 'sass:app', 'cssmin:app', 'transport:app', 'concat:app', 'uglify:app', 'clean']);

};
