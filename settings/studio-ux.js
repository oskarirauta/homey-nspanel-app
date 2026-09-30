// Layout and live link diagnostics. Pane-specific drafts remain in Studio's save controller.
let studioSettingsView = 'sleep';
function openStudioSettings(view) {
  studioSettingsView = view;
  selectedPageId = 'screensaver';
  updatePageDropdown();
  loadSelectedPage();
  document.getElementById('editor-panel').scrollIntoView({block:'start'});
}
function applyStudioSettingsView() {
  const inSettings = selectedPageId === 'screensaver';
  document.getElementById('tab-studio').dataset.settingsView = inSettings ? studioSettingsView : '';
  for (const view of ['sleep','panel','services']) {
    document.getElementById('settings-'+view).hidden = view !== studioSettingsView;
    document.querySelectorAll('[data-settings-view="'+view+'"]').forEach(button=>button.setAttribute('aria-pressed',String(view===studioSettingsView)));
  }
  if(inSettings) {
    document.getElementById('editor-title').textContent = {sleep:Homey.__('studio.ux.sleep_title'),panel:Homey.__('studio.ux.panel_title'),services:Homey.__('studio.ux.services_title')}[studioSettingsView];
    document.getElementById('editor-subtitle').textContent = studioSettingsView==='services'?Homey.__('studio.ux.all_panels'):Homey.__('studio.ux.selected_panel');
    document.getElementById('settings-scope').textContent = studioSettingsView==='services'?Homey.__('studio.ux.shared_scope'):Homey.__('studio.ux.panel_scope');
  }
  ['page-id-input','page-title-input','page-type-select'].forEach(id=>document.getElementById(id).closest('.form-group').hidden=inSettings);
  document.getElementById('page-select').parentElement.querySelectorAll('button').forEach(button=>button.hidden=inSettings);
  document.getElementById('show-now-checkbox').closest('label').hidden=inSettings && studioSettingsView!=='sleep';
}
const loadViewBeforeSections = loadSelectedPage;
loadSelectedPage = function(...args) {const result=loadViewBeforeSections(...args);applyStudioSettingsView();return result;};

