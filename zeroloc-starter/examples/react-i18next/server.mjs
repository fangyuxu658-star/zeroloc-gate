import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import i18next from 'i18next';
const h=React.createElement;
export function createApplication({root=fileURLToPath(new URL('.',import.meta.url))}={}) {
  return createServer(async(req,res)=>{
    try {
      const url=new URL(req.url,'http://localhost'),locale=url.searchParams.get('locale')==='de'?'de':'en';
      const resources=Object.fromEntries(await Promise.all(['en','de'].map(async lang=>[lang,{translation:JSON.parse(await readFile(join(root,'locales',lang+'.json'),'utf8'))}])));
      const i18n=i18next.createInstance();await i18n.init({lng:locale,fallbackLng:'en',resources,interpolation:{escapeValue:false}});
      const title=i18n.t('app.title'),greeting=i18n.exists('app.newGreeting')?i18n.t('app.newGreeting',{name:'Ada'}):'';
      const tree=h('html',{lang:locale},h('head',null,h('meta',{charSet:'utf-8'}),h('meta',{name:'viewport',content:'width=device-width, initial-scale=1'}),h('title',null,title),h('style',null,'body{font:18px/1.6 system-ui;color:#15243d;background:#fff;margin:0}main{max-width:720px;padding:24px;margin:auto}button{font:inherit;color:white;background:#164b91;padding:12px;border:0;max-width:100%;white-space:normal;overflow-wrap:anywhere}p{overflow-wrap:anywhere}')),
        h('body',null,h('main',null,h('h1',null,title),h('p',null,greeting),h('button',{type:'button'},locale==='de'?'Weiter':'Continue'),url.searchParams.get('broken')==='1'?h('div',null,h('p',{style:{width:'2400px'}},'Synthetic UI failure'),h('button',{type:'button'})):null)));
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end('<!doctype html>'+renderToStaticMarkup(tree));
    }catch{res.writeHead(500);res.end('Application resource error');}
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)createApplication().listen(4174,'127.0.0.1',()=>console.log('React/i18next example http://127.0.0.1:4174'));
