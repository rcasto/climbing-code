var webpack = require('webpack');

var config = {
  context: __dirname + '/src', // `__dirname` is root of project and `src` is source
  entry: {
    rtc: './public/scripts/RTC/app.js',
  },
  output: {
    path: __dirname + '/dist/public/scripts', // `dist` is the destination
    filename: '[name].bundle.js',
  },
};

module.exports = config;