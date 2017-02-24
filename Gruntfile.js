module.exports = function (grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		sass: { // Task
			dist: { // Target
				options: { // Target options
					style: 'expanded'
				},
				files: [{ // Dictionary of files
					'src': 'public/css/style.scss', // 'destination': 'source'
					'dest': 'public/css/style.css'
				}]
			}
		},
		eslint: { // Task
			options: { // Target options
				configFile: '.eslintrc.json'
			},
			target: ['core/load-plugins/loader.js']
		},
		postcss: {
			options: {
				map: true,
				processors: [
					require('autoprefixer')({
						browsers: ['last 2 versions']
					}),
					require('cssnano')
				]
			},
			dist: {
				files: { // Dictionary of files
					'src': 'public/css/style.css', // 'destination': 'source'
					'dest': 'public/css/style.min.css'
				}
			}
		},
		watch: {
			sass: {
				files: [
					'*/node_modules/*/default_theme/public/css/*/*.scss',
					'*/node_modules/*/default_theme/public/css/style.scss',
					'*/node_modules/*/public/css/*/*.scss',
					'*/node_modules/*/public/css/style.scss'
			  ],
				tasks: ['sass', 'postcss'],
				options: {
					spawn: false
				}
			},
			scripts: {
				files: ['*/node_modules/*/*.js',
						'core/*/*.js',
						'server.js'],
				tasks: ['eslint'],
				options: {
					spawn: false,
				}
			}
		},
		mochaTest: {
			test: {
				options: {
					reporter: 'spec',
					captureFile: 'results.txt', // Optionally capture the reporter output to a file
					quiet: false, // Optionally suppress output to standard out (defaults to false)
					clearRequireCache: true // Optionally clear the require cache before running tests (defaults to false)
						//because of watch as mocha test files require which gets cached and we don't want caching
				},
				src: ['test/**/*.js']
			}
		},
		/*    watch: { use for testing
		js: {
		options: {
		spawn: false,
		},
		files: ['test/**\/getPolls.js','app/\*.js'],
		tasks: ['mochaTest']
		},
		css: {
		files: ['**\/*.scss'],
		tasks: ['sass']
		}
		}
		*/
	});

	// Load the plugin that provides the "uglify" task.
	//grunt.loadNpmTasks('grunt-contrib-uglify');
	//grunt.loadNpmTasks('grunt-contrib-jshint');
	//grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-contrib-sass');
	grunt.loadNpmTasks('grunt-cssnano');
	grunt.loadNpmTasks('grunt-postcss');
	grunt.loadNpmTasks('grunt-eslint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	// Default task(s).
	grunt.registerTask('default', ['watch']);
	grunt.event.on('watch', function (action, file) {
		if (/\.scss/.test(file)) {
			console.log(file.match(/.*\/public\/css\//)[0] + "style.scss");
			grunt.config(['sass', 'dist', 'files'], [
				{
					src: file.match(/.*\/public\/css\//)[0] + "style.scss",
					dest: file.match(/.*\/public\/css\//)[0] + "style.css"
				}
			]);
			grunt.config(['postcss', 'dist', 'files'], [
				{
					dest: file.match(/.*\/public\/css\//)[0] + "style.min.css",
					src: file.match(/.*\/public\/css\//)[0] + "style.css"
				}
			]);
			grunt.config(['jshint', 'files'], [
				{
					dest: '',
					src: ''
				}
			]);
			grunt.config(['eslint', 'target'], []);
		}
		if (/\.js/.test(file)) {
			console.log(typeof file)
			grunt.config(['sass', 'dist', 'files'], [
				{
					src: '',
					dest: ''
				}
			]);
			grunt.config(['postcss', 'dist', 'files'], [
				{
					dest: '',
					src: ''
				}
			]);
			grunt.config(['jshint', 'files'], {
				src: file
			});
			grunt.config(['eslint', 'target'], [file]);
		}
	});
}
