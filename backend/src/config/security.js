'use strict';
function productionSecurity(env){
 if(env.NODE_ENV!=='production')return;
 if(typeof env.JWT_SECRET!=='string'||Buffer.byteLength(env.JWT_SECRET)<32)throw Error('Production requires a JWT_SECRET of at least 32 bytes.');
 let origin;try{origin=new URL(env.FRONTEND_URL);}catch{throw Error('Production requires an explicit FRONTEND_URL.');}
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('Production FRONTEND_URL must be an HTTPS origin.');
}
function corsOrigins(env){const origins=env.NODE_ENV==='production'?[]:['http://localhost:3000','http://127.0.0.1:3000','http://localhost:8000','http://127.0.0.1:8000','http://localhost:5500','http://127.0.0.1:5500'];if(env.FRONTEND_URL)origins.push(new URL(env.FRONTEND_URL).origin);return [...new Set(origins)];}
module.exports={productionSecurity,corsOrigins};
