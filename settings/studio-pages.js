// Page lifecycle and editor actions. Draft persistence is owned by studio-save.js.
function studioPageIdAvailable(id) {
  return /^[\w-]+$/.test(id) && !['screensaver','__proto__','constructor','prototype'].includes(id) && !currentPages[id];
}

function onPageIdChange() {
  const input=document.getElementById('page-id-input');const newId=input.value.trim();const oldId=selectedPageId;
  if(typeof studioSaving!=='undefined' && (studioSaving || studioDeletions.has(oldId))){input.value=oldId;return;}
  if(newId===oldId)return;
  if(oldId==='active'||!studioPageIdAvailable(newId)) {
    input.value=oldId;document.getElementById('push-status').textContent='Tunniste on varattu tai virheellinen. Oletussivun active-tunnistetta ei voi vaihtaa.';return;
  }
  const page=currentPages[oldId];if(!page._renameFrom && devices.find(d=>d.id===selectedDeviceId)?.pages?.[oldId])page._renameFrom=oldId;
  currentPages[newId]=page;delete currentPages[oldId];studioDirty.delete(oldId);selectedPageId=newId;
  for(const [id,p] of Object.entries(currentPages)) {
    for(const side of ['leading','trailing'])if(p.navigation?.[side]?.target===oldId)p.navigation[side].target=newId;
    for(const slot of Object.values(p.slots||{})) {
      if(slot.binding?.source==='navigate'&&slot.binding.target===oldId)slot.binding.target=newId;
      if(slot.type==='navigate')for(const key of ['id','name','target'])if(slot[key]===oldId)slot[key]=newId;
    }
    markStudioDirty(id);
  }
  let buttonsChanged=false;
  for(const binding of Object.values(studioBindings.buttons||{})) {
    if(binding.source==='navigate' && binding.target===oldId){binding.target=newId;buttonsChanged=true;}
  }
  if(buttonsChanged)markStudioDirty('screensaver');
  updatePageDropdown();
}

function onTitleChange() {
  const title = document.getElementById('page-title-input').value;
  if (currentPages[selectedPageId]) {
    currentPages[selectedPageId].title = title;
  }
  document.getElementById('screen-title').textContent = title;
  updatePageDropdown();
}

function onPageTypeChange() {
  const type = document.getElementById('page-type-select').value;
  if (currentPages[selectedPageId]) {
    currentPages[selectedPageId].type = type;
    if(currentPages[selectedPageId].rawOptions?.weatherForecast)delete currentPages[selectedPageId].rawOptions.weatherForecast;
    if (!currentPages[selectedPageId].slots) currentPages[selectedPageId].slots = {};
    if (type === 'power') {
      ensurePowerOptions(currentPages[selectedPageId]);
    } else if (type === 'chart') {
      if (!currentPages[selectedPageId].rawOptions) {
        currentPages[selectedPageId].rawOptions = {
          title: currentPages[selectedPageId].title || Homey.__('studio.pages.electricity_price'),
          chartType: 'bar',
          unit: 'c/kWh',
          color: 'yellow',
          yAxisTicks: [10, 20, 30, 40, 50],
          binding: {source:'flow'}, values: []
        };
      }
    }
  }
  renderScreen();
  renderEditor();
}

function onNavigationChange() {
  const leading = document.getElementById('prev-page-select').value;
  const trailing = document.getElementById('next-page-select').value;

  if (!currentPages[selectedPageId].navigation) {
    currentPages[selectedPageId].navigation = {};
  }

  currentPages[selectedPageId].navigation.leading = leading ? { target: leading } : undefined;
  currentPages[selectedPageId].navigation.trailing = trailing ? { target: trailing } : undefined;

  renderScreen();
}

// --- Inline Modal for New Page ---
function openNewPageModal() {
  const modal = document.getElementById('modal-new-page');
  let count = Object.keys(currentPages).length + 1;
  while(!studioPageIdAvailable('sivu_'+count))count++;
  const idInput = document.getElementById('modal-page-id');
  const titleInput = document.getElementById('modal-page-title');
  const typeSelect = document.getElementById('modal-page-type');
  const prevSelect = document.getElementById('modal-prev-target');
  const nextSelect = document.getElementById('modal-next-target');
  const errDiv = document.getElementById('modal-new-page-err');

  errDiv.textContent = '';
  idInput.value = 'sivu_' + count;
  titleInput.value = 'Sivu ' + count;
  typeSelect.value = 'grid';

  // Populate navigation dropdowns
  const baseOpts = [
    { val: '', label: Homey.__('studio.pages.no_action') },
    { val: 'screensaver', label: 'screensaver (Lepotila)' },
    ...Object.keys(currentPages).map(pid => ({ val: pid, label: `${pid} (${currentPages[pid].title || 'Sivu'})` }))
  ];

  [prevSelect, nextSelect].forEach((sel, idx) => {
    sel.innerHTML = '';
    baseOpts.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.val;
      opt.textContent = o.label;
      sel.appendChild(opt);
    });
    if (idx === 0) sel.value = 'active';
    else sel.value = '';
  });

  modal.style.display = 'flex';
  setTimeout(() => idInput.focus(), 60);
}

function closeNewPageModal() {
  document.getElementById('modal-new-page').style.display = 'none';
}

