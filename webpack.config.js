const path = require('path');

module.exports = {
  entry: './omg.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist')
  }
};