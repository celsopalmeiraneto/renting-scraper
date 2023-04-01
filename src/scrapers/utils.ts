import { Locator } from 'playwright';

export const readTextFromLocator = async (locator: Locator) => {
  if (!locator) return '';
  try {
    return (await locator.textContent())?.trim() ?? '';
  } catch (err) {
    console.error(err);
    return '';
  }
};
