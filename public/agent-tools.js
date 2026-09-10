export function registerBakeryTools(context,read){
 if(!context?.registerTool)return;
 const tool={name:'read_bakery_menu_and_basket',title:'Read bakery menu and basket',description:'Read the available bakery menu, category ordering status, and the current unsubmitted basket. Does not place an order or access manager/customer records.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('This tool takes an empty object.');const data=read();if(!data)throw new Error('The menu is still loading.');return data;}};
 try{Promise.resolve(context.registerTool(tool)).catch(()=>{});}catch{}
}
