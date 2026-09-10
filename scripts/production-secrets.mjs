import {passwordHash} from '../server/worker.mjs';
import {existsSync,writeFileSync,mkdirSync} from 'node:fs';
mkdirSync('.local',{recursive:true});
if(existsSync('.local/production-secrets.json'))throw new Error('Production secrets already exist. Refusing to replace them.');
const password=Buffer.from(crypto.getRandomValues(new Uint8Array(21))).toString('base64url');
const secrets={ADMIN_PASSWORD_HASH:await passwordHash(password),SESSION_SECRET:Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')};
writeFileSync('.local/production-secrets.json',JSON.stringify(secrets),{mode:0o600});
writeFileSync('.local/live-owner-password.txt',password+'\n',{mode:0o600});
console.log('Generated unique production credentials in the Git-excluded .local directory.');
