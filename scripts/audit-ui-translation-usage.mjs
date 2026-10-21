// Read-only audit of statically resolvable next-intl calls and ICU arguments.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
const locales = ['ar','en','fr','tr','id','pt','es','de'];
const messages = Object.fromEntries(locales.map(l=>[l,JSON.parse(fs.readFileSync(`i18n/messages/${l}.json`,'utf8'))]));
const valueAt = (obj,key)=>key.split('.').reduce((v,k)=>v?.[k],obj);
const files=execFileSync('rg',['--files','app','components','hooks','lib'],{encoding:'utf8'}).trim().split('\n').filter(p=>/\.[jt]sx?$/.test(p));
const uses=[],dynamic=[];
for(const file of files){
  const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true), bindings=new Map();
  const scope=n=>{while(n.parent && !ts.isFunctionLike(n) && !ts.isSourceFile(n))n=n.parent;return n;};
  const literal=n=>n && (ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))?n.text:null;
  const collect=n=>{if(ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)){
    let init=n.initializer;if(init && ts.isAwaitExpression(init))init=init.expression;
    if(init && ts.isCallExpression(init) && ts.isIdentifier(init.expression) && ['useTranslations','getTranslations'].includes(init.expression.text)){
      const arg=init.arguments[0];let namespace=arg?literal(arg):'';
      if(arg && ts.isObjectLiteralExpression(arg)){const prop=arg.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(source)==='namespace');namespace=prop?literal(prop.initializer):'';}
      if(namespace!==null){const s=scope(n);if(!bindings.has(s))bindings.set(s,new Map());bindings.get(s).set(n.name.text,namespace);}
    }
  }ts.forEachChild(n,collect);};collect(source);
  const walk=n=>{if(ts.isCallExpression(n)){
    const expression=ts.isPropertyAccessExpression(n.expression)?n.expression.expression:n.expression;
    if(ts.isIdentifier(expression)){
      let current=scope(n),namespace;
      while(current){if(bindings.get(current)?.has(expression.text)){namespace=bindings.get(current).get(expression.text);break;}current=current.parent?scope(current.parent):null;}
      if(namespace!==undefined){const key=literal(n.arguments[0]),line=source.getLineAndCharacterOfPosition(n.getStart()).line+1;
        if(key!==null)uses.push({file,line,key:[namespace,key].filter(Boolean).join('.')});
        else dynamic.push({file,line,namespace,expression:n.arguments[0]?.getText(source)});
      }
    }
  }ts.forEachChild(n,walk);};walk(source);
}
const missing=uses.map(use=>({...use,locales:locales.filter(l=>valueAt(messages[l],use.key)===undefined)})).filter(use=>use.locales.length);
const flatten=(obj,prefix='',out={})=>{for(const [k,v] of Object.entries(obj)){const p=prefix?prefix+'.'+k:k;if(typeof v==='string')out[p]=v;else if(v && typeof v==='object')flatten(v,p,out);}return out;};
const base=flatten(messages.ar),placeholderMismatches=[];
const placeholders=s=>[...new Set([...s.matchAll(/\{(\w+)\s*[,}]/g)].map(m=>m[1]))].sort().join(',');
for(const [key,value] of Object.entries(base))for(const locale of locales){const translated=valueAt(messages[locale],key);if(typeof translated==='string'&&placeholders(translated)!==placeholders(value))placeholderMismatches.push({key,locale,arabic:placeholders(value),actual:placeholders(translated)});}
const report={checkedFiles:files.length,literalUses:uses.length,dynamicUses:dynamic.length,missing,placeholderMismatches,dynamic};
console.log(JSON.stringify(report,null,2));
if(process.argv.includes('--strict')&&(missing.length||placeholderMismatches.length))process.exitCode=1;
