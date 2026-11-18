export default async function run(page, ui) {
  const out = { console: [], requests: [] };
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') out.console.push(m.type() + ': ' + m.text().slice(0, 200)); });
  page.on('requestfailed', r => out.requests.push('FAILED ' + r.url().slice(0, 120) + ' ' + (r.failure()?.errorText || '')));
  await page.goto('http://localhost:8000/plugin/presenter/viewer.html?url=%2Fplugin%2Fpresenter%2Fdata%2F1794131893271-en_2026t208.pdf&page=2');
  await page.waitForTimeout(5000);
  out.canvas = await page.evaluate(() => {
    const c = document.getElementById('page_canvas');
    return { exists: !!c, page: c?.dataset?.page, w: c?.width, h: c?.height };
  });
  out.pdfjs = await page.evaluate(() => typeof window.pdfjsLib !== 'undefined');
  await page.screenshot({ path: 'qa_viewer_direct.png' });
  return out;
}
