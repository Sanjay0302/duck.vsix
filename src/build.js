// Bundles extension.js into dist/extension.js via esbuild.
// isolated-vm is kept external because it's a native addon (.node binaries)
// that can't be inlined — it ships as a real node_modules folder instead.
const esbuild = require('esbuild');

esbuild.build({
    entryPoints: ['extension.js'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    outfile: 'dist/extension.js',
    external: ['vscode', 'isolated-vm'],
    minify: true,
    sourcemap: false,
}).then(() => {
    console.log('Bundled extension.js -> dist/extension.js');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
