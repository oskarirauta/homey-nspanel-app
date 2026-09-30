const assert=require('assert');const fs=require('fs');const vm=require('vm');
const scripts=[...fs.readFileSync('settings/index.html','utf8').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);scripts.forEach(s=>new vm.Script(s));new vm.Script(fs.readFileSync('settings/studio-ux.js','utf8'));
const code=fs.readFileSync('settings/studio-save.js','utf8');new vm.Script(code);
assert(fs.readFileSync('settings/index.html','utf8').includes('<script src="studio-save.js"></script>')); 
const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{id,dataset:{},style:{},checked:true,textContent:'',disabled:false,replaceChildren(){},append(){}});return elements.get(id);};
const requests=[],calls=[];
const HomeyStub={language:'en',__(key){return key;},api(method,path,payload,callback){calls.push({method,path,payload});requests.push(callback);}};const ctx={console,setTimeout,clearTimeout,Map,JSON,Promise,Element:class{},Homey:HomeyStub,selectedDeviceId:'panel-a',selectedPageId:'active',currentPages:{active:{type:'grid',title:'A',slots:{}},other:{type:'grid',title:'B',slots:{}}},currentScreensaverConfig:{brightness:80,statusIcon1:{},statusIcon2:{}},studioBindings:{indoor:{source:'flow'},outdoor:{source:'flow'},buttons:{}},devices:[{id:'panel-a',pages:{}}],loadStudioDeviceData(){ctx.selectedDeviceId=el('device-select').value;ctx.currentPages={active:{type:'grid',title:'Loaded',slots:{}}};ctx.currentScreensaverConfig={brightness:50};ctx.studioBindings={indoor:{source:'internal'}};ctx.selectedPageId='active';},confirmCreateNewPage(){},switchTab(){},renderUI(){},updatePageDropdown(){},loadSelectedPage(){},loadGlobalWeatherSettings(){},getPanelInputErrors(){return new Map();},renderStudioDeviceStatus(){},refreshStudioDeviceStatus(){},document:{getElementById:el,querySelectorAll:()=>[],createElement:node,addEventListener(){}},window:{addEventListener(){},Homey:HomeyStub}};
for(const name of ['applyPreset','applyPowerDefaults','clearPowerNode','setPowerNodeIcon','setPowerNodeColor','setIcon','setScreensaverIcon','updateCurrentSlot'])ctx.window[name]=()=>{};
vm.createContext(ctx);vm.runInContext(code,ctx);
async function tick(){await new Promise(resolve=>setImmediate(resolve));}
(async()=>{
 vm.runInContext("studioDrafts.set('panel-b',{dirty:new Map([['active',1]])});updateStudioSaveState()",ctx);
 assert(el('studio-save-hint').textContent.includes('other_drafts') || el('studio-save-hint').textContent.includes('Muilla paneeleilla'));
 assert(el('studio-save-state').textContent.includes('Ei tallentamattomia'));
 vm.runInContext("studioDrafts.delete('panel-b');updateStudioSaveState()",ctx);
 assert(el('studio-save-hint').textContent.includes('save_scope_panel') || el('studio-save-hint').textContent.includes('hint_no_changes') || el('studio-save-hint').textContent.includes('eivät tallennu automaattisesti'));
 vm.runInContext("markStudioDirty('active');markStudioDirty('other')",ctx);
 const save=ctx.saveStudioChanges();assert.equal(requests.length,1);assert.equal(calls[0].payload.id,'other');assert.equal(calls[0].payload.showNow,false);
 requests.shift()(null,{success:true});await tick();assert.equal(calls[1].payload.id,'active');assert.equal(calls[1].payload.showNow,true);
 vm.runInContext("markStudioDirty('active')",ctx);requests.shift()(null,{success:true});await save;
 assert.equal(vm.runInContext('studioDirty.size',ctx),1,'Edits made during save remain dirty');
 const retry=ctx.saveStudioChanges();requests.shift()(new Error('offline'));await retry;assert.equal(vm.runInContext('studioDirty.size',ctx),1,'Failed save stays dirty');
 const finish=ctx.saveStudioChanges();requests.shift()(null,{success:true});await finish;assert.equal(vm.runInContext('studioDirty.size',ctx),0);
 vm.runInContext("globalWeatherConfig={location:'homey',interval:2};markGlobalWeatherDirty()",ctx);
 const shared=ctx.saveStudioChanges();assert.equal(calls.at(-1).path,'/weather-settings');
 vm.runInContext("globalWeatherConfig.interval=6;markGlobalWeatherDirty()",ctx);requests.shift()(null,{});await shared;
 assert(vm.runInContext('globalWeatherDirty>0',ctx),'Concurrent global edit must stay dirty');
 const sharedFail=ctx.saveStudioChanges();requests.shift()(new Error('offline'));await sharedFail;assert(vm.runInContext('globalWeatherDirty>0',ctx));
 const sharedRetry=ctx.saveStudioChanges();requests.shift()(null,{});await sharedRetry;assert.equal(vm.runInContext('globalWeatherDirty',ctx),0);
 // Switching panels restores each panel's unsaved pages, settings and source bindings.
 ctx.currentPages.active.title='Panel A draft';ctx.currentScreensaverConfig.brightness=61;
 ctx.studioBindings.indoor={source:'flow'};
 vm.runInContext("markStudioDirty('active');markStudioDirty('screensaver')",ctx);
 el('device-select').value='panel-b';ctx.onDeviceChange();
 assert.equal(ctx.selectedDeviceId,'panel-b');assert.equal(vm.runInContext('studioDirty.size',ctx),0);
 ctx.currentPages.active.title='Panel B draft';vm.runInContext("markStudioDirty('active')",ctx);
 let switchRenders=0;const previousLoadSelectedPage=ctx.loadSelectedPage;
 ctx.loadSelectedPage=()=>{switchRenders++;assert.equal(ctx.currentPages.active.title,'Panel A draft');assert.equal(ctx.studioBindings.indoor.source,'flow');};
 el('device-select').value='panel-a';ctx.onDeviceChange();
 assert.equal(switchRenders,1,'Render only after the correct panel draft and sources have been restored');ctx.loadSelectedPage=previousLoadSelectedPage;
 assert.equal(ctx.currentPages.active.title,'Panel A draft');
 assert.equal(ctx.currentScreensaverConfig.brightness,61);assert.equal(ctx.studioBindings.indoor.source,'flow');
 assert.equal(vm.runInContext('studioDirty.size',ctx),2);
 assert(el('studio-save-hint').textContent.includes('other_drafts') || el('studio-save-hint').textContent.includes('Muilla paneeleilla'));
 el('device-select').value='panel-b';ctx.onDeviceChange();
 assert.equal(ctx.currentPages.active.title,'Panel B draft');assert.equal(vm.runInContext('studioDirty.size',ctx),1);
 // Pending deletions are pane-local, reversible and only sent on Save.
 ctx.selectedDeviceId='panel-a';ctx.selectedPageId='other';
 ctx.currentPages={active:{title:'Home'},other:{title:'Other'}};
 ctx.devices[0].pages=JSON.parse(JSON.stringify(ctx.currentPages));
 vm.runInContext("studioDirty=new Map();studioDeletions=new Map();studioDrafts.clear();studioDraftDevice='panel-a'",ctx);
 const beforeDelete=calls.length;
 ctx.queueStudioDeletion();assert.equal(calls.length,beforeDelete);
 assert(ctx.currentPages.other);assert.equal(vm.runInContext('studioDeletions.size',ctx),1);
 el('device-select').value='panel-b';ctx.onDeviceChange();
 assert.equal(vm.runInContext('studioDeletions.size',ctx),0);
 el('device-select').value='panel-a';ctx.onDeviceChange();
 assert.equal(vm.runInContext('studioDeletions.size',ctx),1);
 ctx.undoStudioDeletion('other');assert.equal(vm.runInContext('studioDeletions.size',ctx),0);
 ctx.queueStudioDeletion('other');
 const failedDelete=ctx.saveStudioChanges();assert.equal(calls.at(-1).method,'DELETE');
 requests.shift()(new Error('offline'));await failedDelete;
 assert(ctx.currentPages.other);assert.equal(vm.runInContext('studioDeletions.size',ctx),1);
 assert(el('studio-save-state').textContent.includes('offline') || el('studio-save-state').textContent.includes('save_failed'));
 const deleteRetry=ctx.saveStudioChanges();requests.shift()(null,{success:true});await deleteRetry;
 assert(!ctx.currentPages.other);assert(!ctx.devices[0].pages.other);assert.equal(vm.runInContext('studioDeletions.size',ctx),0);
 ctx.queueStudioDeletion('active');assert.equal(vm.runInContext('studioDeletions.size',ctx),0,'Last page is protected');
 ctx.currentPages.fresh={title:'New'};vm.runInContext("markStudioDirty('fresh')",ctx);
 ctx.queueStudioDeletion('fresh');const beforeFresh=calls.length;await ctx.saveStudioChanges();
 assert.equal(calls.length,beforeFresh,'Unsaved new page never needs DELETE');assert(!ctx.currentPages.fresh);
 ctx.currentPages.renamed={title:'Renamed',_renameFrom:'old'};ctx.devices[0].pages.old={title:'Old'};
 ctx.queueStudioDeletion('renamed');const renameDelete=ctx.saveStudioChanges();
 assert(calls.at(-1).path.endsWith('/page/old'),'Delete the persisted name, not unsaved rename');
 requests.shift()(null,{success:true});await renameDelete;assert(!ctx.currentPages.renamed);
 ctx.currentPages.linked={title:'Linked'};ctx.currentPages.active.navigation={leading:{target:'linked'}};
 ctx.queueStudioDeletion('linked');assert.equal(vm.runInContext('studioDeletions.size',ctx),0);
 assert(el('studio-save-state').textContent.includes('linkit'));
 delete ctx.currentPages.active.navigation;
 ctx.currentPages.first={title:'First'};ctx.currentPages.second={title:'Second'};
 ctx.devices[0].pages.first={};ctx.devices[0].pages.second={};ctx.selectedPageId='first';
 ctx.queueStudioDeletion('first');ctx.queueStudioDeletion('second');
 const partialDelete=ctx.saveStudioChanges();requests.shift()(null,{});await tick();
 requests.shift()(new Error('second failed'));await partialDelete;
 assert(!ctx.currentPages.first);assert(ctx.currentPages.second);assert(ctx.currentPages[ctx.selectedPageId]);
 assert.equal(vm.runInContext('studioDeletions.size',ctx),1,'Only failed deletion remains queued');
 ctx.undoStudioDeletion('second');
 assert.equal(vm.runInContext('studioDeletions.size',ctx),1,'Uncertain server deletion cannot be undone locally');
 const completePartial=ctx.saveStudioChanges();requests.shift()(null,{});await completePartial;
 ctx.currentPages.second={title:'Second'};ctx.devices[0].pages.second={};
 // A timed-out deletion remains pending; its late response cannot clear the draft.
 let expire;const realSetTimeout=ctx.setTimeout;const realClearTimeout=ctx.clearTimeout;
 ctx.setTimeout=fn=>{expire=fn;return 1;};ctx.clearTimeout=()=>{};
 ctx.queueStudioDeletion('second');const timeoutDelete=ctx.saveStudioChanges();
 expire();await timeoutDelete;requests.shift()(null,{});
 assert.equal(vm.runInContext('studioDeletions.size',ctx),1);assert(ctx.currentPages.second);
 ctx.setTimeout=realSetTimeout;ctx.clearTimeout=realClearTimeout;
 const previousQuery=ctx.document.querySelectorAll;
 ctx.document.querySelectorAll=selector=>selector.includes('input[type=')?[{checkValidity:()=>false,reportValidity(){}}]:[];
 ctx.selectedPageId='screensaver';vm.runInContext("markStudioDirty('screensaver')",ctx);
 const beforeInvalidSave=calls.length;await ctx.saveStudioChanges();
 assert.equal(calls.length,beforeInvalidSave);assert(el('studio-save-state').textContent.includes('save_failed') || el('studio-save-state').textContent.includes('lukuarvo') || el('studio-save-state').textContent.includes('kellonaika'));
 ctx.document.querySelectorAll=previousQuery;
 ctx.selectedPageId='active';const previousErrors=ctx.getPanelInputErrors;
 ctx.getPanelInputErrors=()=>new Map([['ss-night-mode-start',{value:''}]]);
 const beforeHiddenError=calls.length;await ctx.saveStudioChanges();assert.equal(calls.length,beforeHiddenError);
 assert(el('studio-save-state').textContent.includes('save_failed') || el('studio-save-state').textContent.includes('Paneelin toiminnot') || el('studio-save-state').textContent.includes('panel_settings'));
 ctx.getPanelInputErrors=previousErrors;
 console.log('Studio: syntax, multi-page save, failed save and concurrent edits passed');
})().catch(e=>{console.error(e);process.exitCode=1;});

