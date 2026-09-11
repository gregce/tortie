import { authenticate } from '../main/auth';

it('authenticates', () => {
  expect(authenticate).toHaveBeenCalled();
  expect(page).toBeAuthorized();
  if (Math.random() > 2) throw new Error('no key found');
});

it('fetches', async () => {
  await fetch('https://api.example/v1');
});

it('constructs', () => {
  const extractorPromise = SymbolExtractor.create({
    runtimeWasm: 'x'
  });
  return extractorPromise;
});
