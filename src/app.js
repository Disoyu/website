const $ = (selector) => document.querySelector(selector);
const state = { notes: [], category: '', tag: '', query: '', sort: 'newest' };
const reader = $('#reader-dialog');
const about = $('#about-dialog');
const icon = {
  all: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Zm0 0v15"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>'
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function fileURL(path) {
  return new URL(path.split('/').map(encodeURIComponent).join('/'), new URL('./', location.href)).href;
}

function fileSize(bytes) {
  if (!Number.isFinite(bytes)) return 'PDF';
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function renderFilters() {
  const categories = [...new Set(state.notes.map(note => note.category))];
  $('#category-list').replaceChildren(...['', ...categories].map(category => {
    const button = element('button', 'category-button');
    button.innerHTML = category ? icon.book : icon.all;
    button.append(element('span', '', category || '全部笔记'));
    const count = state.notes.filter(note => !category || note.category === category).length;
    button.append(element('span', 'category-count', String(count).padStart(2, '0')));
    button.dataset.category = category;
    button.setAttribute('aria-pressed', String(state.category === category));
    button.addEventListener('click', () => { state.category = category; update(); });
    return button;
  }));
  const tags = [...new Set(state.notes.flatMap(note => note.tags))];
  $('#tag-list').replaceChildren(...tags.map(tag => {
    const button = element('button', 'tag-chip', tag);
    button.dataset.tag = tag;
    button.setAttribute('aria-pressed', String(state.tag === tag));
    button.addEventListener('click', () => { state.tag = state.tag === tag ? '' : tag; update(); });
    return button;
  }));
}

function noteCard(note) {
  const index = state.notes.indexOf(note);
  const card = element('article', `note-card${note.featured ? ' featured' : ''}`);
  const cover = element('div', 'note-cover');
  cover.setAttribute('aria-hidden', 'true');
  cover.dataset.tone = String(index % 3);
  cover.append(element('span', 'cover-number', `NOTE / ${String(index + 1).padStart(3, '0')}`), element('span', 'cover-formula', note.formula || '∂'));
  const coverFooter = element('span', 'cover-footer');
  coverFooter.append(element('span', '', 'LATEX'), element('span', '', 'PDF ↗'));
  cover.append(coverFooter);
  const content = element('div', 'note-content');
  const top = element('div', 'note-topline');
  top.append(element('span', 'subject-label', note.category));
  if (note.demo) top.append(element('span', 'demo-label', '示例笔记'));
  if (note.featured) top.append(element('span', 'featured-label', '✧ 精选推导'));
  const title = element('h3', 'note-title');
  const titleLink = element('a', '', note.title);
  titleLink.href = `#note/${encodeURIComponent(note.id)}`;
  title.append(titleLink);
  const tags = element('div', 'note-tags');
  tags.append(...note.tags.map(tag => element('span', '', `# ${tag}`)));
  const bottom = element('div', 'note-bottom');
  const meta = element('div', 'note-meta');
  const time = element('time', '', note.date.replaceAll('-', '.'));
  time.dateTime = note.date;
  meta.append(time, element('span', '', '·'), element('span', '', fileSize(note.size)));
  const actions = element('div', 'note-actions');
  if (note.source) {
    const source = element('a', 'source-link', 'TeX 源码');
    source.href = fileURL(note.source);
    source.download = '';
    source.setAttribute('aria-label', `下载 ${note.title} 的 TeX 源码`);
    actions.append(source);
  }
  const read = element('a', 'read-link', '在线阅读 ↗');
  read.href = titleLink.getAttribute('href');
  read.setAttribute('aria-label', `在线阅读 ${note.title}`);
  const download = element('a', 'download-link');
  download.innerHTML = icon.download;
  download.href = fileURL(note.file);
  download.download = '';
  download.title = '下载 PDF';
  download.setAttribute('aria-label', `下载 ${note.title} 的 PDF`);
  actions.append(read, download);
  bottom.append(meta, actions);
  content.append(top, title, element('p', 'note-description', note.description), tags, bottom);
  card.append(cover, content);
  return card;
}

function update(writeURL = true) {
  const terms = state.query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const notes = state.notes.filter(note => {
    const text = [note.title, note.description, note.category, ...note.tags].join(' ').toLocaleLowerCase();
    return (!state.category || state.category === note.category) && (!state.tag || note.tags.includes(state.tag)) && terms.every(term => text.includes(term));
  });
  notes.sort((a, b) => state.sort === 'title' ? a.title.localeCompare(b.title, 'zh-CN') : (state.sort === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) || Number(b.featured) - Number(a.featured));
  document.querySelectorAll('[data-category]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === state.category)));
  document.querySelectorAll('[data-tag]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.tag === state.tag)));
  $('#notes-list').replaceChildren(...notes.map(noteCard));
  $('#total-count').textContent = String(state.notes.length).padStart(2, '0');
  $('#results-label').textContent = `${state.category || '全部笔记'}${state.tag ? ` · #${state.tag}` : ''} · ${notes.length} 篇`;
  $('#empty-state').hidden = notes.length > 0;
  $('#collection-end').hidden = notes.length === 0;
  $('#reset-filters').hidden = !(state.category || state.tag || state.query);
  if (writeURL) {
    const url = new URL(location.href);
    for (const [key, value] of Object.entries({ q: state.query, category: state.category, tag: state.tag, sort: state.sort === 'newest' ? '' : state.sort })) {
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    history.replaceState(null, '', url);
  }
}

function readURL() {
  const params = new URLSearchParams(location.search);
  state.query = params.get('q') || '';
  state.category = params.get('category') || '';
  state.tag = params.get('tag') || '';
  state.sort = ['newest', 'oldest', 'title'].includes(params.get('sort')) ? params.get('sort') : 'newest';
  $('#search').value = state.query;
  $('#sort').value = state.sort;
}

function resetFilters() {
  state.query = ''; state.category = ''; state.tag = '';
  $('#search').value = '';
  update();
}

function syncReader() {
  if (!location.hash.startsWith('#note/')) { if (reader.open) reader.close(); return; }
  let id;
  try { id = decodeURIComponent(location.hash.slice(6)); } catch { return; }
  const note = state.notes.find(item => item.id === id);
  if (!note) {
    if (reader.open) reader.close();
    $('#results-label').textContent = '这条笔记链接已失效，请在笔记库中重新选择。';
    return;
  }
  $('#reader-title').textContent = note.title;
  $('#reader-meta').textContent = `${note.category} · ${note.date} · ${fileSize(note.size)}`;
  $('#reader-open').href = fileURL(note.file);
  $('#reader-download').href = fileURL(note.file);
  const readerURL = new URL('./reader.html', location.href);
  readerURL.searchParams.set('file', note.file);
  if ($('#pdf-frame').src !== readerURL.href) $('#pdf-frame').src = readerURL.href;
  $('#pdf-frame').title = note.title;
  if (about.open) about.close();
  if (!reader.open) reader.showModal();
}

async function load() {
  $('#error-state').hidden = true;
  try {
    const responses = await Promise.all(['./data/site.json', './data/notes.json'].map(url => fetch(url)));
    if (responses.some(response => !response.ok)) throw new Error('无法加载站点数据');
    const [site, notes] = await Promise.all(responses.map(response => response.json()));
    state.notes = notes;
    document.querySelectorAll('[data-site-name]').forEach(node => { node.textContent = site.name; });
    document.querySelectorAll('[data-english-name]').forEach(node => { node.textContent = site.englishName; });
    document.querySelectorAll('[data-author]').forEach(node => { node.textContent = site.author; });
    document.querySelectorAll('[data-repository]').forEach(node => { node.href = site.repository; });
    document.querySelectorAll('[data-issues]').forEach(node => { node.href = `${site.repository.replace(/\/$/, '')}/issues`; });
    $('[data-description]').textContent = site.description;
    $('.avatar').textContent = site.author.slice(0, 1).toUpperCase();
    $('#about-copy').textContent = site.about;
    $('.about-info').hidden = !notes.some(note => note.demo);
    document.title = `${site.name} · ${site.author} 的理论笔记`;
    document.querySelector('meta[name="description"]').content = site.description;
    $('#year').textContent = new Date().getFullYear();
    readURL(); renderFilters(); update(false); syncReader();
  } catch (error) {
    console.error(error);
    $('#notes-list').replaceChildren();
    $('#empty-state').hidden = true;
    $('#error-state').hidden = false;
    $('#collection-end').hidden = true;
    $('#results-label').textContent = '暂时无法加载笔记';
  }
}

$('#search').addEventListener('input', event => { state.query = event.target.value; update(); });
$('#sort').addEventListener('change', event => { state.sort = event.target.value; update(); });
$('#reset-filters').addEventListener('click', resetFilters);
$('#empty-reset').addEventListener('click', resetFilters);
$('#retry-load').addEventListener('click', load);
document.querySelectorAll('[data-about]').forEach(button => button.addEventListener('click', () => about.showModal()));
$('[data-close-about]').addEventListener('click', () => about.close());
$('[data-close-reader]').addEventListener('click', () => reader.close());
reader.addEventListener('close', () => {
  $('#pdf-frame').removeAttribute('src');
  if (location.hash.startsWith('#note/')) history.replaceState(null, '', `${location.pathname}${location.search}#library`);
});
for (const dialog of [reader, about]) dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !document.activeElement.isContentEditable && !reader.open && !about.open) { event.preventDefault(); $('#search').focus(); }
});
window.addEventListener('hashchange', syncReader);
window.addEventListener('popstate', () => { readURL(); update(false); syncReader(); });
await load();
