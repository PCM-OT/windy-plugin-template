import { expect, test } from '@playwright/test';

test('abre o app', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ficha ABCDE' })).toBeVisible();
});
