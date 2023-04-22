import { compile } from 'handlebars';
import { sortBy } from 'lodash';
import { createTransport } from 'nodemailer';
import { Diff } from './property-diff';

interface DiffForMailing {
  typeOfChange: 'New' | 'Changed' | 'Deleted';
  link: string;
  description: string;
  price: string;
  changes: ({
    attribute: 'Area' | 'Energy Certification' | 'Location' | 'Price' | 'Link';
    oldValue?: string;
    hasOldValue: boolean;
    newValue: string;
  } | null)[];
}

/* eslint-disable max-len */
const templateText = `
  <h1>Recent Properties</h1>
  </br>
  {{#each diff}}
    <h2><a href="{{link}}">{{description}} - {{price}}</a></h2>
    <p><strong>{{typeOfChange}}<strong></p>
    <table>
      {{#each changes}}
        <tr>
          <td>{{attribute}}:</td><td>{{newValue}}</td><td>{{#if hasOldValue}}Previously: {{oldValue}}{{/if}}</td>
        </tr>
      {{/each}}
    </table>
  {{/each}}
  <h2></h2>
`;
/* eslint-enable max-len */

const template = compile(templateText);

const sendEmail = async (subject: string, html: string) => {
  const transporter = createTransport({
    host: 'email-smtp.eu-west-1.amazonaws.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.MAIL_USER ?? '',
      pass: process.env.MAIL_PWD ?? '',
    },
  });

  await transporter.sendMail({
    from: `Renting Scraper ${
      process.env.NODE_ENV !== 'production' ? process.env.NODE_ENV : ''
    } <renting-scraper@celsoneto.com.br>`,
    to: process.env.MAIL_RECIPIENT,
    subject,
    html,
  });
};

const convertDiffChangeToMailDiffChange = (type: Diff['type']): DiffForMailing['typeOfChange'] => {
  switch (type) {
    case 'changed':
      return 'Changed';
    case 'new':
      return 'New';
    case 'deleted':
      return 'Deleted';
  }
};

const EURO_FORMATTER = new Intl.NumberFormat('pt-PT', {
  currency: 'EUR',
});

const AREA_FORMATTER = new Intl.NumberFormat('pt-PT', {
  style: 'unit',
  unit: 'meter',
});

export const sendUpdateEmail = async (diffSet: Diff[]) => {
  const sortedDiffs = sortBy(diffSet, ['type', 'entity.location', 'entity.price']);
  const diffsForMailing = sortedDiffs.map<DiffForMailing>((diff) => {
    const changes = diff.type === 'changed' ? diff.changes : null;

    const description = changes?.description?.newValue ?? diff.entity.description;
    const link = changes?.link?.newValue ?? diff.entity.link;
    const price = changes?.price?.newValue ?? diff.entity.price;

    const areaChange: DiffForMailing['changes'][0] = changes?.areaInM3
      ? {
          attribute: 'Area',
          newValue: changes.areaInM3.newValue
            ? AREA_FORMATTER.format(changes.areaInM3.newValue)
            : '',
          hasOldValue: !!changes.areaInM3.oldValue,
          oldValue: changes.areaInM3.oldValue
            ? AREA_FORMATTER.format(changes.areaInM3.oldValue)
            : undefined,
        }
      : null;

    const energyCertificationChange: DiffForMailing['changes'][0] = changes?.energyCertification
      ? {
          attribute: 'Energy Certification',
          newValue: changes.energyCertification.newValue ?? '',
          hasOldValue: !!changes.energyCertification.newValue,
          oldValue: changes.energyCertification.oldValue ?? undefined,
        }
      : null;

    const locationChange: DiffForMailing['changes'][0] = changes?.location
      ? {
          attribute: 'Location',
          newValue: changes.location.newValue ?? '',
          hasOldValue: !!changes.location.newValue,
          oldValue: changes.location.oldValue ?? undefined,
        }
      : null;

    const priceChange: DiffForMailing['changes'][0] = changes?.price
      ? {
          attribute: 'Price',
          newValue: changes.price.newValue ? EURO_FORMATTER.format(changes.price.newValue) : '',
          hasOldValue: !!changes.price.newValue,
          oldValue: changes.price.oldValue
            ? EURO_FORMATTER.format(changes.price.oldValue)
            : undefined,
        }
      : null;

    const linkChange: DiffForMailing['changes'][0] = changes?.link
      ? {
          attribute: 'Link',
          newValue: changes.link.newValue ?? '',
          hasOldValue: !!changes.link.newValue,
          oldValue: changes.link.oldValue ?? undefined,
        }
      : null;

    return {
      typeOfChange: convertDiffChangeToMailDiffChange(diff.type),
      description,
      link,
      price: EURO_FORMATTER.format(price),
      changes: [
        areaChange,
        energyCertificationChange,
        locationChange,
        priceChange,
        linkChange,
      ].filter((entry) => !!entry),
    };
  });

  await sendEmail(
    `Properties Update - ${new Date().toLocaleString()}`,
    template({ diff: diffsForMailing }),
  );
};

interface SendStatusEmail {
  (error: Error | null, data?: string): Promise<void>;
}
export const sendStatusEmail: SendStatusEmail = async (error, data) => {
  await sendEmail('Execution Results', error ? `Error: ${error.message}` : data ?? '');
};
