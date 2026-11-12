import { build } from 'esbuild';
import { mkdir, copyFile, rm, readFile, writeFile } from 'node:fs/promises';
await rm('assets',{recursive:true,force:true});
await mkdir('assets', {recursive:true});
await build({ entryPoints:['src/app.js'], bundle:true, format:'esm', splitting:true, outdir:'assets', minify:true, target:'safari16.4', legalComments:'linked' });
await copyFile('node_modules/pdfmake/build/pdfmake.min.js','assets/pdfmake.min.js');
await copyFile('node_modules/pdfmake/build/vfs_fonts.js','assets/vfs_fonts.js');
let notices='';
for(const name of ['marked','dompurify','turndown','turndown-plugin-gfm','docx','mammoth','jszip','pdfmake','html-to-pdfmake','node-diff3']) {
  for(const file of ['LICENSE','LICENSE.md','LICENSE.txt','license','LICENSE-MIT']) {
    try {const text=await readFile(`node_modules/${name}/${file}`,'utf8');notices+=`\n\n=== ${name} / ${file} ===\n${text}`;break;}catch{}
  }
}
await writeFile('assets/LICENSES.txt',notices);
