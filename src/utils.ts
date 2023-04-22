import { randomInt } from 'node:crypto';
import url from 'node:url';

export const parsePortugueseNumber = (text: string) => {
  const numberAsText = text.replace(/[^0-9,]/g, '').replace(',', '.');
  const parsedNumber = Number.parseFloat(numberAsText);

  return Number.isNaN(parsedNumber) ? null : parsedNumber;
};

export const removeFragmentFromUrl = (inputUrl: string | URL): string => {
  const urlToRemove = typeof inputUrl === 'string' ? new URL(inputUrl) : inputUrl;
  return url.format(urlToRemove, { fragment: false });
};

export const sleep = (min = 2000, max = 4000) => {
  return new Promise((resolve) => setTimeout(resolve, randomInt(min, max)));
};