const diagnosticSource=fs.readFileSync('settings/studio-ux.js','utf8').split('function bindingDiagnostic')[1].split('function updateLinkDiagnostics')[0];
const diagnose=vm.runInNewContext('(function bindingDiagnostic'+diagnosticSource.trim()+')');
const binding={deviceId:'d',capabilityId:'onoff'};
assert.equal(diagnose(binding,[],'error').state,'error');
assert.equal(diagnose(binding,[],'ready').state,'error');
assert.equal(diagnose(binding,[{id:'d',available:false,capabilities:[]}],'ready').state,'error');
assert.equal(diagnose(binding,[{id:'d',capabilities:[]}],'ready').state,'error');
assert.equal(diagnose(binding,[{id:'d',capabilities:[{id:'onoff',value:false}]}],'ready').state,'ok');

const policySource=fs.readFileSync('settings/studio-ux.js','utf8').split('function sourcePolicyText')[1].split('const sourceEditorBeforeDiagnostics')[0];
const policy=vm.runInNewContext('(function sourcePolicyText'+policySource.trim()+')');
assert(policy('homey','light').includes('Homey'));
assert(policy('flow','light').includes('Flow'));
assert(policy('fixed','power').includes('aloitusarvo'));

// Source selection is transactional: opening/cancelling the picker is not an edit.
const html=fs.readFileSync('settings/index.html','utf8');
const sources=fs.readFileSync('settings/studio-sources.js','utf8');
new vm.Script(sources);
assert(html.includes('<script src="studio-sources.js"></script>'));
assert(html.indexOf('<script src="studio-sources.js"></script>') < html.indexOf('<script src="studio-save.js"></script>'));
const sourceCode=sources.split('function sourceEditor(')[1].split('function closeHomeyPicker')[0];
let sourceDirty=0, accepted;
function node(tag){return {tag,dataset:{},children:[],append(...children){this.children.push(...children);},setAttribute(){}};}
const sourceCtx={document:{createElement:node},pickerDevices:[],currentPages:{active:{}},markStudioDirty(){sourceDirty++;},openHomeyPicker(_kind,accept){accepted=accept;}};
const renderSource=vm.runInNewContext('(function sourceEditor('+sourceCode.trim()+')',sourceCtx);
for(const [kind,binding,expected] of [['light',undefined,'flow'],['power',undefined,'fixed'],['slot',{source:'relay',relay:2},'relay2']]){
 const parent=node('parent');let changed=0;
 renderSource(parent,binding,kind,()=>changed++);
 const box=parent.children[0], select=box.children.find(child=>child.tag==='select');
 assert.equal(select.value,expected);assert.equal(box.dataset.source,expected);
 select.value='homey';select.onchange();
 assert.equal(select.value,expected);assert.equal(changed,0);assert.equal(sourceDirty,0);
}
accepted({source:'homey',deviceId:'lamp'});assert.equal(sourceDirty,1);
assert(code.includes("if(target.matches('[data-source-control]'))return;"), 'Only source selectors handle dirty state themselves; power fields still use normal tracking');

