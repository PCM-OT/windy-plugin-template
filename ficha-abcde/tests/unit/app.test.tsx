import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { App } from '../../src/App';
import { AppDataProvider } from '../../src/data/AppData';
import { freshRepo } from './helpers';

it('abre na aba Treinos com o próximo treino A', async () => {
  const { repo } = freshRepo();
  render(
    <AppDataProvider repo={repo}>
      <App />
    </AppDataProvider>,
  );
  expect(
    await screen.findByRole('heading', { name: /Treino A · Quadríceps/ }),
  ).toBeInTheDocument();
});
