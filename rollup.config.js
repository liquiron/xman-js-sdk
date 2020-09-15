import { terser } from 'rollup-plugin-terser'
import json from '@rollup/plugin-json'

import pkg from './package.json'

export default [
  {
    input: 'src/main.js',
    external: ['axios'],
    output: [
      {
        name: 'xmanJsSdk',
        file: pkg.browser,
        format: 'umd'
      },
      {
        file: pkg.main,
        format: 'cjs'
      },
      { file: pkg.module, format: 'es' }
    ],
    plugins: [
      terser({
        compress: {},
        mangle: {}
      }),
      json()
    ]
  }
]