function confirmCreateNewPage() {
  const idInput = document.getElementById('modal-page-id');
  const titleInput = document.getElementById('modal-page-title');
  const typeSelect = document.getElementById('modal-page-type');
  const prevSelect = document.getElementById('modal-prev-target');
  const nextSelect = document.getElementById('modal-next-target');
  const errDiv = document.getElementById('modal-new-page-err');

  const rawId = idInput.value.trim().toLowerCase();
  const cleanId = rawId;

  if (!/^[a-z0-9_-]+$/.test(cleanId)) {
    errDiv.textContent = Homey.__('studio.pages.id_format_error');
    return;
  }

  if (!studioPageIdAvailable(cleanId)) {
    errDiv.textContent = Homey.__('studio.pages.id_reserved').replace('{0}', cleanId);
    return;
  }

  const title = titleInput.value.trim() || cleanId;
  const type = typeSelect.value;
  const prev = prevSelect.value;
  const next = nextSelect.value;

  currentPages[cleanId] = {
    type: type,
    title: title,
    navigation: {
      leading: prev ? { target: prev } : undefined,
      trailing: next ? { target: next } : undefined
    },
    slots: {
      1: { title: 'Toiminto 1', icon: 'power', color: '#2696A8', type: 'button', id: 'btn_1', val: '' }
    }
  };

  if (type === 'power') {
    currentPages[cleanId].rawOptions = {
      title: title,
      home: { title: 'Koti', icon: 'home', color: 'white', consumption: '2.4 kW' },
      nodes: [
        { title: 'Verkko', icon: 'transmission-tower', color: 'orange', consumption: '1.2 kW', speed: 20 },
        { title: 'Akku', icon: 'battery-charging', color: 'green', consumption: '0.8 kW', speed: -15 },
        { title: Homey.__('studio.pages.heat_pump'), icon: 'heat-pump', color: 'cyan', consumption: '1.6 kW', speed: -25 },
        { title: 'Aurinko', icon: 'solar-power', color: 'yellow', consumption: '3.5 kW', speed: 35 },
        { title: Homey.__('studio.pages.electric_car'), icon: 'car-electric', color: 'blue', consumption: '11.0 kW', speed: -45 },
        { title: 'Muu kuorma', icon: 'power-socket-eu', color: 'purple', consumption: '0.6 kW', speed: -10 }
      ]
    };
  } else if (type === 'chart') {
    currentPages[cleanId].rawOptions = {
      title: title,
      chartType: 'bar',
      unit: 'c/kWh',
      color: 'yellow',
      yAxisTicks: [10, 20, 30, 40, 50],
      binding: {source:'flow'}, values: []
    };
  }

  selectedPageId = cleanId;
  closeNewPageModal();
  updatePageDropdown();
  loadSelectedPage();
}

// --- Page Reordering & Duplication ---
function movePageUp() {
  if (selectedPageId === 'screensaver') return;
  const keys = Object.keys(currentPages).sort((a,b)=>(currentPages[a].order??Number.MAX_SAFE_INTEGER)-(currentPages[b].order??Number.MAX_SAFE_INTEGER));
  const idx = keys.indexOf(selectedPageId);
  if (idx > 0) {
    const temp = keys[idx];
    keys[idx] = keys[idx - 1];
    keys[idx - 1] = temp;
    const newPages = {};
    keys.forEach(k => { newPages[k] = currentPages[k]; });
    currentPages = newPages;
    keys.forEach((key,index)=>{currentPages[key].order=index;markStudioDirty(key);});
    updatePageDropdown();
    markStudioDirty(selectedPageId);
  }
}

function movePageDown() {
  if (selectedPageId === 'screensaver') return;
  const keys = Object.keys(currentPages).sort((a,b)=>(currentPages[a].order??Number.MAX_SAFE_INTEGER)-(currentPages[b].order??Number.MAX_SAFE_INTEGER));
  const idx = keys.indexOf(selectedPageId);
  if (idx >= 0 && idx < keys.length - 1) {
    const temp = keys[idx];
    keys[idx] = keys[idx + 1];
    keys[idx + 1] = temp;
    const newPages = {};
    keys.forEach(k => { newPages[k] = currentPages[k]; });
    currentPages = newPages;
    keys.forEach((key,index)=>{currentPages[key].order=index;markStudioDirty(key);});
    updatePageDropdown();
    markStudioDirty(selectedPageId);
  }
}

function duplicateCurrentPage() {
  if (selectedPageId === 'screensaver') return;
  const src = currentPages[selectedPageId];
  if (!src) return;
  let baseId = selectedPageId + '_copy';
  let newId = baseId;
  let counter = 2;
  while (currentPages[newId]) {
    newId = `${baseId}_${counter++}`;
  }
  const copy = JSON.parse(JSON.stringify(src));
  // A duplicate is a new page, never the pending rename of its source.
  delete copy._renameFrom;
  copy.order=Math.max(-1,...Object.values(currentPages).map(p=>p.order??-1))+1;
  copy.title = (copy.title || selectedPageId) + ' (Kopio)';
  currentPages[newId] = copy;
  selectedPageId = newId;
  updatePageDropdown();
  loadSelectedPage();
  markStudioDirty(newId);
}

// --- Inline Modal for Delete Page ---
function deleteCurrentPage() {
  if (selectedPageId === 'screensaver') {
    alert('Et voi poistaa laitteen lepotilasivua!');
    return;
  }
  if (Object.keys(currentPages).length <= 1) {
    alert('Et voi poistaa ainoaa sivua!');
    return;
  }
  document.getElementById('delete-page-desc').textContent =
    `Poistetaanko sivu "${selectedPageId}" (${currentPages[selectedPageId]?.title || ''}) seuraavalla tallennuksella? Voit perua poiston ennen tallennusta.`;
  document.getElementById('modal-delete-page').style.display = 'flex';
}

function closeDeletePageModal() {
  document.getElementById('modal-delete-page').style.display = 'none';
}

function confirmDeleteCurrentPage() {
  queueStudioDeletion();
  closeDeletePageModal();
}

