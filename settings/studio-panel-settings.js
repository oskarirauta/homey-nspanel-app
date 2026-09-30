// Invalid form text belongs to the panel draft, separately from its last valid values.
const panelInputErrors = new Map();
function getPanelInputErrors() { return panelInputErrors.get(selectedDeviceId) || new Map(); }
function trackPanelInput(input, id, message) {
  const errors=getPanelInputErrors();
  if(message)errors.set(id,{value:input.value,message});else errors.delete(id);
  if(errors.size)panelInputErrors.set(selectedDeviceId,errors);else panelInputErrors.delete(selectedDeviceId);
  input.setCustomValidity?.(message);
}
function applyTemperatureVisibility() {
  const indoor=document.querySelector('.ss-temp-indoor'), outdoor=document.querySelector('.ss-temp-outdoor'), divider=document.querySelector('.ss-temp-divider');
  document.querySelectorAll('.ss-weather-main-icon,.ss-forecast-row').forEach(el=>el.hidden=studioBindings.weather?.source==='none');
  if(indoor)indoor.style.display=studioBindings.indoorVisible===false?'none':'';
  if(outdoor)outdoor.style.display=studioBindings.outdoorVisible===false?'none':'';
  if(divider)divider.style.display=studioBindings.indoorVisible===false||studioBindings.outdoorVisible===false?'none':'';
}
function loadGlobalWeatherSettings() {
  if(!window.Homey?.api)return;
  window.Homey.api('GET','/weather-settings',null,(err,result)=>{
    if(err){globalWeatherLoadError=Homey.__('studio.panel_settings.weather_fetch_failed');if(selectedPageId==='screensaver')renderPanelBindings();return;}
    if(!globalWeatherDirty)globalWeatherConfig=result;
    globalWeatherLoaded=true;globalWeatherLoadError='';
    if(selectedPageId==='screensaver')renderPanelBindings();
  });
}
function renderWeatherSource(parent) {
  const section=document.createElement('div');section.className='source-box';
  const heading=document.createElement('h4');heading.textContent=Homey.__('studio.panel_settings.panel_forecast');section.append(heading);
  const select=document.createElement('select');select.className='form-control';select.setAttribute('aria-label',Homey.__('studio.panel_settings.panel_forecast'));
  [['none',Homey.__('studio.panel_settings.no_forecast')],['flow',Homey.__('studio.panel_settings.flow_weather')],['met',Homey.__('studio.panel_settings.met_weather')]].forEach(([value,text])=>{const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);});
  select.value=studioBindings.weather?.source||'flow';select.onchange=()=>{studioBindings.weather={source:select.value};markStudioDirty('screensaver');renderPanelBindings();renderScreen();applyTemperatureVisibility();};section.append(select);
  const note=document.createElement('p');note.className='source-detail';note.textContent=Homey.__('studio.panel_settings.panel_note');section.append(note);
  const shared=document.createElement('details');shared.id='global-weather-editor';shared.open=select.value==='met';
  const summary=document.createElement('summary');summary.textContent=Homey.__('studio.panel_settings.shared_weather_title');shared.append(summary);
  const help=document.createElement('p');help.className='source-detail';help.textContent=Homey.__('studio.panel_settings.shared_weather_help');shared.append(help);
  if(!globalWeatherLoaded){const message=document.createElement('p');message.textContent=globalWeatherLoadError||Homey.__('studio.panel_settings.fetching_shared');shared.append(message);const retry=document.createElement('button');retry.className='btn';retry.type='button';retry.textContent=Homey.__('studio.panel_settings.retry');retry.onclick=loadGlobalWeatherSettings;shared.append(retry);document.getElementById('settings-services').replaceChildren(shared);shared.open=true;parent.append(section);return;}
  function field(label,values,value,change) {
    const wrapper=document.createElement('label');wrapper.textContent=label;
    const input=document.createElement('select');input.className='form-control';input.setAttribute('aria-label',label);
    values.forEach(([id,title])=>{const option=document.createElement('option');option.value=id;option.textContent=title;input.append(option);});
    input.value=value;input.onchange=()=>{change(input.value);markGlobalWeatherDirty();renderPanelBindings();};wrapper.append(input);shared.append(wrapper);
  }
  field('Yhteinen sijainti',[['homey','Homeyn sijainti'],['custom','Omat koordinaatit']],globalWeatherConfig.location,value=>globalWeatherConfig={...globalWeatherConfig,location:value});
  if(globalWeatherConfig.location==='custom')for(const [key,title,min,max] of [['latitude','Leveysaste',-90,90],['longitude','Pituusaste',-180,180]]) {
    const label=document.createElement('label');label.textContent=title;const input=document.createElement('input');input.type='number';input.className='form-control';input.min=min;input.max=max;input.step='0.0001';input.value=globalWeatherConfig[key]??'';
    input.oninput=()=>{globalWeatherConfig={...globalWeatherConfig,[key]:input.value===''?null:Number(input.value)};markGlobalWeatherDirty();};label.append(input);shared.append(label);
  }
  field(Homey.__('studio.panel_settings.interval_label'),[[1,'1 '+Homey.__('studio.panel_settings.hour')],[2,'2 '+Homey.__('studio.panel_settings.hours')],[3,'3 '+Homey.__('studio.panel_settings.hours')],[6,'6 '+Homey.__('studio.panel_settings.hours')],[12,'12 '+Homey.__('studio.panel_settings.hours')]],String(globalWeatherConfig.interval),value=>globalWeatherConfig={...globalWeatherConfig,interval:Number(value)});
  const credit=document.createElement('p');credit.className='source-detail';credit.innerHTML=Homey.__('studio.panel_settings.credit');shared.append(credit);
  document.getElementById('settings-services').replaceChildren(shared);shared.open=true;parent.append(section);
}
function renderPanelBindings() {
  applyTemperatureVisibility();
  document.getElementById('panel-binding-editor')?.remove();
  // Legacy checkboxes are superseded by the explicit source choices.
  ['ss-use-internal-temp','ss-outdoor-from-forecast'].forEach(id=>{const el=document.getElementById(id);if(el?.parentElement)el.parentElement.style.display='none';});
  const parent=document.createElement('div');parent.id='panel-binding-editor';document.getElementById('sleep-sources').append(parent);
  ['indoor','outdoor'].forEach(key=>{
    const h=document.createElement('h4');h.textContent=key==='indoor'?Homey.__('studio.panel_settings.indoor_temp'):Homey.__('studio.panel_settings.outdoor_temp');parent.append(h);
    const l=document.createElement('label');const visible=document.createElement('input');visible.type='checkbox';visible.checked=studioBindings[key+'Visible']!==false;visible.onchange=()=>{studioBindings[key+'Visible']=visible.checked;renderScreen();applyTemperatureVisibility();};l.append(visible,document.createTextNode(' '+Homey.__('studio.panel_settings.show_temp')));parent.append(l);
    sourceEditor(parent,studioBindings[key],key,b=>{studioBindings[key]=b;renderPanelBindings();});
  });
  renderWeatherSource(parent);
  const hardware=document.createElement('details');const title=document.createElement('summary');title.textContent='Paneelin fyysiset painikkeet';hardware.append(title);hardware.open=true;document.getElementById('panel-buttons').replaceChildren(hardware);
  ['1','2'].forEach(key=>{
    const h=document.createElement('h4');h.textContent=`Fyysinen painike ${key}`;hardware.append(h);
    sourceEditor(hardware,studioBindings.buttons[key]||{source:'relay',relay:Number(key)},'button',b=>{
      for(const n of ['1','2'])if(!studioBindings.buttons[n])studioBindings.buttons[n]={source:'relay',relay:Number(n)};
      studioBindings.buttons[key]=b;renderPanelBindings();
    });
  });
  const help=document.createElement('p');help.style.fontSize='12px';help.textContent='Homey-, Flow- ja sivunvaihtotoiminto irrottavat fyysiset painikkeet Tasmotan suorasta releohjauksesta. Releeksi valittu toinen painike toimii sovelluksen kautta.';hardware.append(help);
  if(typeof applyStudioSettingsView==='function')applyStudioSettingsView();
}

// Keep the last valid draft value while a numeric field is empty or out of range.
function readPanelNumber(id, key, min, max) {
  const input=document.getElementById(id);
  const raw=input.value.trim();
  const value=Number(raw);
  const valid=raw!=='' && Number.isFinite(value) && value>=min && value<=max;
  trackPanelInput(input,id,valid?'':Homey.__('studio.panel_settings.input_range_error').replace('{0}',min).replace('{1}',max));
  if(valid)currentScreensaverConfig[key]=value;
  return valid;
}

function readPanelTime(id, key) {
  const input=document.getElementById(id);
  const valid=/^([01]\d|2[0-3]):[0-5]\d$/.test(input.value);
  trackPanelInput(input,id,valid?'':'Anna kellonaika muodossa TT:MM (00:00–23:59).');
  if(valid)currentScreensaverConfig[key]=input.value;
  return valid;
}
function clearPanelFieldValidity() {
  document.querySelectorAll('#settings-panel input, #settings-sleep input').forEach(input=>input.setCustomValidity?.(''));
  for(const [id,error] of getPanelInputErrors()){const input=document.getElementById(id);if(input){input.value=error.value;input.setCustomValidity?.(error.message);}}
}
