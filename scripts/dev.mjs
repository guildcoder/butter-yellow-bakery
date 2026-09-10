import http from 'node:http';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import worker,{passwordHash} from '../server/worker.mjs';
import {database} from './sqlite-adapter.mjs';
mkdirSync('.local',{recursive:true});
const db=database('.local/bakery.sqlite');
if(!db.raw.prepare("SELECT name FROM sqlite_master WHERE name='settings'").get())db.raw.exec(readFileSync('migrations/0001_initial.sql','utf8'));
if(!db.raw.prepare('PRAGMA table_info(orders)').all().some(c=>c.name==='email'))db.raw.exec(readFileSync('migrations/0002_confirmation_email.sql','utf8'));
if(!db.raw.prepare('PRAGMA table_info(products)').all().some(c=>c.name==='unlimited'))db.raw.exec(readFileSync('migrations/0003_unlimited_inventory.sql','utf8'));
let secrets;if(existsSync('.local/secrets.json'))secrets=JSON.parse(readFileSync('.local/secrets.json','utf8'));else{const password=Buffer.from(crypto.getRandomValues(new Uint8Array(18))).toString('base64url');secrets={ADMIN_PASSWORD_HASH:await passwordHash(password),SESSION_SECRET:Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')};writeFileSync('.local/secrets.json',JSON.stringify(secrets),{mode:0o600});writeFileSync('.local/owner-password.txt',password+'\n',{mode:0o600});}
const root=resolve('public');const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const env={DB:db,...secrets,ASSETS:{async fetch(req){const url=new URL(req.url);let path;try{path=resolve(root,'.'+decodeURIComponent(url.pathname==='/ '?'/index.html':url.pathname));}catch{return new Response('Bad path',{status:400});}if(url.pathname==='/')path=resolve(root,'index.html');if(path!==root&&!path.startsWith(root+'\\')&&!path.startsWith(root+'/'))return new Response('Forbidden',{status:403});try{return new Response(readFileSync(path),{headers:{'Content-Type':types[extname(path)]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}}}};
const server=http.createServer(async(req,res)=>{try{let chunks=[],length=0;for await(const chunk of req){length+=chunk.length;if(length>45000){res.writeHead(413);res.end();return;}chunks.push(chunk);}const url=`http://127.0.0.1:4173${req.url}`;const request=new Request(url,{method:req.method,headers:req.headers,...(req.method!=='GET'&&req.method!=='HEAD'?{body:Buffer.concat(chunks)}:{})});const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Local server error');}});
server.listen(4173,'127.0.0.1',()=>console.log('Bakery preview: http://127.0.0.1:4173\nLocal office password is saved in .local/owner-password.txt (excluded from Git).'));
