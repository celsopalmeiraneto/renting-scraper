import { randomInt } from 'crypto';

export const parsePortugueseNumber = (text: string) => {
  const numberAsText = text.replace(/[^0-9,]/g, '').replace(',', '.');
  const parsedNumber = Number.parseFloat(numberAsText);

  return Number.isNaN(parsedNumber) ? null : parsedNumber;
};

export const sleep = (min = 2000, max = 4000) => {
  return new Promise((resolve) => setTimeout(resolve, randomInt(min, max)));
};
