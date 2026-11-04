import { readFile, stat, realpath, open } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const publicRoot = path.join(root, 'public');

async function contentFile(value, extension, label) {
  if (typeof value !== 'string' || !value.startsWith(extension === '.pdf' ? 'pdfs/' : 'tex/') || value.includes('\\') || value.split('/').some(part => !part || part === '..' || part === '.') || path.extname(value).toLowerCase() !== extension) throw new Error(`${label}: 请使用 public 内的相对 ${extension} 路径`);
  const absolute = path.resolve(publicRoot, value);
  const canonical = await realpath(absolute);
  const parent = await realpath(publicRoot);
  if (!canonical.startsWith(parent + path.sep)) throw new Error(`${label}: 文件不能位于 public 外部`);
  const info = await stat(canonical);
  if (!info.isFile() || info.size === 0) throw new Error(`${label}: 文件为空或不是普通文件`);
  if (info.size >= 100 * 1024 * 1024) throw new Error(`${label}: 单个文件必须小于 100 MiB，请先压缩 PDF`);
  if (extension === '.pdf') {
    const handle = await open(canonical, 'r');
    try {
      const header = Buffer.alloc(5);
      await handle.read(header, 0, 5, 0);
      if (header.toString() !== '%PDF-') throw new Error(`${label}: 文件不是有效的 PDF`);
    } finally { await handle.close(); }
  }
  return info.size;
}

export async function loadContent() {
  const site = JSON.parse(await readFile(path.join(root, 'data/site.json'), 'utf8'));
  for (const key of ['name', 'englishName', 'author', 'description', 'about', 'repository']) if (typeof site[key] !== 'string' || !site[key].trim()) throw new Error(`site.json: 缺少 ${key}`);
  const repo = new URL(site.repository);
  if (repo.protocol !== 'https:' || repo.hostname !== 'github.com' || !/^\/[^/]+\/[^/]+\/?$/.test(repo.pathname) || repo.search || repo.hash || repo.username || repo.password) throw new Error('repository 必须是 https://github.com/用户名/仓库名');
  const input = JSON.parse(await readFile(path.join(root, 'data/notes.json'), 'utf8'));
  if (!Array.isArray(input)) throw new Error('notes.json 必须是数组');
  const ids = new Set();
  const notes = [];
  for (const note of input) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(note.id)) throw new Error(`笔记 id 请使用小写英文、数字和连字符: ${note.id}`);
    if (ids.has(note.id)) throw new Error(`重复的笔记 id: ${note.id}`);
    ids.add(note.id);
    for (const key of ['title', 'description', 'category']) if (typeof note[key] !== 'string' || !note[key].trim()) throw new Error(`${note.id}: 缺少 ${key}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(note.date) || Number.isNaN(Date.parse(note.date)) || new Date(note.date).toISOString().slice(0, 10) !== note.date) throw new Error(`${note.id}: 日期必须为有效的 YYYY-MM-DD`);
    if (!Array.isArray(note.tags) || note.tags.some(tag => typeof tag !== 'string' || !tag.trim())) throw new Error(`${note.id}: tags 必须是字符串数组`);
    for (const key of ['demo', 'featured']) if (note[key] !== undefined && typeof note[key] !== 'boolean') throw new Error(`${note.id}: ${key} 必须是布尔值`);
    if (note.formula !== undefined && typeof note.formula !== 'string') throw new Error(`${note.id}: formula 必须是字符串`);
    const size = await contentFile(note.file, '.pdf', note.id);
    if (note.source) await contentFile(note.source, '.tex', note.id);
    notes.push({ ...note, size });
  }
  return { site, notes };
}
