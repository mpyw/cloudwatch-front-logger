import nodeResolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';

const isProd = process.env.NODE_ENV === 'production';

const config = {
  input: 'src/index.ts',
  output: {
    format: 'umd',
    name: 'CloudwatchFrontLogger',
    sourcemap: true,
    compact: isProd,
    indent: !isProd,
    exports: 'named',
    file: `dist/cloudwatch-front-logger.${isProd ? 'min.js' : 'js'}`,
  },
  plugins: [
    nodeResolve({
      extensions: ['.ts'],
    }),
    typescript({
      tsconfig: 'tsconfig.umd.json',
    }),
    isProd && terser(),
  ],
  external: ['@aws-sdk/client-cloudwatch-logs']
};

export default config;
