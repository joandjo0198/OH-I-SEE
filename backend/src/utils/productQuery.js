'use strict';
function productQuery(query={}) {
 const number=(key,fallback,min,max)=>{const raw=query[key];if(raw===undefined)return fallback;if(typeof raw!=='string'||!/^\d+(\.\d+)?$/.test(raw))throw Error('Invalid '+key);const value=Number(raw);if(!Number.isFinite(value)||value<min||value>max)throw Error('Invalid '+key);return value;};
 const text=(key,max)=>{if(query[key]===undefined)return undefined;if(typeof query[key]!=='string'||query[key].length>max)throw Error('Invalid '+key);return query[key].trim();};
 const limit=number('limit',100,1,100),offset=number('offset',0,0,100000);if(!Number.isInteger(limit)||!Number.isInteger(offset))throw Error('Pagination must use integers.');
 const min_price=number('min_price',undefined,0,1e9),max_price=number('max_price',undefined,0,1e9);if(min_price!==undefined&&max_price!==undefined&&min_price>max_price)throw Error('Invalid price range.');
 return {limit,offset,min_price,max_price,search:text('search',100),category:text('category',100),stock:text('stock',30)};
}
module.exports={productQuery};
