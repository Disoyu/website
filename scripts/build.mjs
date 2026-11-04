import { mkdir, cp, writeFile, readFile, rm, lstat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, publicRoot, loadContent } from './content.mjs';

export async function build() {
  const { notes, site } = await loadContent();
  const output = path.resolve(root, 'dist');
  if (path.dirname(output) !== path.resolve(root) || path.basename(output) !== 'dist') throw new Error('构建目录必须位于项目根目录内');
  const previous = await lstat(output).catch(error => { if (error.code !== 'ENOENT') throw error; });
  if (previous?.isSymbolicLink()) throw new Error('dist 不能是符号链接');
  await rm(output, { recursive: true, force: true });
  await mkdir(path.join(output, 'data'), { recursive: true });
  await cp(path.join(root, 'src'), path.join(output, 'src'), { recursive: true });
  const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  let html = await readFile(path.join(root, 'index.html'), 'utf8');
  html = html.replace(/<title>.*?<\/title>/, `<title>${escape(site.name)} · ${escape(site.author)} 的理论笔记</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escape(site.description)}">`);
  await writeFile(path.join(output, 'index.html'), html);
  await cp(path.join(root, 'reader.html'), path.join(output, 'reader.html'));
  await cp(path.join(publicRoot, 'favicon.svg'), path.join(output, 'favicon.svg'));
  await cp(path.join(publicRoot, 'vendor'), path.join(output, 'vendor'), { recursive: true });
  for (const file of new Set(notes.flatMap(note => [note.file, note.source].filter(Boolean)))) {
    const target = path.join(output, file);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(path.join(publicRoot, file), target);
  }
  await writeFile(path.join(output, 'data/site.json'), JSON.stringify(site, null, 2) + '\n');
  await writeFile(path.join(output, 'data/notes.json'), JSON.stringify(notes, null, 2) + '\n');
  await writeFile(path.join(output, '.nojekyll'), '');
  console.log(`构建完成：dist/，${notes.length} 篇笔记。`);
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { await build(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
