import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const h = React.createElement;
const messages = {
  en: ['Your workspace', 'Review translations before publishing.', 'Save changes'],
  de: ['Ihr Arbeitsbereich', 'Überprüfen Sie die Übersetzungen vor der Veröffentlichung.', 'Änderungen speichern'],
  ja: ['ワークスペース', '公開する前に翻訳を確認してください。', '変更を保存']
};
export function createDemoServer() {
  return createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const locale = Object.hasOwn(messages, url.searchParams.get('locale')) ? url.searchParams.get('locale') : 'en';
    const [title, description, save] = messages[locale];
    const broken = url.searchParams.get('broken') === '1';
    const css = `*{box-sizing:border-box}body{margin:0;background:#f4f6fa;color:#15243d;font:18px/1.6 system-ui,sans-serif}main{max-width:760px;margin:48px auto;padding:24px}section{padding:24px;border:1px solid #bbc5d5;border-radius:12px;background:white}h1{font-size:clamp(24px,5vw,38px);line-height:1.2}button{font:inherit;padding:12px 20px;background:#164b91;color:white;border:0;border-radius:6px;max-width:100%;white-space:normal;overflow-wrap:anywhere}p{overflow-wrap:anywhere}`;
    const tree = h('html', {lang: locale}, h('head', null, h('meta',{charSet:'utf-8'}), h('meta',{name:'viewport',content:'width=device-width, initial-scale=1'}), h('title',null,title), h('style',null,css)),
      h('body',null,h('main',null,h('section',{'aria-labelledby':'title'},h('h1',{id:'title'},title),h('p',null,description),h('button',{type:'button'},save),
        broken ? h('div',null,h('p',{style:{width:'2400px'}},'Deliberate overflow fixture'),h('button',{type:'button'})) : null))));
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    res.end('<!doctype html>' + renderToStaticMarkup(tree));
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createDemoServer().listen(4173,'127.0.0.1',()=>console.log('React SSR demo: http://127.0.0.1:4173'));
}