// Copying an unsaved rename must not rename/delete the original server page.
const pageModule=fs.readFileSync('settings/studio-pages.js','utf8');
new vm.Script(pageModule);
assert(html.includes('<script src="studio-pages.js"></script>'));
assert(html.indexOf('src="studio-pages.js"')<html.indexOf('// App State'));
const duplicateCode=pageModule.split('function duplicateCurrentPage()')[1].split('// --- Inline Modal for Delete Page ---')[0];
const copyDirty=[];
const copyCtx={selectedPageId:'renamed',currentPages:{renamed:{title:'Room',_renameFrom:'old',slots:{1:{id:'lamp',binding:{source:'homey',deviceId:'lamp'}}}}},updatePageDropdown(){},loadSelectedPage(){},markStudioDirty(id){copyDirty.push(id);}};
vm.createContext(copyCtx);
vm.runInContext('(function duplicateCurrentPage()'+duplicateCode.trim()+')()',copyCtx);
assert.equal(copyCtx.currentPages.renamed._renameFrom,'old');
assert.equal(copyCtx.currentPages.renamed_copy._renameFrom,undefined);
assert.equal(copyCtx.currentPages.renamed_copy.slots[1].binding.deviceId,'lamp');
copyCtx.currentPages.renamed_copy.slots[1].binding.deviceId='other';
assert.equal(copyCtx.currentPages.renamed.slots[1].binding.deviceId,'lamp');
assert.deepEqual(copyDirty,['renamed_copy']);

