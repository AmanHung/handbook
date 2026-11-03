import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const outputPath = resolve(process.argv[2] || resolve(projectRoot, 'dist/intern-passport-preview.html'));
const result = await build({
  absWorkingDir: projectRoot,
  stdin: {
    contents: `import React from 'react'; import { createRoot } from 'react-dom/client'; import Preview from './src/components/InternPassportPreview.jsx'; createRoot(document.getElementById('root')).render(React.createElement(Preview));`,
    resolveDir: projectRoot, sourcefile: 'intern-preview-entry.jsx', loader: 'jsx',
  },
  bundle: true, write: false, outfile: 'intern-passport-preview.js', format: 'iife',
  jsx: 'automatic', minify: true, target: 'es2020', define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env.DEV': 'true', 'import.meta.env.BASE_URL': '"/handbook/"' },
});
const js = result.outputFiles.find(file => file.path.endsWith('.js')).text.replaceAll('</script', '<\\/script');
const css = result.outputFiles.find(file => file.path.endsWith('.css')).text;
const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>豐原醫院實習生學習護照 設計預覽</title><style>html,body{margin:0;padding:0;background:#f4f7fa}body{line-height:1.5}button,input,textarea,select{font-family:inherit}@keyframes spin{to{transform:rotate(360deg)}}.animate-spin{animation:spin 1s linear infinite}${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`;
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, html, 'utf8');
process.stdout.write(`Standalone preview: ${outputPath}\n`);
