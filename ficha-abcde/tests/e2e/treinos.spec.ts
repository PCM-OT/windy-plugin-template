import { expect, test } from '@playwright/test';

test('mostra a ficha, edita um treino e a edição sobrevive ao recarregar', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Treino A · Quadríceps/ }),
  ).toBeVisible();
  await expect(page.getByText('Sessões: 0/40')).toBeVisible();

  await page.getByRole('button', { name: 'Treino B, Superiores' }).click();
  await expect(page.getByText('Remada baixa aberta')).toBeVisible();
  await page.getByRole('button', { name: 'Editar treino' }).click();
  await page.getByLabel('Nome').fill('Costas e bíceps');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(
    page.getByRole('heading', { name: /Treino B · Costas e bíceps/ }),
  ).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Treino B, Costas e bíceps' }).click();
  await expect(page.getByRole('heading', { name: /Costas e bíceps/ })).toBeVisible();

  await page.getByRole('button', { name: '← Treinos' }).click();
  await page.getByRole('button', { name: 'Restaurar ficha original' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Restaurar' }).click();
  await expect(page.getByRole('button', { name: 'Treino B, Superiores' })).toBeVisible();
});