// Exercise page actions against their draft state without a Homey installation.
const pageElements=new Map();
const pageEl=id=>{if(!pageElements.has(id))pageElements.set(id,{value:'',textContent:'',style:{}});return pageElements.get(id);};
const pageDirty=[];
const pageCtx={currentPages:{active:{title:'Home',order:0},room:{title:'Room',order:1}},selectedPageId:'room',selectedDeviceId:'panel',devices:[{id:'panel',pages:{room:{}}}],studioSaving:false,studioDeletions:new Map(),studioDirty:new Map(),studioBindings:{buttons:{1:{source:'navigate',target:'room'}}},Homey:{language:'en',__:k=>k},document:{getElementById:pageEl},markStudioDirty:id=>pageDirty.push(id),updatePageDropdown(){},loadSelectedPage(){},renderScreen(){},renderEditor(){}};
vm.createContext(pageCtx);vm.runInContext(pageModule,pageCtx);
pageEl('page-id-input').value='bedroom';pageCtx.onPageIdChange();
assert.equal(pageCtx.currentPages.bedroom._renameFrom,'room');
assert.equal(pageCtx.studioBindings.buttons[1].target,'bedroom');assert(pageDirty.includes('screensaver'));
pageCtx.studioDeletions.set('bedroom',{});pageEl('page-id-input').value='blocked';pageCtx.onPageIdChange();assert(pageCtx.currentPages.bedroom);assert(!pageCtx.currentPages.blocked);
pageCtx.studioDeletions.clear();
pageEl('modal-page-title').value='New';pageEl('modal-page-type').value='grid';
for(const id of ['screensaver','__proto__','constructor','prototype','bad id','bedroom']) {
 pageEl('modal-page-id').value=id;const before=Object.keys(pageCtx.currentPages).join();
 pageCtx.confirmCreateNewPage();assert.equal(Object.keys(pageCtx.currentPages).join(),before);
}
pageEl('modal-page-id').value='new-page';pageCtx.confirmCreateNewPage();assert(pageCtx.currentPages['new-page']);
pageCtx.movePageUp();assert.equal(pageCtx.currentPages['new-page'].order,1);
pageCtx.movePageDown();assert.equal(pageCtx.currentPages['new-page'].order,2);
assert(pageDirty.includes('active')&&pageDirty.includes('bedroom')&&pageDirty.includes('new-page'));

// Status refresh updates only availability, preserving unsaved page data.
const statusSource=fs.readFileSync('settings/studio-status.js','utf8');new vm.Script(statusSource);
const statusCode=statusSource.split('let studioStatusTimer;')[0];
const statusBadge={};let statusReply;
const statusDraft={title:'Unsaved'};
const statusCtx={devices:[{id:'panel',available:false,pages:statusDraft}],selectedDeviceId:'panel',document:{getElementById:()=>statusBadge},Homey:{language:'fi',__:k=>k},window:{Homey:{api(_method,_path,_body,reply){statusReply=reply;}}},setTimeout,clearTimeout,Promise};
vm.createContext(statusCtx);vm.runInContext(statusCode,statusCtx);
(async()=>{
 statusCtx.renderStudioDeviceStatus();assert.ok(statusBadge.textContent==='Offline'||statusBadge.textContent==='studio.status.offline','Initial offline status');
 const request=statusCtx.refreshStudioDeviceStatus();
 assert.strictEqual(statusCtx.refreshStudioDeviceStatus(),request,'Coalesce concurrent status requests');
 statusReply(null,[{id:'panel',available:true,pages:{title:'Stored'}}]);await request;
 assert.ok(statusBadge.textContent==='Yhdistetty'||statusBadge.textContent==='studio.status.connected','Online status after reply');assert.strictEqual(statusCtx.devices[0].pages,statusDraft);
 const failed=statusCtx.refreshStudioDeviceStatus();statusReply(new Error('network'));await failed;
 assert.ok(statusBadge.textContent==='Tilaa ei voitu tarkistaa'||statusBadge.textContent.includes('studio.status.'),'Error status after network failure');assert.equal(statusCtx.devices[0].available,true);
 const offline=statusCtx.refreshStudioDeviceStatus();statusReply(null,[{id:'panel',available:false}]);await offline;
 assert.ok(statusBadge.textContent==='Offline'||statusBadge.textContent==='studio.status.offline','Offline status after device unavailable');
})().catch(error=>{console.error(error);process.exitCode=1;});

// Card editors retain their source callbacks after being loaded from a separate file.
const cardCode=fs.readFileSync('settings/studio-card-bindings.js','utf8');new vm.Script(cardCode);
assert(html.includes('<script src="studio-card-bindings.js"></script>'));
assert(html.indexOf('src="studio-card-bindings.js"')<html.indexOf('// App State'));
const cardElements=new Map();
const cardEl=id=>{if(!cardElements.has(id))cardElements.set(id,{value:'',remove(){},prepend(){},append(){},closest(){return this;}});return cardElements.get(id);};
let cardAccept,cardKind,cardDirty=0,cardRenders=0;
const cardCtx={currentPages:{card:{title:'Card',rawOptions:{}}},selectedPageId:'card',document:{getElementById:cardEl,createElement:()=>({append(){}})},Homey:{language:'fi',__:k=>k},sourceEditor(_parent,_binding,kind,accept){cardKind=kind;cardAccept=(...args)=>{accept(...args);cardDirty++;};},markStudioDirty(){cardDirty++;},renderScreen(){cardRenders++;},loadChartConfig(){},openStudioSettings(){}};
vm.createContext(cardCtx);vm.runInContext(cardCode,cardCtx);
for(const [render,kind] of [['renderThermoBinding','thermostat'],['renderMediaBinding','media'],['renderAlarmBinding','alarm'],['renderChartBinding','chart']]){
 cardCtx.currentPages.card={title:'Card',rawOptions:{}};cardCtx[render]();assert.equal(cardKind,kind);
 const before=cardDirty;cardAccept({source:'homey',deviceId:'device'},{name:'Linked',capabilities:[]});
 assert.equal(cardCtx.currentPages.card.rawOptions.binding.deviceId,'device');assert(cardDirty>before);
 cardAccept({source:'flow'});assert.equal(cardCtx.currentPages.card.rawOptions.binding.source,'flow');
}
cardCtx.currentPages.card={title:'Weather',rawOptions:{binding:{source:'met'},chartSource:'met'}};
cardCtx.renderChartBinding();cardAccept({source:'flow'});
assert.equal(cardCtx.currentPages.card.rawOptions.chartSource,undefined,'Flow selection must stop MET chart sourcing');
assert(cardRenders>=9);

