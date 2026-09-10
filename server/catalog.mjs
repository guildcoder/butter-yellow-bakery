export const flavors = ['Jalapeno & Cheddar','Italian Herbs & Cheese','Chocolate Chip','Brown Sugar Cinnamon','Original','Pizza Loaf'];
export const products = [
 ['pizza','Pizza Loaf','sourdough',1400,1],['pizza-mini','MINI Pizza Loaf','sourdough',900,1],
 ['original','Original','sourdough',1000],['original-mini','MINI Original','sourdough',600],
 ['jalapeno','Jalapeno & Cheddar','sourdough',1300],['jalapeno-mini','MINI Jalapeno & Cheddar','sourdough',800],
 ['herbs','Italian Herbs & Cheese','sourdough',1300],['herbs-mini','MINI Italian Herbs & Cheese','sourdough',800],
 ['chocolate','Chocolate Chip','sourdough',1200],['chocolate-mini','MINI Chocolate Chip','sourdough',700],
 ['cinnamon','Brown Sugar Cinnamon','sourdough',1200],['flight','Sourdough Flight','sourdough',2000],['cinnamon-mini','MINI Brown Sugar Cinnamon','sourdough',700],
 ['cookies-6','Chocolate Chip · ½ dozen','cookies',600],['cookies-12','Chocolate Chip · 1 dozen','cookies',1000],['cookies-24','Chocolate Chip · 2 dozen','cookies',1700],
 ['rolls-4','Sourdough Cinnamon Rolls · 4 pack','rolls',1200],['rolls-8','Sourdough Cinnamon Rolls · 8 pack','rolls',2200]
].map(([id,name,category,price,featured=0],sort)=>({id,name,category,price,featured,sort,stock:0,active:1}));
export const defaults = {headline:'A little butter. A lot of love.',intro:'Thank you for supporting my micro bakery! Pick your sourdough & homemade treats, and I’ll have something lovely waiting for you.',pickup:'I’ll contact you to arrange your pickup.',venmo:'thebutteryellowbakery',ga_id:'',order_note:'Please send payment to the below venmo!'};
