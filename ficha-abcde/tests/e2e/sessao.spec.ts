import { expect, test } from '@playwright/test';

test('offline: abre, treina o treino inteiro e finaliza sem rede', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect(page.getByText('Próximo treino')).toBeVisible();
  // service worker instalado e ativo (precache completo)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Próximo treino')).toBeVisible();

  await page.getByRole('button', { name: 'Iniciar treino A' }).click();
  await expect(page.getByRole('timer')).toHaveCount(0);

  // marca todas as séries; o exercício seguinte abre sozinho
  for (let i = 0; i < 40; i++) {
    const pending = page.locator('button.check-btn[aria-pressed="false"]');
    if ((await pending.count()) === 0) break;
    await pending.first().click();
  }
  await expect(page.locator('button.check-btn[aria-pressed="false"]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Finalizar' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('25/25');
  await dialog.getByRole('button', { name: 'Finalizar' }).click();

  await expect(page.getByText('Sessões: 1/40')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Treino B/ })).toBeVisible();

  // continua tudo salvo após recarregar, ainda offline
  await page.reload();
  await expect(page.getByText('Sessões: 1/40')).toBeVisible();
});

test('fechar a página no meio da sessão e reabrir retoma com o descanso', async ({
  context,
}) => {
  const first = await context.newPage();
  await first.goto('/');
  await first.getByRole('button', { name: 'Iniciar treino A' }).click();
  await first
    .getByRole('button', { name: 'Série 1 de Mobilidade de quadril e tornozelo' })
    .click();
  await expect(first.getByRole('timer')).toBeVisible();
  await first.waitForTimeout(500); // deixa a gravação no IndexedDB terminar
  await first.close();

  const second = await context.newPage();
  await second.goto('/');
  await expect(
    second.getByRole('button', { name: 'Série 1 de Mobilidade de quadril e tornozelo' }),
  ).toHaveAttribute('aria-pressed', 'true');
  const timer = second.getByRole('timer');
  await expect(timer).toBeVisible();
  const text = (await timer.getByLabel(/Faltam/).getAttribute('aria-label')) ?? '';
  const secs = Number(text.match(/\d+/)?.[0]);
  expect(secs).toBeGreaterThan(0);
  expect(secs).toBeLessThanOrEqual(30);
});
