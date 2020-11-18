import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

export default [{
  input: 'dist/index.js',
  output: {
    name: "omg-js",
    file: pkg.browser,
    format: 'iife',
    sourcemap: true,
  },
  plugins: [
    resolve({ preferBuiltins: true }),
    json(),
    commonjs(),
    terser()
  ]
}];
