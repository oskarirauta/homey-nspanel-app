// Shared Studio source picker. Configuration never contains the Homey API token.
let studioBindings = { indoor: { source: 'internal' }, outdoor: { source: 'forecast' }, indoorVisible: true, outdoorVisible: true, buttons: {} };
let pickerDevices = [];
let pickerContext;
let pickerRequest = 0;
function bindingLabel(b) {
  if (!b) return 'Kiinteä arvo / Flow';
  if (b.source === 'homey') {
    const d = pickerDevices.find(d => d.id === b.deviceId);
    return `${d?.name || b.deviceName || b.deviceId} · ${b.capabilityId}`;
  }
  return ({ internal: 'Paneelin sisäinen anturi', forecast: 'Valittu sääennuste', flow: 'Flow', fixed: 'Kiinteä arvo', relay: `Paneelin rele ${b.relay}`, navigate: `Avaa sivu: ${b.target}` })[b.source];
}
function sourceEditor(parent, binding, kind, onChange) {
  const apply=onChange;onChange=(...args)=>{apply(...args);markStudioDirty();};
  const box = document.createElement('div');
  box.className = 'source-box';

  const label = document.createElement('label'); label.textContent = kind === 'button' ? 'Painikkeen toiminto' : 'Tietolähde / toiminto'; box.append(label);
  const summary = document.createElement('div'); summary.textContent = binding?.source === 'homey' ? binding.capabilityId : ''; summary.className='source-detail';
  const select = document.createElement('select'); select.className = 'form-control';
  let sources = [['flow','Flow'],['fixed','Aloitusarvo (Flow voi päivittää)'],['homey','Valitse laite']];
  if (kind === 'indoor') sources = [['internal','Sisäinen anturi'],['homey','Valitse laite'],['flow','Flow']];
  if (kind === 'outdoor') sources = [['homey','Valitse laite'],['forecast','Valittu sääennuste'],['flow','Flow']];
  if(['fan','input_sel','light','shutter'].includes(kind))sources=[['flow','Flow'],['homey','Valitse laite']];
  if(kind==='timer')sources=[['fixed','Paneelin ajastin (myös Flow-ohjaus)']];
  if (kind === 'slot') sources.push(['relay1','Paneelin rele 1'],['relay2','Paneelin rele 2'],['internal','Sisäinen lämpötila']);
  if (kind === 'button') sources = [['flow','Vain Flow'],['homey','Valitse laite'],['relay1','Paneelin rele 1'],['relay2','Paneelin rele 2'],['navigate','Sivunvaihto']];
  if (kind === 'thermostat') sources = [['fixed','Manuaalinen / Flow'],['homey','Valitse termostaatti']];
  if (kind === 'media') sources = [['fixed','Manuaalinen / Flow'],['homey','Valitse mediasoitin']];
  if (kind === 'alarm') sources = [['flow','Flow / Manuaalinen'],['homey','Valitse hälytinlaite']];
  if (kind === 'chart') sources = [['homey','Valitse laite (Insights-historia)'],['met','🌤 24h Lämpötilaennuste (MET)'],['flow','Flow – oma tietopalvelu'],['fixed','Kiinteät arvot']];
  if(binding?.source==='homey')sources.push(['pick-homey','Vaihda laite tai ominaisuus…']);
  sources.forEach(([value,text]) => { const o=document.createElement('option');o.value=value;o.textContent=value==='homey' && binding?.source==='homey' ? (pickerDevices.find(d=>d.id===binding.deviceId)?.name || binding.deviceName || binding.deviceId) : text;select.append(o); });
  const configuredSource = binding?.source === 'relay' ? `relay${binding.relay}` : binding?.source;
  const selectedSource = configuredSource || (sources.some(([id]) => id === 'fixed') ? 'fixed' : sources[0][0]);
  select.dataset.sourceControl = 'true'; select.value = selectedSource; box.dataset.source = selectedSource; select.setAttribute('aria-label',label.textContent);box.append(select);if(summary.textContent)box.append(summary);
  const choose = () => openHomeyPicker(kind, (b,d,c) => onChange(b,d,c));
  select.onchange = () => {
    const source=select.value;
    if (source === 'homey' || source === 'pick-homey') { choose(); select.value = selectedSource; return; }
    if (source === 'met') { onChange({ source }); return; }
    if (source === 'navigate') { onChange({ source, target:'active' }); return; }
    onChange(source.startsWith('relay') ? { source:'relay', relay:Number(source.slice(-1)) } : { source });
  };
  if (binding?.source === 'homey') {

    if ((kind === 'slot' || kind === 'button') && binding.action && binding.action !== 'press') {
      const action=document.createElement('select'); action.className='form-control';
      [['toggle','Vaihda tila'],['on','Kytke päälle'],['off','Kytke pois']].forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;action.append(o);});
      action.dataset.sourceControl='true';action.value=binding.action;action.onchange=()=>onChange({...binding,action:action.value});box.append(action);
    }
  }
  if (binding?.source === 'navigate') {
    const nav=document.createElement('select');nav.className='form-control';
    ['screensaver',...Object.keys(currentPages)].forEach(id=>{const o=document.createElement('option');o.value=id;o.textContent=id;nav.append(o);});
    nav.dataset.sourceControl='true';nav.value=binding.target;nav.onchange=()=>onChange({...binding,target:nav.value});box.append(nav);
  }
  parent.append(box);
}
function closeHomeyPicker() { ++pickerRequest; document.getElementById('studio-device-picker')?.remove(); }
function openHomeyPicker(kind, accept) {
  closeHomeyPicker(); const request=pickerRequest;
  pickerContext={kind,accept};
  const overlay=document.createElement('div');overlay.id='studio-device-picker';overlay.style.cssText='position:fixed;inset:0;background:#000a;z-index:10000;display:flex;align-items:center;justify-content:center';
  const modal=document.createElement('div');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Valitse Homey-laite');modal.style.cssText='background:#20242c;color:#fff;padding:24px;border-radius:12px;width:min(650px,90vw);max-height:85vh;overflow:auto';overlay.append(modal);
  const title=document.createElement('h3');title.textContent=kind==='thermostat'?'Valitse termostaatti':kind==='media'?'Valitse mediasoitin':kind==='chart'?'Valitse kaavion mittauslaite':kind==='alarm'?'Valitse hälytinlaite':'Valitse Homey-laite ja ominaisuus';modal.append(title);
  const close=document.createElement('button');close.className='btn';close.textContent='Sulje';close.onclick=closeHomeyPicker;modal.append(close);
  const search=document.createElement('input');search.className='form-control';search.placeholder='Hae laitteen tai huoneen nimellä';search.setAttribute('aria-label','Hae laitetta');modal.append(search);
  const filter=document.createElement('select');filter.className='form-control';
  [['all','Kaikki'],['light','Valot'],['socket','Pistorasiat'],['sensor','Anturit'],['thermostat','Termostaatit'],['media','Mediasoittimet'],['security','Hälyttimet / Heimdall']].forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;filter.append(o);});modal.append(filter);
  if(kind==='thermostat')filter.value='thermostat';
  if(kind==='media')filter.value='media';
  if(kind==='alarm')filter.value='security';
  const list=document.createElement('div');list.textContent='Haetaan laitteita…';modal.append(list);
  const matches=c=>kind==='light'?(['onoff','dim','light_temperature','light_hue'].includes(c.id)&&c.setable!==false):kind==='shutter'?(['windowcoverings_set','windowcoverings_tilt_set','windowcoverings_state'].includes(c.id)&&c.setable!==false):kind==='fan'?(['dim','onoff'].includes(c.id)&&c.setable!==false):kind==='input_sel'?(c.type==='enum'&&c.setable!==false):kind==='indoor'||kind==='outdoor' ? c.id.split('.')[0]==='measure_temperature' : kind==='power' ? c.id.split('.')[0]==='measure_power' : kind==='thermostat' ? (c.id==='target_temperature'||c.id==='measure_temperature') : kind==='media' ? (c.id==='speaker_playing'||c.id==='volume_set'||c.id==='speaker_track'||c.id==='speaker_artist') : kind==='alarm' ? (c.id==='homealarm_state' && c.setable!==false) : kind==='chart' ? (c.type==='number' && c.getable!==false) : kind==='button' ? c.setable!==false && c.type==='boolean' : c.getable!==false || c.setable!==false;
  const render=()=>{
    list.replaceChildren();let count=0;
    pickerDevices.slice().sort((a,b)=>(a.zone+a.name).localeCompare(b.zone+b.name)).forEach(d=>{
      if (!(d.name+' '+d.zone).toLowerCase().includes(search.value.toLowerCase())) return;
      if(filter.value!=='all'&&d.class!==filter.value && !(filter.value==='media'&&d.class==='speaker'))return;
      const caps=d.capabilities.filter(matches);if(!caps.length)return;
      const card=document.createElement('div');card.style.cssText='margin-top:12px;padding:12px;border:1px solid #566;border-radius:8px';
      const name=document.createElement('strong');name.textContent=`${d.name} · ${d.zone}${d.available===false?' (ei yhteyttä)':''}`;card.append(name);
      caps.forEach(c=>{
        const row=document.createElement('button');row.className='btn';row.style.cssText='display:block;margin-top:6px;width:100%;text-align:left';
        row.textContent=`${c.title} (${c.id}) · ${c.value===null||c.value===undefined?'—':c.value} ${c.units||''}`;
        row.onclick=()=>{
          const b={source:'homey',deviceId:d.id,deviceName:d.name,capabilityId:c.id};
          if(c.type==='boolean'&&c.setable!==false)b.action=c.getable===false?'press':'toggle';
          closeHomeyPicker();accept(b,d,c);
        };card.append(row);
      });list.append(card);count++;
    });
    if(!count)list.textContent='Ei sopivia laitteita tai ominaisuuksia.';
  };
  search.oninput=render;filter.onchange=render;overlay.onclick=e=>{if(e.target===overlay)closeHomeyPicker();};overlay.onkeydown=e=>{if(e.key==='Escape')closeHomeyPicker();};document.body.append(overlay);search.focus();
  if(!window.Homey?.api || selectedDeviceId==='demo') {
    pickerDevices=[
      {id:'demo-fan',name:'Esimerkkipuhallin',zone:'Kodinhoitohuone',class:'fan',available:true,suggestedIcon:'fan',capabilities:[{id:'onoff',title:'Päällä',type:'boolean',getable:true,setable:true,value:true},{id:'dim',title:'Nopeus',type:'number',getable:true,setable:true,value:0.5}]},
      {id:'demo-mode',name:'Esimerkkitilat',zone:'Koti',class:'sensor',available:true,suggestedIcon:'home',capabilities:[{id:'homealarm_state',title:'Tila',type:'enum',getable:true,setable:true,value:'home',values:[{id:'home'},{id:'away'}]}]},
      {id:'demo-light',name:'Esimerkkivalo',zone:'Demo',class:'light',available:true,suggestedIcon:'lightbulb',capabilities:[{id:'onoff',title:'Päällä',type:'boolean',getable:true,setable:true,value:true}]},
      {id:'demo-sensor',name:'Esimerkkianturi',zone:'Demo',class:'sensor',available:true,suggestedIcon:'thermometer',capabilities:[{id:'measure_temperature',title:'Lämpötila',type:'number',getable:true,setable:false,value:21.5,units:'°C'},{id:'measure_power',title:'Teho',type:'number',getable:true,setable:false,value:650,units:'W'}]},
      {id:'demo-thermo',name:'Esimerkkitermostaatti',zone:'Olohuone',class:'thermostat',available:true,suggestedIcon:'radiator',capabilities:[{id:'target_temperature',title:'Tavoitelämpötila',type:'number',getable:true,setable:true,value:21.5,units:'°C'},{id:'measure_temperature',title:'Lämpötila',type:'number',getable:true,setable:false,value:20.8,units:'°C'}]},
      {id:'demo-media',name:'Esimerkkisoitin',zone:'Olohuone',class:'media',available:true,suggestedIcon:'music',capabilities:[{id:'speaker_playing',title:'Toisto',type:'boolean',getable:true,setable:true,value:true},{id:'speaker_track',title:'Kappale',type:'string',getable:true,setable:false,value:'Nemo'},{id:'speaker_artist',title:'Artisti',type:'string',getable:true,setable:false,value:'Nightwish'},{id:'volume_set',title:'Äänenvoimakkuus',type:'number',getable:true,setable:true,value:0.65,units:'%'}]},
      {id:'demo-alarm',name:'Heimdall / Kotihälytin',zone:'Koti',class:'security',available:true,suggestedIcon:'shield-lock',capabilities:[{id:'homealarm_state',title:'Hälyttimen tila',type:'enum',getable:true,setable:true,value:'disarmed',values:['disarmed','armed','partially_armed']}]}
    ];render();
  } else window.Homey.api('GET','/homey-devices',null,(err,result)=>{
    if(request!==pickerRequest)return;
    if(err){list.textContent='Laitteiden haku epäonnistui: '+(err.message||err);return;}
    pickerDevices=result;render();
  });
}
