import { expect, test } from '@playwright/test';

test('CSP restritiva ativa e o app inteiro roda sem nenhuma violação', async ({
  page,
}) => {
  const violations: string[] = [];
  const consoleErrors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  await page.addInitScript(() => {
    const w = window as unknown as { __csp?: string[] };
    document.addEventListener('securitypolicyviolation', (e) => {
      w.__csp = [...(w.__csp ?? []), `${e.violatedDirective} ${e.blockedURI}`];
    });
  });

  const res = await page.goto('/');
  const csp = res!.headers()['content-security-policy'] ?? '';
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("script-src 'self'");
  expect(csp).not.toContain('unsafe-eval');
  expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  expect(res!.headers()['x-content-type-options']).toBe('nosniff');

  // fluxo completo: treinar, histórico, ajustes (áudio, service worker, fontes, estilos inline de React)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.getByRole('button', { name: 'Iniciar treino A' }).click();
  await page
    .getByRole('button', { name: 'Série 1 de Mobilidade de quadril e tornozelo' })
    .click();
  await expect(page.getByRole('timer')).toBeVisible();
  await page.getByRole('button', { name: 'Descartar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Descartar' }).click();
  await page.getByRole('button', { name: 'Histórico' }).click();
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.getByRole('button', { name: 'Testar alerta' }).click();
  await expect(page.getByRole('heading', { name: 'Sincronização' })).toBeVisible();

  violations.push(
    ...((await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp)) ??
      []),
  );
  expect(violations).toEqual([]);
  expect(
    consoleErrors.filter((e) => /Content Security Policy|Refused to/i.test(e)),
  ).toEqual([]);
});
