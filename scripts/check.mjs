import { loadContent } from './content.mjs';
try {
  const { notes } = await loadContent();
  console.log(`内容校验通过：${notes.length} 篇笔记，PDF 和可选 TeX 源文件均存在。`);
} catch (error) {
  console.error(`内容校验失败：${error.message}`);
  process.exitCode = 1;
}
