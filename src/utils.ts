export const parsePortugueseNumber = (text: string) => {
  const numberAsText = text.replace(/[^0-9,]/g, '').replace(',', '.');
  const parsedNumber = Number.parseFloat(numberAsText);

  return Number.isNaN(parsedNumber) ? null : parsedNumber;
};
