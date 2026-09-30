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
    document.getElementById('editor-title').textContent = {sleep:'Lepotilan ulkoasu ja tiedot',panel:'Paneelin toiminnot',services:'Yhteiset palvelut'}[studioSettingsView];
    document.getElementById('editor-subtitle').textContent = studioSettingsView==='services'?'Kaikki paneelit':'Valittu paneeli';
    document.getElementById('settings-scope').textContent = studioSettingsView==='services'?'Näiden asetusten muuttaminen vaikuttaa kaikkiin MET-säätä käyttäviin paneeleihin.':'Asetukset koskevat vain valittua paneelia. Muista tallentaa muutokset.';
  }
  ['page-id-input','page-title-input','page-type-select'].forEach(id=>document.getElementById(id).closest('.form-group').hidden=inSettings);
  document.getElementById('page-select').parentElement.querySelectorAll('button').forEach(button=>button.hidden=inSettings);
  document.getElementById('show-now-checkbox').closest('label').hidden=inSettings && studioSettingsView!=='sleep';
}
const loadViewBeforeSections = loadSelectedPage;
loadSelectedPage = function(...args) {const result=loadViewBeforeSections(...args);applyStudioSettingsView();return result;};

let linkDiagnosticsState='idle',linkDiagnosticsAt=0,linkDiagnosticsPending;
function bindingDiagnostic(binding,devices,state) {
  if(state==='loading'||state==='idle')return {state:'pending',text:'Tarkistetaan linkitystä…'};
  if(state==='error')return {state:'error',text:'Yhteyttä Homeyyn ei voitu tarkistaa. Yritä uudelleen.'};
  const device=devices.find(d=>d.id===binding.deviceId);
  if(!device)return {state:'error',text:'Linkitettyä laitetta ei löytynyt. Valitse korvaava laite.'};
  if(device.available===false)return {state:'error',text:'Laite ei ole yhteydessä Homeyyn.'};
  const capability=device.capabilities.find(c=>c.id===binding.capabilityId);
  if(!capability)return {state:'error',text:'Valittu ominaisuus puuttuu laitteelta. Valitse ominaisuus uudelleen.'};
  if(capability.getable!==false && (capability.value===null||capability.value===undefined))return {state:'pending',text:'Laite löytyi, mutta arvoa ei ole vielä saatavilla.'};
  return {state:'ok',text:capability.getable===false?'Ohjaus käytettävissä (ei tilapalautetta).':'Yhteydessä · '+(typeof capability.value==='boolean'?(capability.value?'päällä':'pois'):String(capability.value))+(capability.units?' '+capability.units:'')};
}
function updateLinkDiagnostics() {
  document.querySelectorAll('[data-binding-status]').forEach(node=>{
    const binding=JSON.parse(node.dataset.bindingStatus);
    const result=bindingDiagnostic(binding,pickerDevices,linkDiagnosticsState);
    node.dataset.state=result.state;node.textContent=result.text;
  });
  document.querySelectorAll('[data-control-support]').forEach(node=>{
    const device=pickerDevices.find(d=>d.id===node.dataset.controlSupport);
    if(!device){node.textContent='Tuetut säädöt tarkistetaan laitteelta.';return;}
    const has=id=>device.capabilities.some(c=>c.id===id&&c.setable!==false);
    const labels=[];
    if(node.dataset.controlKind==='shutter'){
      if(has('windowcoverings_state')||has('windowcoverings_set'))labels.push('avaus/sulkeminen');
      if(has('windowcoverings_state'))labels.push('pysäytys');
      if(has('windowcoverings_set'))labels.push('asento');
      if(has('windowcoverings_tilt_set'))labels.push('säleet');
    }else{if(has('onoff'))labels.push('päälle/pois');if(has('dim'))labels.push('nopeus');}
    node.textContent='Homeyn kautta: '+(labels.join(', ')||'ei tuettuja säätöjä')+'.'+(node.dataset.controlKind==='fan'?' Puhaltimen esiasetukset ohjataan Flow’lla.':'');
  });
  document.querySelectorAll('[data-light-support]').forEach(node=>{
    const device=pickerDevices.find(d=>d.id===node.dataset.lightSupport);
    if(!device){node.textContent='Valon tukemat säädöt tarkistetaan laitteelta.';return;}
    const has=id=>device.capabilities.some(c=>c.id===id&&c.setable!==false);
    const labels=[];if(has('onoff'))labels.push('päälle/pois');if(has('dim'))labels.push('kirkkaus');if(has('light_temperature'))labels.push('värilämpötila');if(has('light_hue')&&has('light_saturation'))labels.push('väri');
    node.textContent='Valon säädöt: '+(labels.join(', ')||'ei tuettuja säätöjä')+'.';
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
  if(kind==='button')return source==='flow'?'Painallus käynnistää Flow-triggerin.':'Painallus suorittaa valitun toiminnon. Flow-triggerillä voi lisätä muuta automaatiota.';
  if(kind==='alarm')return 'Hälyttimen kytkentä, purkaminen ja PIN-käsittely ovat erillisiä ohjaustoimintoja. Linkitys seuraa Homey-hälyttimen tilaa.';
  if(source==='flow')return 'Arvo tulee Flow’sta. Päivitä arvo tämän näkymän Flow-kortilla. Homey-linkitys ei korvaa sitä.';
  if(source==='fixed'||!source)return 'Tämä on aloitusarvo. Flow voi päivittää sitä myöhemmin.';
  if(source==='homey')return 'Arvo tulee valitulta Homey-laitteelta. Flow voi täydentää otsikkoa, kuvaketta tai muita lisätietoja; laitteen tila säilyy Homeyn ohjaamana. Valitse Flow-lähde, jos haluat syöttää myös tilan itse.';
  if(source==='met')return 'Arvot tulevat yhteisestä MET-ennusteesta. Flow-arvoja käytetään, kun kaavion lähteeksi valitaan Flow.';
  if(source==='forecast')return 'Lämpötila tulee tämän paneelin valitusta sääennusteesta. Valitse Flow, jos syötät lämpötilan erikseen.';
  if(source==='internal')return 'Arvo tulee paneelin sisäisestä anturista. Valitse Flow, jos syötät lämpötilan itse.';
  if(source==='relay')return 'Tila seuraa paneelin relettä. Flow’n releohjaus muuttaa myös näytettävää tilaa.';
  return '';
}
const sourceEditorBeforeDiagnostics=sourceEditor;
sourceEditor=function(parent,binding,...rest) {
  sourceEditorBeforeDiagnostics(parent,binding,...rest);
  const box=parent.lastElementChild;
  const effectiveSource = binding?.source || box.dataset.source;
  const policy=document.createElement('details');policy.className='source-detail source-policy';
  const policyTitle=document.createElement('summary');policyTitle.textContent=(rest[0]==='button'?'Toiminnon lähde: ':'Arvon lähde: ')+({homey:'Homey',flow:'Flow',met:'MET Norway',forecast:'sääennuste',internal:'sisäinen anturi',relay:'paneelin rele',navigate:'sivunvaihto',fixed:'aloitusarvo'})[effectiveSource] || 'Arvon lähde';
  const policyText=document.createElement('p');policyText.textContent=sourcePolicyText(effectiveSource,rest[0]);policy.append(policyTitle,policyText);box.append(policy);
  if(binding?.source!=='homey')return;
  const status=document.createElement('p');status.className='binding-status';status.setAttribute('role','status');status.dataset.bindingStatus=JSON.stringify(binding);box.append(status);
  const refresh=document.createElement('button');refresh.type='button';refresh.className='btn btn-sm';refresh.textContent='Tarkista yhteys';refresh.onclick=()=>refreshLinkDiagnostics(true);box.append(refresh);
  const note=document.createElement('small');note.className='source-detail';note.textContent='Tilanne tarkistushetkellä. Painike päivittää tiedon tallentamatta asetuksia.';box.append(note);
  if(rest[0]==='light'){const support=document.createElement('p');support.className='source-detail';support.dataset.lightSupport=binding.deviceId;box.append(support);}
  if(['shutter','fan'].includes(rest[0])){const support=document.createElement('p');support.className='source-detail';support.dataset.controlSupport=binding.deviceId;support.dataset.controlKind=rest[0];box.append(support);}
  if(rest[0]==='input_sel'){const support=document.createElement('p');support.className='source-detail';support.textContent='Vaihtoehdot ja niiden nimet tulevat Homey-laitteelta.';box.append(support);}
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

