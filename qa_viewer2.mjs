export default async function run(page, ui) {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  const failed = [];
  page.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url().slice(0, 120)); });
  await page.goto('http://localhost:8000/plugin/presenter/viewer.html?url=%2Fplugin%2Fpresenter%2Fdata%2F1794131893271-en_2026t208.pdf&page=2', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  return {
    pdfjs: await page.evaluate(() => typeof window.pdfjsLib !== 'undefined'),
    page: await page.evaluate(() => document.getElementById('page_canvas')?.dataset?.page),
    errors, failed
  };
}
