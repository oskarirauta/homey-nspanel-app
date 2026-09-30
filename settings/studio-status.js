// Refresh availability only; never replace page drafts or settings from the response.
let studioStatusPending;
function renderStudioDeviceStatus(error='') {
  const badge=document.getElementById('device-status-badge');
  const device=devices.find(d=>d.id===selectedDeviceId);
  const available=error?undefined:device?.available;
  badge.className='badge '+(available===true?'badge-success':'badge-offline');
  badge.textContent=error?Homey.__('studio.status.cannot_check'):available===true?Homey.__('studio.status.connected'):available===false?Homey.__('studio.status.offline'):Homey.__('studio.status.unknown');
  badge.title=error || Homey.__('studio.status.tooltip_default');
}
function refreshStudioDeviceStatus() {
  if(studioStatusPending)return studioStatusPending;
  if(!window.Homey?.api || selectedDeviceId==='demo')return Promise.resolve();
  studioStatusPending=new Promise(resolve=>{
    let finished=false;
    const finish=(error,result)=>{
      if(finished)return;finished=true;clearTimeout(timeout);
      if(!error && !Array.isArray(result))error=new Error('Virheellinen laitelista');
      if(!error){
        for(const device of devices){
          const fresh=result.find(d=>d.id===device.id);
          device.available=fresh?.available;
        }
      }
      renderStudioDeviceStatus(error?(error.message||String(error)):'');
      resolve();
    };
    const timeout=setTimeout(()=>finish(new Error('Yhteystilan tarkistus aikakatkaistiin')),10000);
    try{window.Homey.api('GET','/devices',null,finish);}catch(error){finish(error);}
  }).finally(()=>{studioStatusPending=undefined;});
  return studioStatusPending;
}
let studioStatusTimer;
function startStudioStatusPolling(){
  if(studioStatusTimer!==undefined)return;
  studioStatusTimer=setInterval(()=>{if(!document.hidden)refreshStudioDeviceStatus();},15000);
  refreshStudioDeviceStatus();
}
window.addEventListener('focus',()=>refreshStudioDeviceStatus());
window.addEventListener('pagehide',()=>{clearInterval(studioStatusTimer);studioStatusTimer=undefined;});
window.addEventListener('pageshow',startStudioStatusPolling);
