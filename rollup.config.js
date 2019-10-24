import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import autoExternal from 'rollup-plugin-auto-external';
import globals from 'rollup-plugin-node-globals';
import builtins from 'rollup-plugin-node-builtins';
import hypothetical from 'rollup-plugin-hypothetical';


import pkg from './package.json';

export default [
	// browser-friendly UMD build
	{
		input: 'client/bws.js',
		output: {
			name: 'App',
			file: pkg.browser,
			format: 'umd',
			sourceMap: 'inline',
			globals : {
				ws: 'WebSockets',
				crypto: 'crypto',
			}
		},
		external:['ws','crypto'],
		plugins: [
			hypothetical({
				allowRealFiles: true,
				files: {
				'./src/peer/listen.js': `
					export default {}
				`,
				'./src/peer/disk.js': `
					export default {}
				`
				},
				allowFallthrough:true
			}),
			commonjs(),
			builtins({crypto:false}),
			resolve({preferBuiltins: true}), 
			globals(),
		],
		
	},
	
	// CommonJS (for Node) and ES module (for bundlers) build.
	{
        input: 'server/bws.js',
		plugins:[autoExternal()
			],
		external:['crypto'],
		output: [
			{ 
				file: pkg.main, 
				format: 'cjs'
			},
			{ 
				file: pkg.module, 
				format: 'es'
		 	}
		]
	}
];