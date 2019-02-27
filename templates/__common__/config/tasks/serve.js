// native
const path = require('path');

// packages
const browserSync = require('browser-sync');
const colors = require('ansi-colors');
const formatMessages = require('webpack-format-messages');
const watch = require('glob-watcher');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');

// internal
const paths = require('../paths');
const styles = require('./styles');
const templates = require('./templates');
const { clearConsole, printInstructions } = require('../utils');
const webpackConfig = require('../webpack.config.dev');

module.exports = () => {
  // create the browser-sync client
  const bs = browserSync.create();

  // prep the webpack bundle
  const bundler = webpack(webpackConfig);

  bs.init(
    {
      logConnections: true,
      logLevel: 'silent',
      logPrefix: 'data-visuals-create',
      https: true,
      middleware: [
        webpackDevMiddleware(bundler, {
          logLevel: 'silent',
          publicPath: webpackConfig.output.publicPath,
          stats: { colors: true },
        }),
      ],
      notify: false,
      open: false,
      port: 3000,
      server: {
        baseDir: ['./.tmp', './app'],
        routes: {
          '/node_modules': 'node_modules',
        },
      },
    },
    err => {
      if (err) return console.error(err);

      console.log(colors.yellow('Starting initial serve...'));

      const urls = bs.getOption('urls');

      const local = urls.get('local');
      const external = urls.get('external');

      // template watching
      watch(
        [
          path.join(paths.appSrc, '**/*.html'),
          path.join(paths.appData, '*.json'),
        ],
        templates
      );

      // styles watching
      watch([path.join(paths.appStyles, '/**/*.scss')], styles);

      // scripts watching
      bundler.hooks.done.tap('done', stats => {
        const messages = formatMessages(stats);

        clearConsole();

        // no errors or warnings, good to go
        if (!messages.errors.length && !messages.warnings.length) {
          console.log(colors.green('JavaScript compiled successfully!'));
          printInstructions({ local, external });

          bs.reload();
        }

        // there are errors
        if (messages.errors.length) {
          console.log(colors.red('Failed to compile.\n'));
          console.log(messages.errors.join('\n\n'));

          return;
        }

        // there are warnings
        if (messages.warnings.length) {
          console.log(colors.yellow('Compiled with warnings.\n'));
          console.log(messages.warnings.join('\n\n'));

          printInstructions({ local, external });

          bs.reload();
        }
      });
    }
  );
};