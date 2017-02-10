// Dependencies
const gulp = require('gulp'),
	pkg = require('./package.json'),
	sass = require('gulp-sass'),
	autoprefixer = require('gulp-autoprefixer'),
	header = require('gulp-header'),
	pixrem = require('gulp-pixrem'),
	uglify = require('gulp-uglify'),
	rename = require('gulp-rename'),
	minifyCss = require('gulp-clean-css'),
	frontMatter = require('gulp-front-matter'),
	data = require('gulp-data'),
	sourcemaps = require('gulp-sourcemaps'),
	del = require('del'),
	browserSync = require('browser-sync'),
	browserify = require('browserify'),
	imagemin = require('gulp-imagemin'),
	notify = require('gulp-notify'),
	plumber = require('gulp-plumber'),
	gulpIf = require('gulp-if'),
	babelify = require('babelify'),
	gulpUtil = require('gulp-util'),
	source = require('vinyl-source-stream'),
	buffer = require('vinyl-buffer'),
	runSequence = require('run-sequence'),
	kss = require('kss'),
	nunjucksRender = require('gulp-nunjucks-render');

// Banner
const banner = [
	'/**',
	' * @name <%= pkg.name %>: <%= pkg.description %>',
	' * @version <%= pkg.version %>: <%= new Date().toUTCString() %>',
	' * @author <%= pkg.author %>',
	' * @license <%= pkg.license %>',
	' */'
].join('\n');

// Error notification
function onError(err) {
	notify.onError({
		title:    'Gulp',
		subtitle: 'Failure!',
		message:  'Error: <%= error.message %>',
		sound:    'Beep'
	})(err);

	this.emit('end');
}

//------------------------
// Configuration
//------------------------

// Autoprefixer settings
const AUTOPREFIXER_BROWSERS = [
	'ie >= 9',
	'ie_mob >= 10',
	'ff >= 20',
	'chrome >= 4',
	'safari >= 7',
	'opera >= 23',
	'ios >= 7',
	'android >= 4.4',
	'bb >= 10'
];

// Build root destination / webroot for serve
const outputDir = './build';

// Asset destination base path
const sharedPath = '/content';
const appPath = '/app';
const patternsPath = '/patterns';

// Paths for source and destinations
const paths = {
	src: {
		app: {
			css: './src/app/scss/',
			js: './src/app/js/',
			html: './src/app/templates/',
			img: './src/app/img/',
			fonts: './src/app/fonts/'
		},
		patterns: {
			css: './src/patterns/scss/',
			js: './src/patterns/js/',
			html: './src/patterns/templates/',
			img: './src/patterns/img/',
			fonts: './src/patterns/fonts/',
			kss: './src/patterns/kss/'
		}
	},
	dest: {
		shared: {
			css: `${outputDir}${sharedPath}/css/`,
			js:  `${outputDir}${sharedPath}/js/`,
			img: `${outputDir}${sharedPath}/img/`,
			fonts: `${outputDir}${sharedPath}/fonts/`
		},
		app: {
			html: `${outputDir}${appPath}`,
			css: `${outputDir}${sharedPath}/css/`,
			js: `${outputDir}${sharedPath}/js/`,
			img: `${outputDir}${sharedPath}/img/`
		},
		patterns: {
			css: `${outputDir}${patternsPath}/assets/css/`,
			js: `${outputDir}${patternsPath}/assets/js/`,
			img: `${outputDir}${patternsPath}/assets/img/`,
			html: `${outputDir}${patternsPath}`,
			fonts: `${outputDir}${patternsPath}/fonts/`,
			kss: `${outputDir}${patternsPath}/styleguide/`
		}
	}
};

//------------------------
// Tasks
//------------------------

function clean() {
	return del(`${paths.dest}`);
}

function jsCore(type){
	return browserify({
		entries: `${paths.src[type].js}app.js`,
		debug: !gulpUtil.env.production
	})
	.transform(babelify, {presets: ['es2015']})
	.bundle()
	.pipe(source('app.js'))
	.pipe(buffer())
	.pipe(gulpIf(!!gulpUtil.env.production, uglify()))
	.pipe(gulp.dest(paths.dest[type].js));
}

function jsAsync(type){
	return gulp.src(`${paths.src[type].js}async/**/*`)
		.pipe(uglify())
		.pipe(rename({suffix: '.min'}))
		.pipe(gulp.dest(`${paths.dest[type].js}async/`));
}

function jsPolyfills(type){
	return browserify({
		entries: `${paths.src[type].js}polyfills/index.js`,
		debug: !gulpUtil.env.production
	})
	.bundle()
	.pipe(source('index.js'))
	.pipe(buffer())
	.pipe(uglify())
	.pipe(rename({
		basename: 'polyfills',
		suffix: '.min'
	}))
	.pipe(gulp.dest(`${paths.dest[type].js}async/`));
}

