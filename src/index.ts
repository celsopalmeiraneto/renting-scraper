import { ImovirtualScraper } from './scrapers/imovirtual/ImovirtualScraper';

const main = async () => {
  const imovirtualScraper = new ImovirtualScraper();
  await imovirtualScraper.initialize();
  const properties = await imovirtualScraper.scrape();
  await imovirtualScraper.destroy();
  console.table(properties);
};

export const sum = (termA: number, termB: number) => termA + termB;

(async () => {
  await main();
})();
