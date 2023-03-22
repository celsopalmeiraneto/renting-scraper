const main = () => {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      console.log('Hello World!');

      return resolve();
    }, 1000);
  });
};

export const sum = (termA: number, termB: number) => termA + termB;

(async () => {
  await main();
})();
