import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function finishWorkoutA(page: Page) {
  await page.getByRole('button', { name: 'Iniciar treino A' }).click();
  // espera a tela do treino (o início grava no banco antes de abrir)
  await expect(page.locator('button.check-btn').first()).toBeVisible();
  for (let i = 0; i < 40; i++) {
    const pending = page.locator('button.check-btn[aria-pressed="false"]');
    if ((await pending.count()) === 0) break;
    await pending.first().click();
  }
  await page.getByRole('button', { name: 'Finalizar' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Finalizar' }).click();
  await expect(page.getByText('Sessões: 1/40')).toBeVisible();
}

test('manifest completo e ícones acessíveis', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({
    name: 'Ficha ABCDE',
    lang: 'pt-BR',
    display: 'standalone',
    start_url: '/',
    scope: '/',
    theme_color: '#0f172a',
  });
  const sizes = manifest.icons.map(
    (i: { sizes: string; purpose?: string }) =>
      `${i.sizes}${i.purpose ? ':' + i.purpose : ''}`,
  );
  expect(sizes).toEqual(['192x192', '512x512', '512x512:maskable']);
  for (const icon of manifest.icons) {
    const res = await request.get('/' + icon.src);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  }
});

test('histórico mostra o treino finalizado; persistência é pedida e aparece em Ajustes', async ({
  page,
}) => {
  await page.goto('/');
  await finishWorkoutA(page);
  await page.getByRole('button', { name: 'Histórico' }).click();
  await expect(page.getByLabel('Resumo')).toContainText('Sessões1');
  await expect(page.getByRole('heading', { name: 'Evolução da carga' })).toBeVisible();
  await page.getByRole('button', { name: /Treino A/, expanded: false }).click();
  await expect(page.getByText('Volume:')).toBeVisible();
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    violations.map(
      (v) =>
        v.id +
        ': ' +
        v.nodes
          .map((n) => n.html.slice(0, 90) + ' ' + (n.any[0]?.message ?? ''))
          .join(' | '),
    ),
  ).toEqual([]); // histórico com dados: calendário, gráfico e lista

  await page.getByRole('button', { name: 'Ajustes' }).click();
  await expect(page.getByText(/Armazenamento persistente:/)).toBeVisible();
  await expect(page.getByText('Salvo neste aparelho.')).toBeVisible();
});

test('exporta, apaga tudo, importa de volta: nada se perde nem duplica', async ({
  page,
}, info) => {
  await page.goto('/');
  await finishWorkoutA(page);
  await page.getByRole('button', { name: 'Ajustes' }).click();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar backup' }).click(),
  ]);
  const file = info.outputPath('backup.json');
  await download.saveAs(file);

  // apaga tudo (banco inteiro) e recarrega
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase('ficha-abcde');
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        req.onblocked = () => resolve();
      }),
  );
  await page.reload();
  await expect(page.getByText('Sessões: 0/40')).toBeVisible();

  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.getByLabel('Importar backup').setInputFiles(file);
  await expect(page.getByText(/1 treino adicionado, 0 já existiam/)).toBeVisible();
  await page.getByLabel('Importar backup').setInputFiles(file); // de novo: não duplica
  await expect(page.getByText(/0 treinos adicionados, 1 já existiam/)).toBeVisible();

  await page.getByRole('button', { name: 'Treinos' }).click();
  await expect(page.getByText('Sessões: 1/40')).toBeVisible();
});
