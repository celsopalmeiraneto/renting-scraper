import { compile } from 'handlebars';
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
          <td>Energy Certification:</td><td>{{energyCertification}}</td><td>{{../changes.energyCertification.newValue}}</td>
          <td>Location:</td><td>{{location}}</td><td>{{../changes.location.newValue}}</td>
        </tr>
      {{/with}}
    </table>
  {{/each}}
  <h2></h2>
`;
/* eslint-enable max-len */

const template = compile(templateText);

export const sendEmail = async (diffSet: Diff[]) => {
  const sortedDiff = diffSet.sort((a, b) => {
    if (a.type === b.type) return 0;

    if (a.type > b.type) return 1;

    return -1;
  });
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
    from: 'Renting Scraper <renting-scraper@celsoneto.com.br>',
    to: process.env.MAIL_RECIPIENT,
    subject: `Properties Update - ${new Date().toLocaleString()}`,
    html: template({ diff: diffSet }),
  });
};
