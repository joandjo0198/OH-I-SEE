'use strict';
const {render}=require('./drawingRenderer');
const {enforce}=require('./planValidator');
function sheets(plan,options={}) {
  enforce(plan);const pages=['A-01','A-02','A-03'].map(sheet=>({id:sheet,svg:render(plan,{...options,sheet})}));
  for(let page=0;page<Math.ceil(plan.rooms.length/20);page++)pages.push({id:`A-04${page?'.'+(page+1):''}`,svg:render(plan,{...options,sheet:'A-04',schedulePage:page})});
  return pages;
}
async function pdf(plan,options={}) {
  const PDFDocument=require('pdfkit'),svgToPdf=require('svg-to-pdfkit');
  const pages=sheets(plan,options),doc=new PDFDocument({autoFirstPage:false,info:{Title:plan.projectName,Subject:plan.status}}),chunks=[];
  const done=new Promise((resolve,reject)=>{doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
  for(const page of pages){doc.addPage({size:'A3',layout:'landscape',margin:0});svgToPdf(doc,page.svg,0,0,{width:doc.page.width,height:doc.page.height,assumePt:false});}
  doc.end();return done;
}
module.exports={sheets,pdf};