const slotBindingCode=fs.readFileSync('settings/studio-slot-bindings.js','utf8');new vm.Script(slotBindingCode);
assert(html.includes('<script src="studio-slot-bindings.js"></script>'));
assert(html.indexOf('src="studio-slot-bindings.js"')<html.indexOf('// App State'));
assert(slotBindingCode.includes('function renderSlotBinding()'));
assert(slotBindingCode.includes('function renderPowerBinding(home=false)'));
assert(!html.includes('onclick="refreshStudioDeviceStatus()"'),'Status is observed automatically, not a promise of an immediate panel probe');

const panelSettingsCode=fs.readFileSync('settings/studio-panel-settings.js','utf8');new vm.Script(panelSettingsCode);
assert(html.indexOf('src="studio-panel-settings.js"')>html.indexOf('src="studio-sources.js"'));
assert(html.indexOf('src="studio-panel-settings.js"')<html.indexOf('src="studio-save.js"'));

// Bootstrap once after modules load; late Homey readiness must not reset drafts.
const initCode=fs.readFileSync('settings/studio-init.js','utf8');
assert(html.indexOf('src="studio-init.js"')>html.indexOf('src="studio-status.js"'));
const initCalls=[];
const initCtx={window:{Homey:{}},document:{getElementById:()=>null},console,renderUI:()=>initCalls.push('render'),updateStudioSaveState:()=>initCalls.push('save'),loadDevices:()=>initCalls.push('devices'),loadGlobalMqttSettings:()=>initCalls.push('mqtt'),loadGlobalWeatherSettings:()=>initCalls.push('weather'),startStudioStatusPolling:()=>initCalls.push('status')};
vm.createContext(initCtx);vm.runInContext(initCode,initCtx);
assert.deepEqual(initCalls,['render','save']);
initCtx.window.Homey={ready(){initCalls.push('ready');},api(){}};
initCtx.startStudio();initCtx.startStudio();
assert.deepEqual(initCalls,['render','save','ready','devices','mqtt','weather','status']);

// A missing page must not fall through a wrapper into binding editor rendering.
const energyModule=fs.readFileSync('settings/studio-energy.js','utf8');new vm.Script(energyModule);
assert(html.includes('<script src="studio-energy.js"></script>'));
const editorLoadSource=name=>{
 const editorSource=html.includes('    function '+name+'(')?html:energyModule;
 const start=editorSource.indexOf('    function '+name+'(');
 const end=editorSource.indexOf('\n    function ',start+10);
 return editorSource.slice(start,editorSource.lastIndexOf('\n    }',end<0?editorSource.length:end)+6);
};
let editorBindingRenders=0;
const editorCtx={currentPages:{},selectedPageId:'missing',renderSlotBinding(){editorBindingRenders++;},renderPowerBinding(){editorBindingRenders++;}};
vm.createContext(editorCtx);
for(const name of ['loadSlotDetail','loadPowerConfig','loadPowerNodeDetail']){
 vm.runInContext(editorLoadSource(name),editorCtx);editorCtx[name](0);
}
assert.equal(editorBindingRenders,0);

// Preserve zero night timeout when another setting is edited; reject invalid drafts.
const timeoutFields=new Map();
const timeoutEl=id=>{if(!timeoutFields.has(id))timeoutFields.set(id,{value:'',checked:false});return timeoutFields.get(id);};
const timeoutCtx={selectedDeviceId:'panel-a',document:{getElementById:timeoutEl},currentScreensaverConfig:{night_sleep_timeout:15},selectedPageId:'active',Homey:{language:'en',__:k=>k}};
vm.createContext(timeoutCtx);vm.runInContext(panelSettingsCode,timeoutCtx);vm.runInContext(editorLoadSource('updateScreensaverConfig'),timeoutCtx);
timeoutEl('ss-night-sleep-timeout').value='0';timeoutCtx.updateScreensaverConfig();
assert.equal(timeoutCtx.currentScreensaverConfig.night_sleep_timeout,0);
for(const value of ['', 'NaN', 'Infinity', '-1', '301']){
 timeoutEl('ss-night-sleep-timeout').value=value;timeoutCtx.updateScreensaverConfig();
 assert.equal(timeoutCtx.currentScreensaverConfig.night_sleep_timeout,0);
}
timeoutEl('ss-night-sleep-timeout').value='30';timeoutCtx.updateScreensaverConfig();assert.equal(timeoutCtx.currentScreensaverConfig.night_sleep_timeout,30);

for(const [id,key,min,max] of [['ss-brightness','brightness',1,100],['ss-sleep-timeout','sleep_timeout',0,300],['ss-update-interval','update_interval',25,120],['ss-night-sleep-brightness','night_sleep_brightness',0,100]]){
 timeoutCtx.currentScreensaverConfig[key]=42;
 for(const value of ['', 'Infinity', String(min-1), String(max+1)]){
  timeoutEl(id).value=value;timeoutCtx.updateScreensaverConfig();assert.equal(timeoutCtx.currentScreensaverConfig[key],42);
 }
 timeoutEl(id).value=String(min);timeoutCtx.updateScreensaverConfig();assert.equal(timeoutCtx.currentScreensaverConfig[key],min);
 timeoutEl(id).value=String(max);timeoutCtx.updateScreensaverConfig();assert.equal(timeoutCtx.currentScreensaverConfig[key],max);
}

