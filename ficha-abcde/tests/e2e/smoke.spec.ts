import { expect, test } from '@playwright/test';

test('abre o app na aba Treinos', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Ficha ABCDE', { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Seções' })).toBeVisible();
  await expect(page.getByText('Próximo treino')).toBeVisible();
});
