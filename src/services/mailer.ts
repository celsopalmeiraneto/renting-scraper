import { compile } from 'handlebars';
import { sortBy } from 'lodash';
import { createTransport } from 'nodemailer';
import { Diff } from './property-diff';

/* eslint-disable max-len */
const templateText = `
  <h1>Recent Properties</h1>
  </br>
  {{#each diff}}
    <h2><a href="{{entity.link}}">{{entity.description}} - EUR {{entity.price}}</a></h2>
    <p><strong>{{type}}<strong></p>
    <table>
      {{#with entity}}
        <tr>
          <td>Area:</td><td>{{areaInM3}}</td><td>{{../changes.areaInM3.newValue}}</td>
        </tr>
        <tr>
          <td>Energy Certification:</td><td>{{energyCertification}}</td><td>{{../changes.energyCertification.newValue}}</td>
        </tr>
        <tr>  
          <td>Location:</td><td>{{location}}</td><td>{{../changes.location.newValue}}</td>
        </tr>
      {{/with}}
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

export const sendUpdateEmail = async (diffSet: Diff[]) => {
  const sortedDiff = sortBy(diffSet, ['type', 'entity.location', 'entity.price']);
  await sendEmail(
    `Properties Update - ${new Date().toLocaleString()}`,
    template({ diff: sortedDiff }),
  );
};