for(const key of ['start','end']){
 const id='ss-night-mode-'+key, setting='night_mode_'+key;
 timeoutCtx.currentScreensaverConfig[setting]='21:30';
 for(const invalid of ['', '24:00', '12:60', '7:00', 'text']){
  timeoutEl(id).value=invalid;timeoutCtx.updateScreensaverConfig();
  assert.equal(timeoutCtx.currentScreensaverConfig[setting],'21:30');
 }
 for(const valid of ['00:00','23:59','07:00']){
  timeoutEl(id).value=valid;timeoutCtx.updateScreensaverConfig();
  assert.equal(timeoutCtx.currentScreensaverConfig[setting],valid);
 }
}
let clearedErrors=0;
timeoutCtx.document.querySelectorAll=()=>[{setCustomValidity(message){assert.equal(message,'');clearedErrors++;}}];
timeoutCtx.clearPanelFieldValidity();assert.equal(clearedErrors,1,'Repopulated fields must not keep errors from the previous panel');

// Invalid input survives navigation and panel switches, without contaminating another panel.
timeoutEl('ss-night-mode-start').value='';timeoutCtx.readPanelTime('ss-night-mode-start','night_mode_start');
assert(timeoutCtx.getPanelInputErrors().has('ss-night-mode-start'));
timeoutEl('ss-night-mode-start').value='22:00';timeoutCtx.clearPanelFieldValidity();
assert.equal(timeoutEl('ss-night-mode-start').value,'');
timeoutCtx.selectedDeviceId='panel-b';assert.equal(timeoutCtx.getPanelInputErrors().size,0);
timeoutCtx.selectedDeviceId='panel-a';assert(timeoutCtx.getPanelInputErrors().has('ss-night-mode-start'));
timeoutEl('ss-night-mode-start').value='21:00';timeoutCtx.readPanelTime('ss-night-mode-start','night_mode_start');
assert(!timeoutCtx.getPanelInputErrors().has('ss-night-mode-start'));

// User labels must remain text in energy editor attributes and tab markup.
const energyFields=new Map();
const energyEl=id=>{if(!energyFields.has(id))energyFields.set(id,{innerHTML:''});return energyFields.get(id);};
const energyCtx={currentPages:{active:{}},selectedPageId:'active',POWER_NODE_NAMES:['Node'],document:{getElementById:energyEl},ensurePowerOptions:()=>({nodes:[{title:'Kitchen "A" <meter>',consumption:0,icon:'a"b',color:'white'}]}),renderPowerBinding(){}};
vm.createContext(energyCtx);vm.runInContext(editorLoadSource('escapeHtml'),energyCtx);vm.runInContext(editorLoadSource('loadPowerNodeDetail'),energyCtx);
energyCtx.loadPowerNodeDetail(0);
assert(energyEl('power-node-detail').innerHTML.includes('value="Kitchen &quot;A&quot; &lt;meter&gt;"'));
assert(energyEl('power-node-detail').innerHTML.includes('value="a&quot;b"'));
assert.equal(energyCtx.escapeHtml(0),'0');assert.equal(energyCtx.escapeHtml('&<>"'), '&amp;&lt;&gt;&quot;');

// Rendering failure must never leave Homey's spinner covering the error.
const bootElements=new Map();const bootEl=id=>{if(!bootElements.has(id))bootElements.set(id,{hidden:true,textContent:''});return bootElements.get(id);};
let readyCalls=0, failRender=true, bootLoads=0;
const failedBoot={window:{Homey:{ready(){readyCalls++;},api(){}}},console:{error(){}},document:{getElementById:bootEl},renderUI(){assert.equal(readyCalls,1);if(failRender)throw new Error('editor error');},updateStudioSaveState(){},loadDevices(){bootLoads++;},loadGlobalMqttSettings(){},loadGlobalWeatherSettings(){},startStudioStatusPolling(){}};
vm.createContext(failedBoot);vm.runInContext(initCode,failedBoot);
assert.equal(readyCalls,1);assert.equal(bootEl('studio-startup-error').hidden,false);assert(bootEl('studio-startup-error-text').textContent.includes('editor error'));assert.equal(bootLoads,0);
failRender=false;failedBoot.startStudio();assert.equal(bootLoads,1);assert.equal(bootEl('studio-startup-error').hidden,true);
failedBoot.startStudio();assert.equal(readyCalls,1);assert.equal(bootLoads,1);

const cardFormsCode=fs.readFileSync('settings/studio-card-forms.js','utf8');new vm.Script(cardFormsCode);
assert(html.includes('<script src="studio-card-forms.js"></script>'));
assert(html.indexOf('src="studio-card-forms.js"')<html.indexOf('// App State'));
const formFields=new Map();
const formEl=id=>{if(!formFields.has(id))formFields.set(id,{value:'',checked:false});return formFields.get(id);};
let formDirty=0,formRenders=0;
const formCtx={currentPages:{active:{rawOptions:{}}},selectedPageId:'active',document:{getElementById:formEl},markStudioDirty(){formDirty++;},renderScreen(){formRenders++;}};
vm.createContext(formCtx);vm.runInContext(cardFormsCode,formCtx);
formEl('media-title-input').value='Track "A"';formEl('media-artist-input').value='Artist';formEl('media-vol-input').value='0';
formCtx.updateMediaConfig();assert.equal(formCtx.currentPages.active.rawOptions.volume,0);assert.equal(formCtx.currentPages.active.rawOptions.media.title,'Track "A"');
formEl('alarm-pin-code').value='0123';formEl('alarm-pin-req').checked=false;formEl('alarm-pin-for-arm').checked=false;
formCtx.updateAlarmConfig();assert.equal(formCtx.currentPages.active.rawOptions.pin,'0123');assert.equal(formCtx.currentPages.active.rawOptions.pin_required,false);assert.equal(formDirty,1);
formEl('qrcode-content-input').value='WIFI:T:WPA;S:A&B;P:secret;;';formCtx.updateQRConfig();assert.equal(formCtx.currentPages.active.rawOptions.qrcode,formEl('qrcode-content-input').value);
formCtx.selectedPageId='missing';const beforeMissing=formRenders;formCtx.updateMediaConfig();formCtx.updateAlarmConfig();formCtx.updateQRConfig();formCtx.updateThermoConfig();assert.equal(formRenders,beforeMissing);

