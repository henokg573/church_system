export default async function run(page, ui) {
  await page.goto('http://localhost:8000/plugin/presenter/viewer.html?url=%2Fplugin%2Fpresenter%2Fdata%2F1794131893271-en_2026t208.pdf&page=2', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  const check = await page.evaluate(() => {
    const results = {};
    results.hasLib = typeof window.pdfjsLib;
    // is it a module? try globalThis
    results.globalThis = typeof globalThis.pdfjsLib;
    try { results.importWorks = typeof import('/plugin/presenter/vendor/pdf.min.js'); } catch (e) { results.importWorks = 'ERR'; }
    return results;
  });
  // fetch the script manually and check what it declares
  const probe = await page.evaluate(async () => {
    const res = await fetch('/plugin/presenter/vendor/pdf.min.js');
    const text = await res.text();
    return { len: text.length, hasPdfJsLib: text.includes('pdfjsLib'), hasGlobalThis: text.match(/globalThis/g)?.length, head: text.slice(0, 0) };
  });
  return { check, probe };
}
