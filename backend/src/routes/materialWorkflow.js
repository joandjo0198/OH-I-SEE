'use strict';
const express=require('express'),db=require('../config/supabase'),{authenticate}=require('../middleware/auth');
const d=require('../services/materials/domain'),s=require('../services/materials/service');
const router=express.Router();router.use(authenticate);
const wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){res.status(e.status||500).json({error:e.status?e.message:'Material workflow failed. Please retry.'});}};
router.get('/catalog',wrap(async(req,res)=>{
 const offset=Math.floor(d.number(req.query.offset??0,'Offset',0,1000000)),limit=Math.floor(d.number(req.query.limit??30,'Limit',1,100));
 let q=db.from('marketplace_products').select('*,product_bim_specs!inner(*)').eq('active',true).eq('product_bim_specs.status','approved').order('name').range(offset,offset+limit-1);
 if(req.query.category)q=q.eq('category',String(req.query.category).slice(0,100));if(req.query.search)q=q.ilike('name','%'+String(req.query.search).slice(0,100)+'%');
 res.json({data:await s.result(q),offset,limit});
}));
router.get('/catalog/manage',wrap(async(req,res)=>{
 let q=db.from('marketplace_products').select('*,product_bim_specs(*)').order('name').limit(100);
 if(req.user.role!=='Admin')q=q.eq('supplier_id',req.user.id);
 res.json({data:await s.result(q),canApprove:req.user.role==='Admin'});
}));
router.put('/catalog/:id/specification',wrap(async(req,res)=>{
 const product=await s.result(db.from('marketplace_products').select('*').eq('id',req.params.id).maybeSingle());if(!product||(req.user.role!=='Admin'&&product.supplier_id!==req.user.id))d.fail('Product not found.',404);
 const old=await s.result(db.from('product_bim_specs').select('*').eq('product_id',product.id).maybeSingle());if(req.body.version!==(old?.version||0))d.fail('Product specification changed. Refresh and retry.',409);
 const status=req.user.role==='Admin'&&['approved','archived','pending'].includes(req.body.status)?req.body.status:'pending';
 const row={product_id:product.id,version:(old?.version||0)+1,metadata:d.metadata(req.body.metadata),status,updated_by:req.user.id,updated_at:new Date().toISOString()};
 const saved=old?await s.result(db.from('product_bim_specs').update(row).eq('product_id',product.id).eq('version',old.version).select('*').maybeSingle()):await s.result(db.from('product_bim_specs').insert(row).select('*').single());if(!saved)d.fail('Product specification changed.',409);res.json({data:saved});
}));
router.get('/projects/:id',wrap(async(req,res)=>res.json({data:await s.read(req.params.id,req.user)})));
router.post('/projects/:id/actions',wrap(async(req,res)=>res.json({data:await s.mutate(req.params.id,req.user,req.body)})));
router.get('/projects/:id/versions',wrap(async(req,res)=>res.json({data:await s.versions(req.params.id,req.user)})));
router.post('/projects/:id/procurement-drafts',wrap(async(req,res)=>res.status(201).json({data:await s.procurementDraft(req.params.id,req.user,req.body)})));
router.get('/projects/:id/boq.csv',wrap(async(req,res)=>{
 const data=await s.read(req.params.id,req.user);if(!data.boq.canFinalize)d.fail('Resolve critical validation issues before final BOQ export.',422);
 const keys=['selectionId','productId','vendorId','roomId','floorId','bimElementId','name','brand','category','model','sku','unit','quantity','purchaseQuantity','unitPrice','material','labor','installation','transport','tax','total'];
 const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
 res.type('text/csv').set('Content-Disposition','attachment; filename="project-boq.csv"').send([keys.join(','),...data.boq.lines.map(l=>keys.map(k=>cell(l[k])).join(','))].join('\r\n'));
}));
module.exports=router;
