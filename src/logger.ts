import bunyan from 'bunyan';
import { mkdir, open } from 'fs/promises';
import { join } from 'path';

const logName = process.env.NPM_PACKAGE_NAME ?? 'renting-scraper';
const logFile = join('logs', `${logName}.log`);

export const log = bunyan.createLogger({
  name: logName,
  level: 'debug',
  serializers: {
    ...bunyan.stdSerializers,
    error: bunyan.stdSerializers.err,
  },
  streams: [
    {
      level: 'trace',
      stream: process.stdout,
    },
  ],
});

export const initializeLogger = async () => {
  await mkdir('logs', { recursive: true });
  const fileHandler = await open(logFile, 'a');
  log.addStream({
    level: 'debug',
    stream: fileHandler.createWriteStream(),
  });
};