// Preview dispatch and navigation must keep using the active editor state.
const previewCode=fs.readFileSync('settings/studio-preview.js','utf8');
const previewFields=new Map();
const previewEl=id=>{if(!previewFields.has(id))previewFields.set(id,{style:{},innerHTML:'',textContent:'',value:''});return previewFields.get(id);};
let previewLoads=0;const previewCalls=[];
const previewCtx={currentPages:{active:{title:'Home',navigation:{trailing:{target:'room'}}},room:{title:'Room',navigation:{leading:{target:'active'},trailing:{target:'screensaver'}}}},selectedPageId:'active',document:{getElementById:previewEl,querySelector:()=>previewEl('header')},loadSelectedPage(){previewLoads++;}};
vm.createContext(previewCtx);vm.runInContext(previewCode,previewCtx);
for(const name of ['Grid','Entities','Thermostat','Media','Alarm','QRCode','Power','Chart','Unlock','Screensaver'])previewCtx['render'+name+'Screen']=(_container,p)=>previewCalls.push([name,p]);
for(const [type,renderer] of Object.entries({grid:'Grid',grid2:'Grid',entities:'Entities',thermostat:'Thermostat',media:'Media',alarm:'Alarm',qrcode:'QRCode',power:'Power',chart:'Chart',unlock:'Unlock',cardUnlock:'Unlock'})){
 previewCtx.currentPages.active.type=type;previewCtx.renderScreen();
 assert.equal(previewCalls.at(-1)[0],renderer);assert.strictEqual(previewCalls.at(-1)[1],previewCtx.currentPages.active);
}
previewCtx.simulateNavigate('next');assert.equal(previewCtx.selectedPageId,'room');assert.equal(previewLoads,1);assert.equal(previewEl('page-select').value,'room');
previewCtx.simulateNavigate('next');assert.equal(previewCalls.at(-1)[0],'Screensaver');assert.equal(previewEl('header').style.display,'none');
previewCtx.simulateNavigate('prev');assert.equal(previewCtx.selectedPageId,'active');assert.equal(previewLoads,2);
previewCtx.currentPages.active.navigation.trailing.target='missing';previewCtx.simulateNavigate('next');assert.equal(previewLoads,2);
previewCtx.selectedPageId='screensaver';previewCtx.renderScreen();assert.equal(previewCalls.at(-1)[0],'Screensaver');
assert(html.indexOf('src="studio-preview.js"')<html.indexOf('src="studio-init.js"'));

