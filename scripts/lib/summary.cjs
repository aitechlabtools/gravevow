// Ayudas para la pantalla de resultados en páginas (13/11).
// leaveSummary: «Saltar» (o «Siguiente») hasta el final y vuelve al Bastión sin curarse.
// summaryPage: avanza hasta la página n.
async function summaryPage(page, n) {
  await page.waitForSelector('[data-testid=summary]');
  for (let k = 0; k < 4; k++) {
    const cur = Number(await page.getAttribute('[data-testid=summary]', 'data-page'));
    if (cur >= n) return;
    await page.click('[data-testid=summary-next]');
    await page.waitForTimeout(80);
  }
}
async function leaveSummary(page) {
  await page.waitForSelector('[data-testid=summary]');
  if (await page.$('[data-testid=summary-skip]')) await page.click('[data-testid=summary-skip]');
  await page.waitForTimeout(80);
  if (!(await page.$('[data-testid=summary]'))) return;
  if (await page.$('[data-testid=cure-later]')) await page.click('[data-testid=cure-later]');
  else await page.click('[data-testid=btn-back-lobby]');
  await page.waitForSelector('[data-testid=summary]', { state: 'detached' });
}
module.exports = { leaveSummary, summaryPage };
