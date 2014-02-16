/*jshint node:true */
'use strict';


function combineCspSources(sources) {
    return sources.reduce(function (combined, source) {
        if (source === 'none' ||
            source === 'self' ||
            source === 'unsafe-inline' ||
            source === 'unsafe-eval')
        {
            source = '\'' + source + '\'';
        }

        return combined + ' ' + source;
    }, '');
}

function generateCsp(csp) {
    var defaultSources = '';

    if (csp['default-src']) {
        defaultSources = combineCspSources(csp['default-src']);
    }

    return Object.keys(csp).reduce(function (combined, directive) {
        combined += directive;

        if (directive !== 'default-src' &&
            directive !== 'report-uri' &&
            csp[directive][0] !== 'none' &&
            csp[directive][0] !== '*')
        {
            combined += defaultSources;
        }

        combined += combineCspSources(csp[directive]);

        combined += '; ';

        return combined;
    }, '');
}


module.exports = function (grunt) {
    var target = !!grunt.option('prod') ? 'prod' : 'dev';

    // Load all grunt tasks
    require('load-grunt-tasks')(grunt);
    grunt.loadTasks('tasks');


    var csp = {
        'default-src': [
            'self'
        ],
        'style-src': ['unsafe-inline'],
        'script-src': [
            'https://www.google-analytics.com',
            'https://codepen.io'
        ],
        'img-src': ['*'],
        'connect-src': ['https://api.github.com'],
        'frame-src': ['https://codepen.io'],
        'report-uri': ['/csp-report']
    };

    // Local CSP additions
    csp['script-src'].push('http://localhost:35729');
    csp['connect-src'].push('ws://localhost:35729');
    csp['frame-src'].push('http://codepen.io');


    grunt.initConfig({
        clean: {
            build: ['build'],
            unneeded: [ // clean up after requirejs
                'build/assets/js/build.txt'
            ]
        },
        concurrent: {
            dev: [
                'copy:dev',
                'handlebars:dev',
                'less:dev'
            ],
            prod: [
                'copy:prod',
                'less:prod',
                'svgmin',
                'requirejs'
            ]
        },
        connect: {
            all: {
                options: {
                    base: 'build',
                    middleware: function (connect, options) {
                        // emulate the server headers/compression
                        return [
                            function (req, res, next) {
                                /*jshint quotmark:false */
                                res.setHeader('X-UA-Compatible', 'IE=Edge');
                                res.setHeader('X-Content-Type-Options', 'nosniff');
                                res.setHeader('X-XSS-Protection', '1; mode=block');
                                res.setHeader('X-Frame-Options', 'SAMEORIGIN');
                                res.setHeader('Content-Security-Policy', generateCsp(csp));
                                next();
                            },
                            connect.compress({
                                filter: function (req, res) {
                                    return (/json|text|javascript|xml/).test(res.getHeader('Content-Type'));
                                }
                            }),
                            connect.static(options.base)
                        ];
                    }
                }
            }
        },
        copy: {
            dev: {
                expand: true,
                filter: 'isFile',
                cwd: 'temp/',
                src: ['**/*'],
                dest: 'build/'
            },
            prod: {
                expand: true,
                filter: 'isFile',
                cwd: 'temp/',
                src: [ // don't copy files that are generated by other tasks
                    '**/*',
                    '!assets/bower_components/**/*', // requirejs
                    '!assets/css/**/*.less', // less
                    '!assets/img/**/*.{png,jpg,jpeg,svg}', // imagemin/svgmin
                    '!assets/js/**/*' // requirejs
                ],
                dest: 'build/'
            }
        },
        cssmin: {
            all: {
                options: {
                    keepSpecialComments: 0
                },
                files: [{
                    expand: true,
                    cwd: 'build/',
                    src: 'assets/css/**/*.css',
                    dest: 'build/'
                }]
            }
        },
        handlebars: {
            options: {
                amd: true,
                namespace: false
            },
            dev: {
                files: [{
                    expand: true,
                    cwd: 'temp/',
                    src: 'assets/js/templates/*.html',
                    dest: 'build/',
                    ext: '.js'
                }]
            },
            prod: {
                files: [{
                    expand: true,
                    cwd: 'temp/',
                    src: 'assets/js/templates/*.html',
                    dest: 'temp/', // output to temp so requirejs can pick it up
                    ext: '.js'
                }]
            }
        },
        imagemin: {
            all: {
                options: {
                    optimizationLevel: 2
                },
                files: [{
                    expand: true,
                    cwd: 'temp/',
                    src: ['assets/img/**/*.{png,jpg,jpeg}'],
                    dest: 'build/'
                }]
            }
        },
        jekyll: {
            all: {
                options: {
                    src: 'app',
                    dest: 'temp',
                    config: '_config.yml',
                    drafts: !!grunt.option('drafts')
                }
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all: [
                '.jshintrc',
                '.bowerrc',
                'bower.json',
                'package.json',
                'Gruntfile.js',
                'app/assets/js/**/*.js',
                '!app/assets/js/vendor/**/*',
                '!app/assets/js/ga.js',
                '!app/assets/js/variables.js'
            ]
        },
        less: {
            dev: {
                options: {
                    sourceMap: true,
                    outputSourceFiles: true
                },
                files: {
                    'build/assets/css/main.css': 'temp/assets/css/main.less'
                }
            },
            prod: {
                files: {
                    'build/assets/css/main.css': 'temp/assets/css/main.less'
                }
            }
        },
        requirejs: {
            all: {
                options: {
                    mainConfigFile: 'temp/assets/js/main.js',
                    baseUrl: 'temp/assets/js',
                    dir: 'build/assets/js',
                    removeCombined: true,
                    useStrict: true,
                    optimize: 'uglify2',
                    generateSourceMaps: true,
                    preserveLicenseComments: false,
                    modules: [
                        {
                            name: 'main'
                        }, {
                            name: 'comments',
                            exclude: ['main']
                        }, {
                            name: 'tetris',
                            exclude: ['main']
                        }
                    ]
                }
            }
        },
        svgmin: {
            all: {
                files: [{
                    expand: true,
                    cwd: 'temp/',
                    src: 'assets/img/**/*.svg',
                    dest: 'build/'
                }]
            }
        },
        watch: {
            options: {
                livereload: true
            },
            dev: {
                files: [
                    'app/**/*',
                    'Gruntfile.js',
                    '_config.yml'
                ],
                tasks: ['dev']
            },
            prod: {
                files: [
                    'app/**/*',
                    'Gruntfile.js',
                    '_config.yml'
                ],
                tasks: ['prod']
            }
        }
    });


    grunt.registerTask('dev', [
        'clean:build',
        'jekyll',
        'concurrent:dev'
    ]);

    grunt.registerTask('prod', [
        'clean:build',
        'jekyll',
        'handlebars:prod', // needs to run before requirejs
        'imagemin',
        'concurrent:prod',
        'cssmin',
        'clean:unneeded'
    ]);

    grunt.registerTask('build', [target]);
    grunt.registerTask('server', [target, 'connect', 'watch:' + target]);
    grunt.registerTask('deploy', ['prod', 'upload']);

    grunt.registerTask('default', ['server']);
};
