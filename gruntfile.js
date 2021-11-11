module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		archive_name: 'shazify-<%= pkg.version %>',
		jshint: {
			options: {
        globals: { angular: true },
        ignores: 'src/background/lib/*'
      },
			all: ['gruntfile.js', 'src/popup/js/**/*.js', 'src/background/**/*.js'],
			gruntfile: ['gruntfile.js']
		},
		concat: {
			options: {
				separator: '\n\n',
			},
			css: {
				files: {
					'popup/popup.css': ['src/popup/css/*.css'],
					'contentscripts/shazam.css': ['src/contentscripts/shazam.css']
				}
			},
			js: {
				files: {
          'contentscripts/shazamLocalStorage.js': [
            'src/contentscripts/shazamLocalStorage.js'
          ],
					'popup/popup.js': [
						'src/popup/js/app.js',
						'src/popup/js/**/*.js'
					],
					'background/background.js': [
						'src/background/lib/*.js',
						'src/background/background.js',
						'src/background/Helper.js',
						'src/background/ChromeHelper.js',
						'src/background/CanvasIcon.js',
            'src/background/DbService.js',
						'src/background/LoggerService.js',
						'src/background/StorageHelper.js',
						'src/background/SpotifyService.js',
						'src/background/ShazamService.js',
						'src/background/TagsService.js',
						'src/background/UpdateService.js',
					]
				}
			}
		},
		watch: {
			gruntfile: {
				files: 'gruntfile.js',
				tasks: ['jshint:gruntfile'],
				options: {
					spawn: false,
				}
			},
			css: {
				files: ['src/popup/css/*.css', 'src/contentscripts/*.css'],
				tasks: ['build:css'],
				options: {
					spawn: false,
				}
			},
			js: {
				files: ['src/contentscripts/*.js', 'src/popup/js/**/*.js', 'src/background/**/*.js'],
				tasks: ['build:js'],
				options: {
					spawn: false,
				}
			}
		},

		clean: {
            pre: ['dist/', 'build/'],
            post: ['<%= archive_name %>.zip', 'build/']
        },

        compress: {
            main: {
                options: {
                    archive: '<%= archive_name %>.zip'
                },
                expand: true,
                cwd: 'build/',
                src: ['**/*'],
                dest: ''
            }
        },

        copy: {
			contentScriptsImg: {
                files: [
                    {expand: true, flatten: true, src: ['src/contentscripts/img/**'], dest: 'contentscripts/img/'},
				]
			},
            main: {
                files: [
                    {expand: true, src: ['_locales/**'], dest: 'build/'},
                    {expand: true, src: ['icons/**'], dest: 'build/'},
                    {expand: true, src: ['background/**'], dest: 'build/'},
                    {expand: true, src: ['contentscripts/**'], dest: 'build/'},
                    {expand: true, src: ['popup/**'], dest: 'build/'},
                    {expand: true, src: ['static/**'], dest: 'build/'},
                    {expand: true, src: ['LICENCE'], dest: 'build/'},
                    {expand: true, src: ['manifest.json'], dest: 'build/'},
                    {expand: true, src: ['README.md'], dest: 'build/'}
                ]
            },
            archive: {
                files: [
                    {expand: true, src: ['<%= archive_name %>.zip'], dest: 'dist/'}
                ]
            }
        },
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');

	grunt.registerTask('build', ['concat:css', 'jshint', 'concat:js', 'copy:contentScriptsImg']);
	grunt.registerTask('build:css', ['concat:css']);
	grunt.registerTask('build:js', ['jshint', 'concat:js']);

	grunt.registerTask('bundle', ['clean:pre', 'build', 'copy:main', 'compress', 'copy:archive', 'clean:post']);

};