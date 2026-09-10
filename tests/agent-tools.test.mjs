import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerBakeryTools} from '../public/agent-tools.js';
test('optional menu tool exposes only read state and rejects unexpected input',()=>{let tool;const snapshot={products:[],categories:[],basket:[],total:0};registerBakeryTools({registerTool:t=>tool=t},()=>snapshot);assert.equal(tool.name,'read_bakery_menu_and_basket');assert.equal(tool.annotations.readOnlyHint,true);assert.equal(tool.execute({}),snapshot);assert.throws(()=>tool.execute({submit:true}));registerBakeryTools(undefined,()=>snapshot);});
