module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		jshint: {
			globals: { angular: true },
			all: ['gruntfile.js', 'src/popup/js/**/*.js'],
			gruntfile: ['gruntfile.js']
		},
		concat: {
			options: {
				separator: ';',
			},
			css: {
				files: {
					'popup/popup.css': ['src/popup/css/*.css']
				}
			},
			js: {
				files: {
					'popup/popup.js': [
						'src/popup/js/app.js',
						'src/popup/js/**/*.js'
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
				files: ['src/popup/css/*.css'],
				tasks: ['build:css'],
				options: {
					spawn: false,
				}
			},
			js: {
				files: ['src/popup/js/**/*.js'],
				tasks: ['build:js'],
				options: {
					spawn: false,
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask('build', ['concat:css', 'jshint', 'concat:js']);
	grunt.registerTask('build:css', ['concat:css']);
	grunt.registerTask('build:js', ['jshint', 'concat:js']);

};