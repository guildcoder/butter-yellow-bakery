import {DatabaseSync} from 'node:sqlite';
export function database(path=':memory:'){
 const raw=new DatabaseSync(path);raw.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
 const prepare=sql=>{let args=[];return {bind(...values){args=values;return this;},async first(){return raw.prepare(sql).get(...args)||null;},async all(){return {results:raw.prepare(sql).all(...args)};},async run(){return raw.prepare(sql).run(...args);},_run(){return raw.prepare(sql).run(...args);}};};
 return {raw,prepare,async batch(statements){raw.exec('BEGIN IMMEDIATE');try{const result=statements.map(s=>s._run());raw.exec('COMMIT');return result;}catch(e){raw.exec('ROLLBACK');throw e;}}};
}
