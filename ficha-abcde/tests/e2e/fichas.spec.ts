import { expect, test } from '@playwright/test';

test('primeiro acesso: escolhe uma ficha pronta, vê as dicas no treino e a ficha sobrevive ao recarregar', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Escolha sua ficha' })).toBeVisible();
  await page.getByRole('button', { name: 'Ver fichas prontas' }).click();
  await page.getByRole('button', { name: /^Ver a ficha Corpo inteiro em casa/ }).click();
  await expect(page.getByRole('link', { name: /ACSM \(2009\)/ })).toHaveAttribute(
    'href',
    /^https:\/\//,
  );
  await page.getByRole('button', { name: 'Usar esta ficha' }).click();
  await expect(page.getByText('Sessões: 0/36')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Sessões: 0/36')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Escolha sua ficha' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Iniciar treino A' }).click();
  await page
    .getByRole('button', { name: 'Série 1 de Mobilidade de quadril e tornozelo' })
    .click();
  // o exercício atual tem "Como fazer"
  await page.getByRole('button', { name: 'Como fazer' }).click();
  await expect(page.getByText('Dicas e erros comuns')).toBeVisible();
});

test('montar do zero: catálogo (busca e filtro), exercício manual e treino offline', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();

  await page.getByRole('button', { name: 'Montar do zero' }).first().click();
  await expect(page.getByRole('heading', { name: /Editar treino A/ })).toBeVisible();
  await page.getByRole('button', { name: '+ Adicionar exercício' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Buscar exercício').fill('remada');
  await dialog.getByRole('button', { name: 'Adicionar Remada baixa na polia' }).click();
  await dialog.getByLabel('Buscar exercício').fill('');
  await dialog.getByRole('button', { name: 'Ombros', exact: true }).click();
  await dialog
    .getByRole('button', { name: 'Adicionar Elevação lateral com halteres' })
    .click();
  await dialog.getByRole('button', { name: 'Criar exercício manualmente' }).click();
  await dialog.getByLabel('Nome do exercício').fill('Meu exercício especial');
  await dialog.getByLabel(/Sua anotação ou dica/).fill('Devagar na descida');
  await dialog.getByRole('button', { name: 'Adicionar ao treino' }).click();
  await dialog.getByRole('button', { name: /Concluir \(3\)/ }).click();
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('heading', { name: /Treino A/ })).toBeVisible();
  await expect(page.getByText('Meu exercício especial')).toBeVisible();

  await page.getByRole('button', { name: '← Treinos' }).click();
  await page.getByRole('button', { name: 'Iniciar treino A' }).click();
  await expect(
    page.getByRole('button', { name: 'Série 1 de Remada baixa na polia' }),
  ).toBeVisible();
});
