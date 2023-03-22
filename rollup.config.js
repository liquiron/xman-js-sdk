import terser from '@rollup/plugin-terser'
import json from '@rollup/plugin-json'
import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import pkg from './package.json' assert { type: 'json' }

export default [
  {
    input: 'src/index.ts',
    external: ['axios', 'https'],
    output: [
      {
        file: pkg.main,
        format: 'es'
      },
      {
        file: pkg.module,
        format: 'cjs'
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
    external: ['axios', 'https'],
    plugins: [dts(), json()],
    output: [{
      file: pkg.typings,
      format: 'es'
    }]
  }
]
