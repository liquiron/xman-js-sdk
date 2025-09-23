import terser from '@rollup/plugin-terser'
import json from '@rollup/plugin-json'
import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import pkg from './package.json' with { type: 'json' }

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.exports["."].require,
        format: 'cjs'
      },
      {
        file: pkg.exports["."].import,
        format: 'es'
      },
      {
        file: pkg.exports["."].browser,
        format: 'umd',
        name: 'XManIO'
      }
    ],
    plugins: [
      typescript(),
      terser({
        compress: {},
      }),
      json()
    ]
  },
  {
    input: 'src/index.ts',
    plugins: [dts(), json()],
    output: [{
      file: pkg.exports["."].types,
      format: 'es'
    }]
  }
]
