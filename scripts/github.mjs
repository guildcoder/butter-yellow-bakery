// Uses the existing Git credential helper without writing credentials to disk.
import {spawnSync} from 'node:child_process';
const result=spawnSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\nusername=guildcoder\n\n',encoding:'utf8',env:{...process.env,GCM_INTERACTIVE:'never',GIT_TERMINAL_PROMPT:'0'},windowsHide:true});
if(result.status!==0){console.log('GitHub authentication is unavailable. Sign in as guildcoder first.');process.exit(2);}
const fields=Object.fromEntries(result.stdout.trim().split('\n').map(l=>{const at=l.indexOf('=');return[l.slice(0,at),l.slice(at+1)];}));
const headers={Authorization:`Bearer ${fields.password}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
async function request(path,body){const r=await fetch('https://api.github.com'+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw new Error(`GitHub returned ${r.status}: ${data.message}`);return data;}
const user=await request('/user');console.log('Authenticated GitHub account:',user.login);if(user.login.toLowerCase()!=='guildcoder'){console.log('Stopped: only the personal guildcoder account is authorized.');process.exit(3);}
if(process.argv.includes('--create')){const data=await request('/user/repos',{name:'butter-yellow-bakery',description:'The Butter Yellow Bakery storefront and private bakery office. Cloudflare Worker + D1.',private:true,auto_init:false});console.log('Created personal private repository:',data.html_url);}