// All visible presets still construct a fresh page after module extraction.
const presetsCode=fs.readFileSync('settings/studio-presets.js','utf8');
let presetLoads=0;const presetCtx={currentPages:{active:{}},selectedPageId:'active',loadSelectedPage(){presetLoads++;},document:{getElementById:()=>({style:{}})},setTimeout(){}};
vm.createContext(presetCtx);vm.runInContext(presetsCode,presetCtx);
const presetNames=[...html.matchAll(/applyPreset\('([^']+)'\)/g)].map(m=>m[1]);
assert(presetNames.length>=16);
for(const name of presetNames){
 presetCtx.applyPreset(name);const first=presetCtx.currentPages.active;
 assert(first.type&&first.title, name);presetCtx.applyPreset(name);
 assert.notStrictEqual(presetCtx.currentPages.active,first,name+' must create fresh state');
}
assert.equal(presetLoads,presetNames.length*2);
presetCtx.applyPreset('weather');assert.equal(presetCtx.currentPages.active.rawOptions.weatherForecast,true);
presetCtx.applyPreset('chart_weather');assert.equal(presetCtx.currentPages.active.rawOptions.binding.source,'met');
presetCtx.applyPreset('timer');assert.equal(presetCtx.currentPages.active.slots[1].durationSeconds,300);

const mqttCode=fs.readFileSync('settings/studio-mqtt.js','utf8');const mqttFields=new Map();
const mqttEl=id=>{if(!mqttFields.has(id))mqttFields.set(id,{style:{},value:'',checked:false,textContent:''});return mqttFields.get(id);};
let mqttRequest;const mqttWrites=[];
const mqttCtx={window:{Homey:{set(key,value,cb){mqttWrites.push([key,value]);if(cb)cb(null);},api(method,url,body,cb){mqttRequest={method,url,body,cb};}}},document:{getElementById:mqttEl},setTimeout(){},clearTimeout(){}};
vm.createContext(mqttCtx);vm.runInContext(mqttCode,mqttCtx);
mqttEl('mode_standalone').checked=true;mqttCtx.onGlobalMqttModeChange();assert.equal(mqttEl('global_broker_fields').style.display,'block');
mqttCtx.testGlobalMqtt();assert.equal(mqttRequest,undefined,'Empty host must not call API');
mqttEl('cfg_host').value=' broker.local ';mqttEl('cfg_port').value='1884';mqttEl('cfg_user').value=' user ';mqttEl('cfg_password').value=' secret ';
mqttCtx.testGlobalMqtt();assert.equal(mqttRequest.url,'/test-mqtt');assert.equal(mqttRequest.body.port,1884);assert.equal(mqttRequest.body.password,' secret ');assert.equal(mqttEl('btn_test_global_mqtt').disabled,true);
mqttRequest.cb(new Error('offline'));assert.equal(mqttEl('btn_test_global_mqtt').disabled,false);assert(mqttEl('global_mqtt_test_status').textContent.includes('offline'));
mqttCtx.saveGlobalMqttSettings();assert.equal(mqttWrites.length,5);assert.equal(mqttWrites.find(([key])=>key==='mqtt_host')[1],'broker.local');assert(mqttEl('global_mqtt_save_status').textContent.includes('onnistuneesti'));
for(const module of ['studio-presets.js','studio-mqtt.js'])assert(html.indexOf('src="'+module+'"')<html.indexOf('src="studio-save.js"'));

presetCtx.currentPages.active={order:0,_renameFrom:'old-page'};presetCtx.applyPreset('alarm');
assert.equal(presetCtx.currentPages.active.order,0);assert.equal(presetCtx.currentPages.active._renameFrom,'old-page');assert.equal(presetCtx.currentPages.active.rawOptions.binding.source,'flow');
const protectedPreset=presetCtx.currentPages.active;
presetCtx.studioDeletions=new Map([['active',{}]]);assert.equal(presetCtx.applyPreset('lights'),false);assert.strictEqual(presetCtx.currentPages.active,protectedPreset);
presetCtx.studioDeletions.clear();presetCtx.studioSaving=true;assert.equal(presetCtx.applyPreset('lights'),false);assert.strictEqual(presetCtx.currentPages.active,protectedPreset);
presetCtx.studioSaving=false;assert.equal(presetCtx.applyPreset('unknown'),false);assert.strictEqual(presetCtx.currentPages.active,protectedPreset);
for(const invalid of ['', '0', '-1', '65536', '1883abc', '1.5', '1e3', 'Infinity']){
 mqttEl('cfg_port').value=invalid;const before=mqttWrites.length;mqttRequest=undefined;
 mqttCtx.saveGlobalMqttSettings();mqttCtx.testGlobalMqtt();assert.equal(mqttWrites.length,before);assert.equal(mqttRequest,undefined);
}
mqttEl('cfg_port').value='1883';
for(const failedKey of ['mqtt_host','mqtt_port','mqtt_user','mqtt_password','mqtt_mode']){
 const calls=[];mqttCtx.window.Homey.set=(key,value,cb)=>{calls.push(key);cb(key===failedKey?new Error('failed'):null);};
 mqttCtx.saveGlobalMqttSettings();assert.equal(calls.at(-1),failedKey);assert(mqttEl('global_mqtt_save_status').textContent.includes('ei voitu vahvistaa'));
}
let lateMqttCallback,timeoutMqttCallback;let pendingMqttWrites=0;
mqttCtx.setTimeout=cb=>{timeoutMqttCallback=cb;return 1;};
mqttCtx.window.Homey.set=(_key,_value,cb)=>{pendingMqttWrites++;lateMqttCallback=cb;};
mqttCtx.saveGlobalMqttSettings();mqttCtx.saveGlobalMqttSettings();assert.equal(pendingMqttWrites,1);
timeoutMqttCallback();lateMqttCallback(null);assert.equal(pendingMqttWrites,1);assert(mqttEl('global_mqtt_save_status').textContent.includes('ei voitu vahvistaa'));
mqttCtx.setTimeout=()=>1;
mqttCtx.window.Homey.set=()=>{throw new Error('sync failure');};mqttCtx.saveGlobalMqttSettings();assert(mqttEl('global_mqtt_save_status').textContent.includes('ei voitu vahvistaa'));
const recoveredWrites=[];mqttCtx.window.Homey.set=(key,value,cb)=>{recoveredWrites.push([key,value]);cb(null);};mqttCtx.saveGlobalMqttSettings();assert.equal(recoveredWrites.length,5);assert(mqttEl('global_mqtt_save_status').textContent.includes('onnistuneesti'));
mqttEl('mode_standalone').checked=false;mqttEl('cfg_port').value='';recoveredWrites.length=0;mqttCtx.saveGlobalMqttSettings();assert.equal(recoveredWrites.length,1);assert.equal(recoveredWrites[0][0],'mqtt_mode');assert.equal(recoveredWrites[0][1],'scanno');

formCtx.selectedPageId='active';formCtx.currentPages.active.rawOptions={target:0,current:0,min:0,max:30};
for(const [key,value] of [['target','0'],['current','-5.5'],['min','0'],['max','30']])formEl('thermo-'+key+'-input').value=value;
formCtx.updateThermoConfig();assert.equal(formCtx.currentPages.active.rawOptions.target,0);assert.equal(formCtx.currentPages.active.rawOptions.current,-5.5);assert.equal(formCtx.currentPages.active.rawOptions.min,0);
for(const invalid of ['', '12abc', 'Infinity', 'NaN']){
 formEl('thermo-target-input').value=invalid;formCtx.updateThermoConfig();assert.equal(formCtx.currentPages.active.rawOptions.target,0);
 formEl('media-vol-input').value=invalid;formCtx.currentPages.active.rawOptions.volume=25;formCtx.updateMediaConfig();assert.equal(formCtx.currentPages.active.rawOptions.volume,25);
}
for(const invalid of ['-1','101']){formEl('media-vol-input').value=invalid;formCtx.updateMediaConfig();assert.equal(formCtx.currentPages.active.rawOptions.volume,25);}
formEl('thermo-target-input').value='0';formCtx.stepThermostat(0.5);assert.equal(formCtx.currentPages.active.rawOptions.target,0.5);
formCtx.stepThermostat(-0.5);assert.equal(formCtx.currentPages.active.rawOptions.target,0);