function html(type){
	return gulp.src(`${paths.src[type].html}views/**/*.html`)
		.pipe(plumber({errorHandler: onError}))
		.pipe(frontMatter({ property: 'data' }))
		.pipe(data(() => {
			return {'assetPath': sharedPath};
		}))
		.pipe(nunjucksRender({
			path: paths.src[type].html
		}))
		.pipe(gulp.dest(paths.dest[type].html));
}

function scss(type){
	return gulp.src([`${paths.src[type].css}**/*.scss`, `!${paths.src[type].css}{fonts,kss}/*.*`])
		.pipe(plumber({errorHandler: onError}))
		.pipe(sourcemaps.init())
		.pipe(sass())
		.pipe(autoprefixer(AUTOPREFIXER_BROWSERS))
		.pipe(pixrem())
		.pipe(header(banner, {pkg : pkg}))
		.pipe(sourcemaps.write())
		.pipe(gulpIf(!!gulpUtil.env.production, minifyCss()))
		.pipe(gulp.dest(paths.dest[type].css));
}

function img(type){
	return gulp.src(`${paths.src[type].img}**/*`)
		.pipe(imagemin({
			progressive: true,
			interlaced: true,
			svgoPlugins: [{removeViewBox: true}]
		}))
		.pipe(gulp.dest(paths.dest[type].img));
}

// function fonts(type){
// 	return gulp.src(`${paths.src[type].fonts}**/*.*`)
// 		.pipe(gulp.dest(paths.dest.fonts));
// }

function serve(){
	browserSync({
		notify: false,
		// https: true,
		server: [outputDir],
		tunnel: false
	});
	watch(browserSync.reload);
}

function watch(cb){
	const watchers = [
		{ glob: `${paths.src.app.html}**/*.html`, tasks: ['appHTML'] },
		{ glob: `${paths.src.app.css}**/*.scss`, tasks: ['kssBuild'] },
		{ glob: `${paths.src.app.img}**/*`, tasks: ['appImg'] },
		{ glob: `${paths.src.app.js}**/*`, tasks: ['appJS'] },
		{ glob: `${paths.src.patterns.html}**/*.html`, tasks: ['patternsHTML'] },
		{ glob: `${paths.src.patterns.css}**/*.scss`, tasks: ['patternsSCSS'] },
		{ glob: `${paths.src.patterns.img}**/*`, tasks: ['patternsImg'] },
		{ glob: `${paths.src.patterns.js}**/*`, tasks: ['patternsJS'] }
	];
	watchers.forEach(watcher => {
		cb && watcher.tasks.push(cb);
		gulp.watch(watcher.glob, watcher.tasks);
	});
}

function runKSS(){
	return kss({
		source: paths.src.app.css,
		destination: paths.dest.patterns.kss,
		builder: paths.src.patterns.kss,
		title: pkg.name
	});
}

//------------------------
// Gulp API
//------------------------

//index
gulp.task('index', function(){
	return gulp.src('./src/index/**/*')
		.pipe(gulp.dest(outputDir));
});

//app
gulp.task('appSCSS', scss.bind(null, 'app'));

gulp.task('appJSCore', jsCore.bind(null, 'app'));
gulp.task('appJSAsync', jsAsync.bind(null, 'app'));
gulp.task('appJSPolyfills', jsPolyfills.bind(null, 'app'));
gulp.task('appJS', ['appJSCore', 'appJSAsync', 'appJSPolyfills']);

gulp.task('appHTML', html.bind(null, 'app'));
gulp.task('appImg', img.bind(null, 'app'));

//patterns
gulp.task('patternsJSCore', jsCore.bind(null, 'patterns'));
gulp.task('patternsJSAsync', jsAsync.bind(null, 'patterns'));
gulp.task('patternsJS', ['patternsJSCore', 'patternsJSAsync']);

gulp.task('patternsSCSS', scss.bind(null, 'patterns'));

gulp.task('patternsHTML', html.bind(null, 'patterns'));
gulp.task('patternsImg', img.bind(null, 'patterns'));

gulp.task('kss', runKSS);

gulp.task('kssBuild', function(){
	runSequence('appSCSS', ['kss']);
});

//top level tasks
gulp.task('clean', clean);

gulp.task('server', serve);

gulp.task('serve', function(){
	runSequence('clean', ['appSCSS'], ['index', 'patternsImg', 'appImg', 'patternsHTML', 'appHTML', 'appJS', 'patternsJS', 'kss', 'patternsSCSS'], serve);
});

gulp.task('compile', function(){
	runSequence('clean', ['appSCSS'], ['patternsImg', 'appImg', 'patternsHTML', 'appHTML', 'appJS', 'patternsJS', 'kss', 'patternsSCSS']);
});

gulp.task('app', function(){
	runSequence('clean', ['appSCSS', 'appImg', 'appHTML', 'appJS'], serve);
});

gulp.task('patterns', function(){
	runSequence('clean', ['appSCSS'], ['patternsImg', 'patternsHTML', 'patternsJS', 'kss', 'patternsSCSS'], serve);
});

gulp.task('default', ['serve']);