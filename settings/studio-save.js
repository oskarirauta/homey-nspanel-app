// Explicit saves: drafts are isolated by panel; edits made during a request stay dirty.
let globalWeatherConfig={location:'homey',interval:1};
let globalWeatherLoaded=!window.Homey?.api;
let globalWeatherLoadError='';
let globalWeatherDirty=0, globalWeatherRevision=0;
function markGlobalWeatherDirty(){globalWeatherDirty=++globalWeatherRevision;studioSaveMessage='';updateStudioSaveState();}
let studioDirty = new Map();
let studioDeletions = new Map();
let studioRevision = 0;
let studioSaving = false;
let studioSaveMessage = '';
let studioDraftDevice = selectedDeviceId;
const studioDrafts = new Map();
const cloneStudio = value => JSON.parse(JSON.stringify(value));
// Pending pages remain visible and reserve their IDs until deletion succeeds.
function studioDeletionError(id) {
  if(id==='screensaver'||!currentPages[id])return Homey.__('studio.save.page_not_found');
  if(Object.keys(currentPages).filter(key=>key!==id&&!studioDeletions.has(key)).length===0)return Homey.__('studio.save.last_page');
  const linked=[];
  for(const [key,page] of Object.entries(currentPages)) {
    if(key===id || studioDeletions.has(key))continue;
    const navigation=Object.values(page.navigation||{}).some(side=>side?.target===id);
    const slot=Object.values(page.slots||{}).some(slot=>slot.binding?.source==='navigate'&&slot.binding.target===id || slot.type==='navigate'&&['id','name','target'].some(field=>slot[field]===id));
    if(navigation||slot)linked.push(page.title||key);
  }
  if(Object.values(studioBindings.buttons||{}).some(b=>b.source==='navigate'&&b.target===id))linked.push('paneelin painikkeet');
  return linked.length?'Muuta ensin poistettavaan sivuun osoittavat linkit: '+linked.join(', ')+'.':'';
}
function queueStudioDeletion(id=selectedPageId) {
  if(studioSaving || studioDeletions.has(id))return;
  const error=studioDeletionError(id);
  if(error){studioSaveMessage=error;updateStudioSaveState();return;}
  const page=currentPages[id];
  const stored=devices.find(d=>d.id===selectedDeviceId)?.pages||{};
  studioDeletions.set(id,{serverId:page._renameFrom || (stored[id]?id:undefined)});
  studioSaveMessage='Sivun poisto odottaa tallennusta.';
  updatePageDropdown();updateStudioSaveState();
}
function undoStudioDeletion(id) {
  if(studioSaving || studioDeletions.get(id)?.attempted)return;
  studioDeletions.delete(id);studioSaveMessage='Poisto peruttu.';
  updatePageDropdown();updateStudioSaveState();
}
function renderStudioDeletions() {
  const list=document.getElementById('studio-pending-deletions');
  if(!list)return;
  list.replaceChildren();list.hidden=!studioDeletions.size;
  for(const [id,deletion] of studioDeletions){
    const row=document.createElement('div');
    const label=document.createElement('span');label.textContent=`Poistetaan tallennettaessa: ${currentPages[id]?.title||id} (${id}). `;
    const undo=document.createElement('button');undo.type='button';undo.className='btn btn-sm';undo.textContent='Peru poisto';undo.disabled=studioSaving||Boolean(deletion.attempted);undo.onclick=()=>undoStudioDeletion(id);
    row.append(label,undo);
    if(deletion.attempted){const note=document.createElement('small');note.textContent=' '+Homey.__('studio.save.delete_pending_note');row.append(note);}
    list.append(row);
  }
}
function markStudioDirty(pageId=selectedPageId) {
  if (!pageId || (pageId!=='screensaver' && !currentPages[pageId])) return;
  studioDirty.set(pageId, ++studioRevision);
  studioSaveMessage='';updateStudioSaveState();
}
function updateStudioSaveState() {
  const count=studioDirty.size+studioDeletions.size+(globalWeatherDirty?1:0);
  const viewCount=Array.from(studioDirty.keys()).filter(id=>id!=='screensaver').length;
  const dirtyLabels=[viewCount?viewCount+' '+Homey.__('studio.save.views_changed')+(viewCount===1?'':Homey.__('studio.save.views_plural')):'',studioDirty.has('screensaver')?Homey.__('studio.save.panel_settings'):'',globalWeatherDirty?Homey.__('studio.save.shared_weather'):'',studioDeletions.size?studioDeletions.size+' '+Homey.__('studio.save.page_deletion'):''].filter(Boolean).join(' + ');
  document.getElementById('device-select').disabled=studioSaving;
  renderStudioDeletions();
  const bar=document.getElementById('studio-savebar');
  if(!bar)return;
  bar.dataset.dirty=String(count>0);
  document.getElementById('studio-save-state').textContent=studioSaving?'Tallennetaan…':studioSaveMessage || (count?`Tallentamatta: ${dirtyLabels}`:'Ei tallentamattomia muutoksia');
  const otherDrafts = Array.from(studioDrafts.entries()).filter(([id, draft]) => id !== selectedDeviceId && (draft.dirty.size || draft.deletions?.size));
  const scope = globalWeatherDirty ? Homey.__('studio.save.save_scope_global') : Homey.__('studio.save.save_scope_panel');
  document.getElementById('studio-save-hint').textContent = scope + (otherDrafts.length ? ' '+Homey.__('studio.save.other_drafts').replace('{0}',otherDrafts.length) : '');
  document.querySelectorAll('.studio-save').forEach(button=>{button.disabled=studioSaving || !count;button.textContent=studioSaving?'Tallennetaan…':'💾 Tallenna muutokset';});
}
function rememberStudioDraft() {
  if(studioDraftDevice)studioDrafts.set(studioDraftDevice, {pages:cloneStudio(currentPages), config:cloneStudio(currentScreensaverConfig), bindings:cloneStudio(studioBindings), dirty:studioDirty, deletions:studioDeletions, selected:selectedPageId});
}
function onDeviceChange() {
  if(studioSaving)return;
  rememberStudioDraft();
  loadStudioDeviceData();
  studioDraftDevice=selectedDeviceId;
  const draft=studioDrafts.get(selectedDeviceId);
  if(draft && (draft.dirty.size || draft.deletions?.size)) {
    currentPages=cloneStudio(draft.pages);currentScreensaverConfig=cloneStudio(draft.config);studioBindings=cloneStudio(draft.bindings);
    studioDirty=draft.dirty;studioDeletions=draft.deletions||new Map();selectedPageId=draft.selected;
  } else {studioDirty=new Map();studioDeletions=new Map();}
  updatePageDropdown();loadSelectedPage();
  renderStudioDeviceStatus();refreshStudioDeviceStatus();
  studioSaveMessage='';updateStudioSaveState();
}
function studioRequest(path, payload, method='POST') {
  if (!window.Homey?.api || selectedDeviceId==='demo') return Promise.resolve({demo:true});
  return new Promise((resolve,reject)=>{
    let finished=false;
    const timer=setTimeout(()=>{finished=true;reject(new Error('Tallennuksen vastaus aikakatkaistiin. Muutoksia ei merkitty tallennetuiksi.'));},20000);
    window.Homey.api(method,path,payload,(err,result)=>{
      if(finished)return;finished=true;clearTimeout(timer);
      if(err)reject(new Error(err.message||String(err)));else resolve(result);
    });
  });
}
async function saveStudioChanges() {
  if(studioSaving || (!studioDirty.size && !studioDeletions.size && !globalWeatherDirty))return;
  const deviceId=selectedDeviceId;
  const device=devices.find(d=>d.id===deviceId);
  const selected=selectedPageId;
  const dirty=studioDirty;
  const deletions=Array.from(studioDeletions.entries());
  const pending=Array.from(dirty.entries()).filter(([id])=>!studioDeletions.has(id));
  const weatherRevision=globalWeatherDirty, sharedWeather=cloneStudio(globalWeatherConfig);
  const pages=cloneStudio(currentPages), config=cloneStudio(currentScreensaverConfig), bindings=cloneStudio(studioBindings);
  const showNow=document.getElementById('show-now-checkbox').checked && (selected!=='screensaver'||typeof studioSettingsView==='undefined'||studioSettingsView==='sleep');
  studioSaving=true;studioSaveMessage='';updateStudioSaveState();
  const status=document.getElementById('push-status');
  try {
    if(dirty.has('screensaver') && getPanelInputErrors().size)throw new Error('Korjaa paneeliasetusten virheellinen lukuarvo tai kellonaika. Avaa Paneelin toiminnot.');
    if(selected==='screensaver' && dirty.has('screensaver')) {
      const invalid=Array.from(document.querySelectorAll('#settings-panel input[type="number"], #settings-sleep input[type="number"], #settings-panel input[type="time"]')).find(input=>!input.checkValidity());
      if(invalid){invalid.reportValidity();throw new Error('Korjaa paneeliasetusten virheellinen lukuarvo tai kellonaika ennen tallennusta.');}
    }
    for(const [id] of deletions) { const error=studioDeletionError(id);if(error)throw new Error(error); }
    if(weatherRevision) {
      if(sharedWeather.location==='custom' && (!Number.isFinite(sharedWeather.latitude)||!Number.isFinite(sharedWeather.longitude)||Math.abs(sharedWeather.latitude)>90||Math.abs(sharedWeather.longitude)>180))throw new Error(Homey.__('studio.save.invalid_coords'));
      await studioRequest('/weather-settings',sharedWeather);
      if(globalWeatherDirty===weatherRevision)globalWeatherDirty=0;
    }
    // Save background pages first; only the selected view may change the physical screen.
    pending.sort(([a],[b])=>Number(a===selected)-Number(b===selected));
    for(const [pageId,revision] of pending) {
      if(pageId==='screensaver') {
        const {statusIcon1,statusIcon2,...settings}=config;
        await studioRequest(`/devices/${deviceId}/settings`,{settings,bindings,statusIcon1,statusIcon2,showNow:showNow&&selected===pageId});
        if(device){device.settings={...device.settings,...settings};device.bindings=cloneStudio(bindings);device.statusIcon1=statusIcon1;device.statusIcon2=statusIcon2;}
      } else {
        const page=pages[pageId];if(!page){if(dirty.get(pageId)===revision)dirty.delete(pageId);continue;}
        await studioRequest(`/devices/${deviceId}/page`,{...page,id:pageId,renameFrom:page._renameFrom,showNow:showNow&&selected===pageId});
        if(device){device.pages=device.pages||{};if(page._renameFrom)delete device.pages[page._renameFrom];device.pages[pageId]=cloneStudio(page);delete device.pages[pageId]._renameFrom;}
        if(page._renameFrom)for(const [draftId,draft] of Object.entries(currentPages)){if(draft._renameFrom===page._renameFrom){if(draftId===pageId)delete draft._renameFrom;else draft._renameFrom=pageId;}}
      }
      if(dirty.get(pageId)===revision)dirty.delete(pageId);
    }
    for(const [id, deletion] of deletions) {
      if(deletion.serverId){deletion.attempted=true;renderStudioDeletions();await studioRequest(`/devices/${deviceId}/page/${encodeURIComponent(deletion.serverId)}`,null,'DELETE');}
      if(device?.pages && deletion.serverId)delete device.pages[deletion.serverId];
      delete currentPages[id];dirty.delete(id);studioDeletions.delete(id);
      if(!currentPages[selectedPageId])selectedPageId=Object.keys(currentPages)[0]||'screensaver';
      updatePageDropdown();loadSelectedPage();
    }
    studioSaveMessage=(dirty.size||studioDeletions.size||globalWeatherDirty)?Homey.__('studio.save.hint_pending'):(!window.Homey?.api || deviceId==='demo'?Homey.__('studio.save.hint_no_changes'):Homey.__('studio.save.hint_changes_saved'));
    status.style.color='var(--success)';status.textContent=studioSaveMessage;
  } catch(err) {
    studioSaveMessage=Homey.__('studio.save.save_failed').replace('{0}',err.message);
    status.style.color='var(--danger)';status.textContent=studioSaveMessage;
  } finally {
    studioSaving=false;
    if(selectedDeviceId===deviceId)rememberStudioDraft();
    updateStudioSaveState();
  }
}
// Form edits already update their draft through the existing inline handlers.
for(const name of ['input','change'])document.addEventListener(name,event=>{
  const target=event.target;
  if(!(target instanceof Element) || !target.closest('#tab-studio'))return;
  if(['page-select','device-select','show-now-checkbox'].includes(target.id))return;
  if(target.closest('#modal-new-page, #modal-delete-page, #global-weather-editor'))return;
  if(target.matches('[data-source-control]'))return;
  if(target.matches('input,select,textarea'))markStudioDirty();
});
// Buttons/chips also mutate drafts without input events.
for (const name of ['applyPreset','applyPowerDefaults','clearPowerNode','setPowerNodeIcon','setPowerNodeColor','setIcon','setScreensaverIcon','updateCurrentSlot']) {
  const original=window[name];
  window[name]=function(...args){const result=original.apply(this,args);if(result !== false)markStudioDirty();return result;};
}
const createStudioPage=confirmCreateNewPage;
confirmCreateNewPage=function(){const old=selectedPageId;createStudioPage();if(selectedPageId!==old)markStudioDirty();};
const switchStudioTab=switchTab;
switchTab=function(tabId){switchStudioTab(tabId);document.getElementById('studio-savebar').hidden=tabId!=='studio';};
window.addEventListener('beforeunload',event=>{
  if(globalWeatherDirty || studioDirty.size || studioDeletions.size || Array.from(studioDrafts.values()).some(d=>d.dirty.size || d.deletions?.size)){event.preventDefault();event.returnValue='';}
});

