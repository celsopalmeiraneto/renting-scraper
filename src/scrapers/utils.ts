import { Locator } from 'playwright';

export const readTextFromLocator = async (locator: Locator) => {
  if (!locator) return '';
  return (await locator.textContent()) ?? '';
};
