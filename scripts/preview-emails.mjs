// Renders both transactional emails to ./out/email-preview/*.html so the
// markup can be eyeballed without sending anything.
// Run: node scripts/preview-emails.mjs   (node >=22.6 strips the TS types)
import fs from 'fs';
import path from 'path';
import {welcomeEmail, trialStartedEmail} from '../src/lib/email.ts';

const dir = path.join(process.cwd(), 'out', 'email-preview');
fs.mkdirSync(dir, {recursive: true});

const link = 'https://theaftershot.com/u/a1b2c3d4e5f6g7h8i9';
const welcome = welcomeEmail('AquaShine Pressure Washing & Sons', link);
const trial = trialStartedEmail('Starter', '$19/mo', link);

fs.writeFileSync(path.join(dir, 'welcome.html'), welcome.html);
fs.writeFileSync(path.join(dir, 'trial-started.html'), trial.html);

console.log('welcome subject:', welcome.subject);
console.log('trial subject:  ', trial.subject);
console.log('\n--- welcome (text) ---\n' + welcome.text);
console.log('\n--- trial (text) ---\n' + trial.text);
console.log('\nwrote ->', dir);
