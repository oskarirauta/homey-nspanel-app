// Slot and energy source editors. Source selection and draft persistence are shared.
function renderSlotBinding() {
  document.getElementById('slot-binding-editor')?.remove();
  const parent=document.createElement('div');parent.id='slot-binding-editor';document.getElementById('slot-action-select').closest('.form-group').after(parent);
  const slot=currentPages[selectedPageId]?.slots?.[selectedSlot];
  const typeGroup=document.getElementById('slot-action-select').closest('.form-group');
  document.getElementById('slot-tabs-container').after(typeGroup);
  document.getElementById('slot-timer-duration')?.remove();
  if(slot?.type==='timer') {
    const field=document.createElement('div');field.id='slot-timer-duration';field.className='source-box';
    const match=String(slot.val??slot.value??'').match(/^(\d{1,2}):(\d{2})$/);const duration=Math.max(1,Math.min(3599,Math.round(Number.isFinite(slot.durationSeconds)?slot.durationSeconds:match?Number(match[1])*60+Number(match[2]):300)));
    const inputs=[];
    for(const [title,value] of [['Minuutit',Math.floor(duration/60)],['Sekunnit',duration%60]]) {
      const label=document.createElement('label');label.textContent=title;
      const input=document.createElement('input');input.type='number';input.className='form-control';input.min=0;input.max=59;input.value=value;inputs.push(input);label.append(input);field.append(label);
      input.oninput=()=>{const slot=currentPages[selectedPageId].slots[selectedSlot];const minutes=Math.max(0,Math.min(59,Math.floor(Number(inputs[0].value)||0))),seconds=Math.max(0,Math.min(59,Math.floor(Number(inputs[1].value)||0)));slot.durationSeconds=Math.max(1,minutes*60+seconds);slot.val=String(Math.floor(slot.durationSeconds/60)).padStart(2,'0')+':'+String(slot.durationSeconds%60).padStart(2,'0');document.getElementById('slot-val-input').value=slot.val;markStudioDirty();renderScreen();};
    }
    parent.after(field);
  }
  document.getElementById('slot-val-input').closest('.form-group').hidden=slot?.type==='timer' || ['homey','relay','internal','forecast'].includes(slot?.binding?.source);
  sourceEditor(parent,slot?.binding,['fan','input_sel','timer','light','shutter'].includes(slot?.type)?slot.type:'slot',(b,d,c)=>{
    const p=currentPages[selectedPageId];if(!p.slots[selectedSlot])updateCurrentSlot();
    const s=p.slots[selectedSlot];s.binding=b;
    if(b.source==='homey') {
      const device=d||pickerDevices.find(d=>d.id===b.deviceId);const cap=c||device?.capabilities.find(c=>c.id===b.capabilityId);
      s.title=device?.name||s.title;s.icon=device?.suggestedIcon||s.icon;if(!['light','shutter','fan','input_sel','timer'].includes(s.type))s.type=cap?.id?.startsWith('windowcoverings_')?'shutter':cap?.id?.startsWith('light_')||(device?.class==='light'&&['onoff','dim'].includes(cap?.id))?'light':device?.class==='fan'&&['onoff','dim'].includes(cap?.id)?'fan':b.action?(b.action==='toggle'?'switch':'button'):'text';
      if(s.type==='fan'){s.binding.relatedCapabilities=(device?.capabilities||[]).filter(c=>['onoff','dim'].includes(c.id)).map(c=>c.id);}
      if(s.type==='input_sel' && cap?.values){s.modes=cap.values.map(v=>typeof v==='string'?v:v.id).filter(v=>typeof v==='string').join('?');}
      s.val=typeof cap?.value==='boolean'?(cap.value?'1':'0'):`${cap?.value??'—'} ${cap?.units||''}`;
      if(['light','shutter'].includes(s.type))s.binding.relatedCapabilities=(device?.capabilities||[]).filter(c=>s.type==='light'?['onoff','dim','light_hue','light_saturation','light_temperature','light_mode'].includes(c.id):['windowcoverings_set','windowcoverings_tilt_set','windowcoverings_state'].includes(c.id)).map(c=>c.id);
    } else if(b.source==='relay')s.type='switch';else if(b.source==='internal')s.type='text';
    loadSlotDetail(selectedSlot);renderScreen();
  });
}

function renderPowerBinding(home=false) {
  const id=home?'home-power-binding':'node-power-binding';
  const defaultField=document.getElementById(home?'home-power-default':'node-power-default');
  if (home && defaultField) document.getElementById('home-power-source').before(defaultField);
  document.getElementById(id)?.remove();
  const parent=document.createElement('div');parent.id=id;
  (home?document.getElementById('home-power-source'):document.getElementById('power-node-detail')).append(parent);
  const raw=ensurePowerOptions(currentPages[selectedPageId]);const node=home?raw.home:raw.nodes[selectedPowerNode];
  const fixed=!node.binding || node.binding.source==='fixed';
  sourceEditor(parent,node.binding,'power',(b)=>{
    // Source changes must not replace the user's configured startup value with a live sample.
    node.binding=b;
    if (b.source==='homey') { node.autoSpeed=true; node.flowDirection=node.flowDirection || 'auto'; }
    if(home)loadPowerConfig();else loadPowerNodeDetail(selectedPowerNode);
    renderScreen();
  });
  const box=parent.querySelector('.source-box');
  if(defaultField) { box.append(defaultField); defaultField.hidden=!fixed; }
  const note=document.createElement('p');note.className='source-detail';
  note.textContent=fixed?'Oletusteho näkyy, kunnes Flow päivittää arvon.':node.binding.source==='flow'?'Teho ja nopeus tulevat Flow-toiminnosta. Ennen ensimmäistä arvoa näytetään aiemmin asetettu oletusteho.':'Teho päivittyy valitulta laitteelta. Nopeus määräytyy automaattisesti tehon mukaan.';
  box.append(note);
  if (!home) {
    const dir=document.getElementById('pnode-dir');
    const oldDirection=node.flowDirection || (node.binding?.source==='homey' ? (node.binding.invert?'auto-inverted':'auto') : (node.speed>0?'inflow':node.speed<0?'outflow':'none'));
    dir.replaceChildren();
    const choices=[['auto','Lukeman mukaan (+ kotiin, − pois)'],['auto-inverted','Lukeman mukaan (+ pois, − kotiin)'],['inflow','Aina kotiin (tuotto / tuonti)'],['outflow','Aina kodista pois (kulutus / vienti)'],['none','Ei animaatiota']];
    choices.forEach(([value,text])=>{const o=document.createElement('option');o.value=value;o.textContent=text;dir.append(o);});
    dir.value=oldDirection;
    const directionField=document.getElementById('node-direction-field');
    box.append(directionField); directionField.hidden=node.binding?.source==='flow';
    const speedField=document.getElementById('node-speed-field');box.append(speedField);speedField.hidden=!fixed;
    const help=document.createElement('p');help.className='source-detail';help.textContent='0 = automaattinen nopeus, 1–100 = oma nopeus. Nollateholla piste pysähtyy.';speedField.append(help);
  }
}