let linkDiagnosticsState='idle',linkDiagnosticsAt=0,linkDiagnosticsPending;
function bindingDiagnostic(binding,devices,state) {
  if(state==='loading'||state==='idle')return {state:'pending',text:Homey.__('studio.ux.checking')};
  if(state==='error')return {state:'error',text:Homey.__('studio.ux.connection_error')};
  const device=devices.find(d=>d.id===binding.deviceId);
  if(!device)return {state:'error',text:Homey.__('studio.ux.device_missing')};
  if(device.available===false)return {state:'error',text:Homey.__('studio.ux.device_offline')};
  const capability=device.capabilities.find(c=>c.id===binding.capabilityId);
  if(!capability)return {state:'error',text:Homey.__('studio.ux.capability_missing')};
  if(capability.getable!==false && (capability.value===null||capability.value===undefined))return {state:'pending',text:Homey.__('studio.ux.reading_pending')};
  return {state:'ok',text:capability.getable===false?Homey.__('studio.ux.control_only'):Homey.__('studio.ux.connected_prefix')+(typeof capability.value==='boolean'?(capability.value?Homey.__('studio.ux.on'):Homey.__('studio.ux.off')):String(capability.value))+(capability.units?' '+capability.units:'')};
}
function updateLinkDiagnostics() {
  document.querySelectorAll('[data-binding-status]').forEach(node=>{
    const binding=JSON.parse(node.dataset.bindingStatus);
    const result=bindingDiagnostic(binding,pickerDevices,linkDiagnosticsState);
    node.dataset.state=result.state;node.textContent=result.text;
  });
  document.querySelectorAll('[data-control-support]').forEach(node=>{
    const device=pickerDevices.find(d=>d.id===node.dataset.controlSupport);
    if(!device){node.textContent=Homey.__('studio.ux.check_controls');return;}
    const has=id=>device.capabilities.some(c=>c.id===id&&c.setable!==false);
    const labels=[];
    if(node.dataset.controlKind==='shutter'){
      if(has('windowcoverings_state')||has('windowcoverings_set'))labels.push(Homey.__('studio.ux.open_close'));
      if(has('windowcoverings_state'))labels.push(Homey.__('studio.ux.stop'));
      if(has('windowcoverings_set'))labels.push(Homey.__('studio.ux.position'));
      if(has('windowcoverings_tilt_set'))labels.push(Homey.__('studio.ux.tilt'));
    }else{if(has('onoff'))labels.push(Homey.__('studio.ux.on_off'));if(has('dim'))labels.push(Homey.__('studio.ux.speed'));}
    node.textContent=Homey.__('studio.ux.via_homey')+(labels.join(', ')||Homey.__('studio.ux.no_controls'))+'.'+(node.dataset.controlKind==='fan'?Homey.__('studio.ux.fan_presets'):'');
  });
  document.querySelectorAll('[data-light-support]').forEach(node=>{
    const device=pickerDevices.find(d=>d.id===node.dataset.lightSupport);
    if(!device){node.textContent=Homey.__('studio.ux.check_light');return;}
    const has=id=>device.capabilities.some(c=>c.id===id&&c.setable!==false);
    const labels=[];if(has('onoff'))labels.push(Homey.__('studio.ux.on_off'));if(has('dim'))labels.push(Homey.__('studio.ux.brightness'));if(has('light_temperature'))labels.push(Homey.__('studio.ux.color_temperature'));if(has('light_hue')&&has('light_saturation'))labels.push(Homey.__('studio.ux.color'));
    node.textContent=Homey.__('studio.ux.light_controls')+(labels.join(', ')||Homey.__('studio.ux.no_controls'))+'.';
  });
}
function refreshLinkDiagnostics(force=false) {
  if(linkDiagnosticsPending)return linkDiagnosticsPending;
  if(!window.Homey?.api||selectedDeviceId==='demo'){linkDiagnosticsState='ready';updateLinkDiagnostics();return Promise.resolve();}
  if(!force && Date.now()-linkDiagnosticsAt<30000){updateLinkDiagnostics();return Promise.resolve();}
  linkDiagnosticsState='loading';updateLinkDiagnostics();
  linkDiagnosticsPending=new Promise(resolve=>{
    let finished=false;
    const complete=(err,result)=>{
      if(finished)return;finished=true;clearTimeout(timeout);
      linkDiagnosticsAt=Date.now();linkDiagnosticsState=err?'error':'ready';
      if(!err)pickerDevices=result;
      linkDiagnosticsPending=undefined;updateLinkDiagnostics();resolve();
    };
    const timeout=setTimeout(()=>complete(new Error('timeout')),10000);
    window.Homey.api('GET','/homey-devices',null,complete);
  });
  return linkDiagnosticsPending;
}
function sourcePolicyText(source,kind) {
  if(kind==='button')return source==='flow'?Homey.__('studio.ux.button_flow'):Homey.__('studio.ux.button_action');
  if(kind==='alarm')return Homey.__('studio.ux.alarm_policy');
  if(source==='flow')return Homey.__('studio.ux.flow_policy');
  if(source==='fixed'||!source)return Homey.__('studio.ux.fixed_policy');
  if(source==='homey')return Homey.__('studio.ux.homey_policy');
  if(source==='met')return Homey.__('studio.ux.met_policy');
  if(source==='forecast')return Homey.__('studio.ux.forecast_policy');
  if(source==='internal')return Homey.__('studio.ux.internal_policy');
  if(source==='relay')return Homey.__('studio.ux.relay_policy');
  return '';
}
const sourceEditorBeforeDiagnostics=sourceEditor;
sourceEditor=function(parent,binding,...rest) {
  sourceEditorBeforeDiagnostics(parent,binding,...rest);
  const box=parent.lastElementChild;
  const effectiveSource = binding?.source || box.dataset.source;
  const policy=document.createElement('details');policy.className='source-detail source-policy';
  const policyTitle=document.createElement('summary');policyTitle.textContent=(rest[0]==='button'?Homey.__('studio.ux.action_source'):Homey.__('studio.ux.value_source'))+({homey:'Homey',flow:'Flow',met:'MET Norway',forecast:Homey.__('studio.ux.forecast'),internal:Homey.__('studio.ux.internal'),relay:Homey.__('studio.ux.relay'),navigate:Homey.__('studio.ux.navigate'),fixed:Homey.__('studio.ux.fixed')})[effectiveSource] || Homey.__('studio.ux.source');
  const policyText=document.createElement('p');policyText.textContent=sourcePolicyText(effectiveSource,rest[0]);policy.append(policyTitle,policyText);box.append(policy);
  if(binding?.source!=='homey')return;
  const status=document.createElement('p');status.className='binding-status';status.setAttribute('role','status');status.dataset.bindingStatus=JSON.stringify(binding);box.append(status);
  const refresh=document.createElement('button');refresh.type='button';refresh.className='btn btn-sm';refresh.textContent=Homey.__('studio.ux.check_connection');refresh.onclick=()=>refreshLinkDiagnostics(true);box.append(refresh);
  const note=document.createElement('small');note.className='source-detail';note.textContent=Homey.__('studio.ux.check_note');box.append(note);
  if(rest[0]==='light'){const support=document.createElement('p');support.className='source-detail';support.dataset.lightSupport=binding.deviceId;box.append(support);}
  if(['shutter','fan'].includes(rest[0])){const support=document.createElement('p');support.className='source-detail';support.dataset.controlSupport=binding.deviceId;support.dataset.controlKind=rest[0];box.append(support);}
  if(rest[0]==='input_sel'){const support=document.createElement('p');support.className='source-detail';support.textContent=Homey.__('studio.ux.select_options');box.append(support);}
  refreshLinkDiagnostics();
};
const renderSlotBindingBeforeModes=renderSlotBinding;
renderSlotBinding=function(...args){
  const result=renderSlotBindingBeforeModes(...args);
  const slot=currentPages[selectedPageId]?.slots?.[selectedSlot];
  const group=document.getElementById('slot-modes-group');
  if(group)group.hidden=slot?.binding?.source==='homey';
  return result;
};
document.getElementById('panel-hardware').before(document.getElementById('panel-buttons'));

