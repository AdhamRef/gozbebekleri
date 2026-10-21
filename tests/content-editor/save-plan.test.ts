import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareEditorSave } from '../../lib/content-editor/save-plan';

test('saving a reviewed French proposal from the Arabic tab persists its captured text and review flag immediately', () => {
  const saved={ar:{title:'المصدر'},fr:{title:'Ancien titre'}};
  const p=prepareEditorSave('campaigns',saved,saved,'ar',false,{locale:'fr',values:{title:'Titre relu'},action:'translate'});
  assert.equal(p.locale,'fr');assert.equal(p.reviewed,true);
  assert.deepEqual(p.changes,{title:'Titre relu'});
  assert.deepEqual(p.localeChanges,{fr:{title:'Titre relu'}});
  assert.equal(saved.fr.title,'Ancien titre');
});
test('review-only saves still target their language after every proposal field was applied to the draft', () => {
  const saved={ar:{title:'المصدر'},de:{title:'Geprüfter Text'}};
  const p=prepareEditorSave('blog',saved,saved,'ar',false,{locale:'de',values:{},action:'review-translation'});
  assert.equal(p.locale,'de');assert.equal(p.reviewed,true);assert.deepEqual(p.changes,{});
});
test('proposal saves preserve other drafts and ignore the protected Arabic image field', () => {
  const saved={ar:{title:'المصدر',image:'original'},fr:{title:'Titre',description:'Ancien'},en:{title:'Old'}};
  const p=prepareEditorSave('campaigns',saved,{...saved,ar:{...saved.ar,image:'excluded'},fr:{...saved.fr,description:'Draft'},en:{title:'Draft English'}},'ar',false,{locale:'fr',values:{title:'Relu'},action:'translate'});
  assert.deepEqual(p.localeChanges,{fr:{title:'Relu',description:'Draft'},en:{title:'Draft English'}});
});
