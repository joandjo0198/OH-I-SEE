'use strict';
const express=require('express');
const multer=require('multer');
const rateLimit=require('express-rate-limit');
const {spawn}=require('node:child_process');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {pathToFileURL}=require('node:url');
const router=express.Router();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:6*1024*1024,files:1,fields:2}}).single('plan');
const loadModel=()=>import(pathToFileURL(path.resolve(__dirname,'../../../frontend/js/floorplan/model.mjs')).href);
let active=false;
router.post('/detect',rateLimit({windowMs:60000,max:5,standardHeaders:true,legacyHeaders:false}), (req,res,next)=>{
  if(active)return res.status(429).json({error:'Another drawing is being analysed. Retry in a moment.'});
  const slot=Symbol('detector');active=slot;req.detectorSlot=slot;let finished=false;
  const release=()=>{if(active===slot)active=false;};
  const timeout=setTimeout(()=>{if(finished)return;finished=true;release();res.status(408).json({error:'Drawing upload timed out.'});req.destroy();},30000);timeout.unref();
  req.once('aborted',()=>{if(!finished){finished=true;clearTimeout(timeout);release();}});
  upload(req,res,error=>{if(finished)return;finished=true;clearTimeout(timeout);if(error){release();return res.status(400).json({error:'Upload one PNG, JPEG or PDF no larger than 6 MB.'});}next();});
 },async(req,res)=>{
 let directory;

 try{
  const bytes=req.file?.buffer;if(!bytes)throw Object.assign(Error('Choose a drawing first.'),{status:400});
  const pdf=bytes.subarray(0,5).toString()==='%PDF-',png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(!pdf&&!png&&!jpg)throw Object.assign(Error('File contents must be PNG, JPEG or PDF.'),{status:400});
  const page=Number(req.body.page||1);if(!Number.isInteger(page)||page<1||page>100)throw Object.assign(Error('Choose a PDF page between 1 and 100.'),{status:400});
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'ohisee-plan-'));const filename=path.join(directory,'input'+(pdf?'.pdf':png?'.png':'.jpg'));await fs.writeFile(filename,bytes);
  const python=process.env.FLOORPLAN_PYTHON||path.resolve(__dirname,process.platform==='win32'?'../../.venv-floorplan/Scripts/python.exe':'../../.venv-floorplan/bin/python');
  const script=path.resolve(__dirname,'../../floorplan/detect.py');
  const result=await new Promise((resolve,reject)=>{
   const child=spawn(python,[script,filename,String(page)],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,OMP_NUM_THREADS:'2'}});let out='',size=0,done=false;
   const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(value);};
   const timer=setTimeout(()=>{child.kill();finish(Object.assign(Error('Drawing analysis timed out. Try a smaller, clearer image.'),{status:504}));},150000);
   child.stdout.on('data',chunk=>{size+=chunk.length;if(size>8*1024*1024){child.kill();finish(Error('Detector output exceeded its limit.'));}else out+=chunk;});
   child.stderr.on('data',()=>{});
   child.on('error',()=>finish(Object.assign(Error('Local detector is not installed. Follow docs/floor-plan-studio.md to install its Python environment.'),{status:503})));
   child.on('close',code=>{try{const result=JSON.parse(out.trim());if(code||result.error)finish(Object.assign(Error(result.error||'Drawing analysis failed.'),{status:422}));else finish(null,result);}catch{finish(Error('The local detector returned invalid output.'));}});
  });
  if(result.plan){const {rebuildWalls}=await loadModel();rebuildWalls(result.plan);
   // Associate OCR opening symbols with the nearest detected wall; no unlabelled doors are claimed as detections.
   result.plan.openings=[];const scale=result.plan.detection.pixelsPerFoot;
   for(const t of result.ocr){const label=t.text.trim().toUpperCase(),kind={D:'door',D1:'door',MD:'main',PD:'pocket',W:'window',W1:'window',V:'vent'}[label];if(!kind)continue;
    const x=t.box.reduce((n,b)=>n+b[0],0)/t.box.length/scale,y=t.box.reduce((n,b)=>n+b[1],0)/t.box.length/scale;
    const candidates=result.plan.walls.map(w=>({w,d:Math.abs((w.axis==='h'?y:x)-w.at)+Math.max(0,w.start-(w.axis==='h'?x:y),(w.axis==='h'?x:y)-w.end)})).sort((a,b)=>a.d-b.d);
    const near=candidates[0];if(!near||near.d>3||near.w.end-near.w.start<2)continue;const w=near.w,width=Math.min(kind==='vent'?1.5:kind==='window'?3:2.75,w.end-w.start-.2),offset=Math.max(.1,Math.min(w.end-w.start-width-.1,(w.axis==='h'?x:y)-w.start-width/2));
    if(result.plan.openings.some(o=>o.wallId===w.id&&Math.abs(o.offset-offset)<width))continue;
    result.plan.openings.push({id:'detected-opening-'+result.plan.openings.length,wallId:w.id,kind,offset,width,sill:kind==='vent'?7:kind==='window'?3:0,height:kind==='vent'?1.5:kind==='window'?4:7,confidence:'unverified'});
   }
  }
  res.json(result);
 }catch(error){res.status(error.status||500).json({error:error.message});}finally{if(active===req.detectorSlot)active=false;if(directory)await fs.rm(directory,{recursive:true,force:true}).catch(()=>{});}
});
module.exports=router;
