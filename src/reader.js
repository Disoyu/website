const $ = selector => document.querySelector(selector);

async function startReader() {
  const file = new URLSearchParams(location.search).get('file') || '';
  if (!file.startsWith('pdfs/') || !file.toLowerCase().endsWith('.pdf') || file.includes('\\') || file.split('/').some(part => !part || part === '..' || part === '.')) throw new Error('无效的 PDF 路径');
  const pdfjs = await import('../vendor/pdfjs/build/pdf.mjs');
  const { EventBus, PDFViewer, PDFLinkService } = await import('../vendor/pdfjs/web/pdf_viewer.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/build/pdf.worker.mjs', import.meta.url).href;
  const eventBus = new EventBus();
  const linkService = new PDFLinkService({ eventBus, externalLinkTarget: 2, externalLinkRel: 'noopener noreferrer' });
  const viewer = new PDFViewer({ container: $('#viewer-container'), eventBus, linkService, imageResourcesPath: new URL('../vendor/pdfjs/web/images/', import.meta.url).href, maxCanvasPixels: 16777216 });
  linkService.setViewer(viewer);
  const pageInput = $('#page-number');
  const updatePage = () => {
    pageInput.value = viewer.currentPageNumber;
    $('#previous').disabled = viewer.currentPageNumber <= 1;
    $('#next').disabled = viewer.currentPageNumber >= viewer.pagesCount;
  };
  eventBus.on('pagesinit', () => {
    viewer.currentScaleValue = 'page-width';
    pageInput.disabled = false;
    pageInput.max = viewer.pagesCount;
    $('#page-count').textContent = `/ ${viewer.pagesCount}`;
    $('#zoom').disabled = false;
    updatePage();
  });
  eventBus.on('pagechanging', updatePage);
  eventBus.on('pagerendered', ({ error }) => {
    if (error) { $('#loading-status').textContent = '部分页面显示失败，请下载阅读'; return; }
    $('#loading-status').textContent = 'PDF · 可选择文字';
  });
  $('#previous').addEventListener('click', () => { if (viewer.currentPageNumber > 1) viewer.currentPageNumber -= 1; });
  $('#next').addEventListener('click', () => { if (viewer.currentPageNumber < viewer.pagesCount) viewer.currentPageNumber += 1; });
  pageInput.addEventListener('change', () => { viewer.currentPageNumber = Math.max(1, Math.min(viewer.pagesCount, Math.round(Number(pageInput.value)) || 1)); updatePage(); });
  pageInput.addEventListener('keydown', event => { if (event.key === 'Enter') { pageInput.dispatchEvent(new Event('change')); $('#viewer-container').focus(); } });
  $('#zoom').addEventListener('change', event => { viewer.currentScaleValue = event.target.value; });
  eventBus.on('resize', () => { if ($('#zoom').value.startsWith('page-')) viewer.currentScaleValue = $('#zoom').value; });
  const loadingTask = pdfjs.getDocument({
    url: new URL(file.split('/').map(encodeURIComponent).join('/'), location.href).href,
    cMapUrl: new URL('../vendor/pdfjs/cmaps/', import.meta.url).href,
    cMapPacked: true,
    standardFontDataUrl: new URL('../vendor/pdfjs/standard_fonts/', import.meta.url).href,
    wasmUrl: new URL('../vendor/pdfjs/wasm/', import.meta.url).href,
    isEvalSupported: false
  });
  loadingTask.onPassword = () => { $('#loading-status').textContent = '此 PDF 需要密码，请下载后阅读'; $('#pdf-error').hidden = false; void loadingTask.destroy(); };
  const document = await loadingTask.promise;
  viewer.setDocument(document);
  linkService.setDocument(document);
}

try { await startReader(); }
catch (error) {
  console.error('PDF 预览失败', error);
  $('#loading-status').textContent = '预览不可用';
  $('#pdf-error').hidden = false;
}
