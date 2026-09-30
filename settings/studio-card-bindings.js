function renderThermoBinding() {
  document.getElementById('thermo-binding-editor')?.remove();
  const parent = document.createElement('div');
  parent.id = 'thermo-binding-editor';
  document.getElementById('editor-thermostat').prepend(parent);
  const p = currentPages[selectedPageId];
  if (!p) return;
  if (!p.rawOptions) p.rawOptions = {};
  const linked=p.rawOptions.binding?.source==='homey';
  ["thermo-target-input", "thermo-current-input"].forEach(id=>document.getElementById(id).closest('.form-group').hidden=linked);
  if(linked){const note=document.createElement('p');note.className='source-detail';note.textContent='Arvot päivittyvät valitulta Homey-laitteelta. Paneelin ohjaimet ohjaavat laitetta suoraan.';parent.append(note);}
  sourceEditor(parent, p.rawOptions.binding, 'thermostat', (b, d) => {
    p.rawOptions.binding = b;
    if (b.source === 'homey' && d) {
      p.title = d.name || p.title;
      document.getElementById('page-title-input').value = p.title;
      const targetCap = d.capabilities.find(c => c.id === 'target_temperature');
      const curCap = d.capabilities.find(c => c.id === 'measure_temperature');
      if (typeof targetCap?.value === 'number') {
        p.rawOptions.target = targetCap.value;
        document.getElementById('thermo-target-input').value = targetCap.value;
      }
      if (typeof curCap?.value === 'number') {
        p.rawOptions.current = curCap.value;
        document.getElementById('thermo-current-input').value = curCap.value;
      }
    }
    renderThermoBinding();
    renderScreen();
  });
}

function renderMediaBinding() {
  document.getElementById('media-binding-editor')?.remove();
  const parent = document.createElement('div');
  parent.id = 'media-binding-editor';
  document.getElementById('editor-media').prepend(parent);
  const p = currentPages[selectedPageId];
  if (!p) return;
  if (!p.rawOptions) p.rawOptions = {};
  const linked=p.rawOptions.binding?.source==='homey';
  ["media-title-input", "media-artist-input", "media-vol-input"].forEach(id=>document.getElementById(id).closest('.form-group').hidden=linked);
  if(linked){const note=document.createElement('p');note.className='source-detail';note.textContent='Arvot päivittyvät valitulta Homey-laitteelta. Paneelin ohjaimet ohjaavat laitetta suoraan.';parent.append(note);}
  sourceEditor(parent, p.rawOptions.binding, 'media', (b, d) => {
    p.rawOptions.binding = b;
    if (b.source === 'homey' && d) {
      p.title = d.name || p.title;
      document.getElementById('page-title-input').value = p.title;
      if (!p.rawOptions.media) p.rawOptions.media = {};
      const trackCap = d.capabilities.find(c => c.id === 'speaker_track');
      const artistCap = d.capabilities.find(c => c.id === 'speaker_artist');
      const playingCap = d.capabilities.find(c => c.id === 'speaker_playing');
      const volCap = d.capabilities.find(c => c.id === 'volume_set');
      if (trackCap?.value) { p.rawOptions.media.title = String(trackCap.value); document.getElementById('media-title-input').value = trackCap.value; }
      if (artistCap?.value) { p.rawOptions.media.author = String(artistCap.value); document.getElementById('media-artist-input').value = artistCap.value; }
      if (typeof playingCap?.value === 'boolean') { p.rawOptions.paused = !playingCap.value; }
      if (typeof volCap?.value === 'number') { p.rawOptions.volume = Math.round(volCap.value * 100); document.getElementById('media-vol-input').value = Math.round(volCap.value * 100); }
    }
    renderMediaBinding();
    renderScreen();
  });
}

function renderAlarmBinding() {
  document.getElementById('alarm-binding-editor')?.remove();
  const parent = document.createElement('div');
  parent.id = 'alarm-binding-editor';
  const container = document.getElementById('alarm-binding-container');
  if (container) container.append(parent);
  else document.getElementById('editor-alarm')?.prepend(parent);
  const p = currentPages[selectedPageId];
  if (!p) return;
  if (!p.rawOptions) p.rawOptions = {};
  sourceEditor(parent, p.rawOptions.binding, 'alarm', (b, d) => {
    p.rawOptions.binding = b;
    if (b.source === 'homey' && d) {
      p.title = d.name || p.title;
      document.getElementById('page-title-input').value = p.title;
      const stateCap = d.capabilities?.find(c => c.id === 'homealarm_state');
      if (stateCap && stateCap.value !== undefined) {
        let mapped = String(stateCap.value);
        if (mapped === 'armed') mapped = 'armed_away';
        else if (mapped === 'partially_armed') mapped = 'armed_home';
        p.rawOptions.state = mapped;
        const stateSelect = document.getElementById('alarm-state-select');
        if (stateSelect) stateSelect.value = mapped;
      }
    }
    renderAlarmBinding();
    markStudioDirty(selectedPageId);
    renderScreen();
  });
}


function renderChartBinding() {
  document.getElementById('chart-binding-editor')?.remove();
  const parent = document.createElement('div');
  parent.id = 'chart-binding-editor';
  const container = document.getElementById('chart-binding-container');
  if (container) container.append(parent);
  const p = currentPages[selectedPageId];
  if (!p) return;
  if (!p.rawOptions) p.rawOptions = {};
  if(p.rawOptions.chartSource==='met'||p.rawOptions.weatherForecast)p.rawOptions.binding={source:'met'};
  if(p.rawOptions.binding?.source==='spot')p.rawOptions.binding={source:'flow'};
  if(p.rawOptions.binding?.source==='met') {
    const note=document.createElement('p');note.className='source-detail';note.textContent='Käyttää kaikkien paneelien yhteistä MET-ennustetta.';parent.append(note);
    const button=document.createElement('button');button.className='btn';button.textContent='Avaa yhteiset sääasetukset';button.onclick=()=>openStudioSettings('services');parent.append(button);
  }
  sourceEditor(parent, p.rawOptions.binding, 'chart', (b, d, c) => {
    p.rawOptions.binding = b;
    if (b.source === 'met') {
      p.rawOptions.chartSource = 'met';
      delete p.rawOptions.weatherForecast;
      p.rawOptions.chartType = 'line';
      p.rawOptions.unit = '°C';
      p.rawOptions.yAxisLabel = '°C';
      p.rawOptions.color = 'cyan';
      delete p.rawOptions.yAxisTicks;
      p.title = 'Lämpötilaennuste 24h';
      document.getElementById('page-title-input').value = p.title;
      p.rawOptions.values = [];
    } else if (b.source === 'spot') {
      delete p.rawOptions.chartSource;
      delete p.rawOptions.weatherForecast;
      p.rawOptions.chartType = 'bar';
      p.rawOptions.unit = 'c/kWh';
      p.rawOptions.yAxisLabel = 'c/kWh';
      p.rawOptions.color = 'yellow';
      p.rawOptions.yAxisTicks = [10, 20, 30, 40, 50];
      p.title = 'Pörssisähkö';
      document.getElementById('page-title-input').value = p.title;
      p.rawOptions.values = [45, 38, 32, 28, 35, 52, 78, 115, 130, 95, 82, 70, 62, 58, 68, 85, 110, 145, 135, 120, 98, 82, 65, 50];
    } else if (b.source === 'homey' && d) {
      delete p.rawOptions.chartSource;
      delete p.rawOptions.weatherForecast;
      if (!p.title || p.title === 'Sivu' || p.title === 'Pörssisähkö' || p.title === 'Lämpötilaennuste 24h') {
        p.title = d.name || p.title;
        document.getElementById('page-title-input').value = p.title;
      }
      if (c) {
        if (c.id === 'measure_temperature') {
          p.rawOptions.unit = '°C';
          p.rawOptions.yAxisLabel = '°C';
          p.rawOptions.chartType = 'line';
          p.rawOptions.color = 'cyan';
          delete p.rawOptions.yAxisTicks;
        } else if (c.id === 'measure_power') {
          p.rawOptions.unit = 'W';
          p.rawOptions.yAxisLabel = 'W';
          p.rawOptions.chartType = 'line';
          p.rawOptions.color = 'yellow';
          delete p.rawOptions.yAxisTicks;
        } else if (c.id === 'measure_humidity') {
          p.rawOptions.unit = '%';
          p.rawOptions.yAxisLabel = '%';
          p.rawOptions.chartType = 'line';
          p.rawOptions.color = 'blue';
          p.rawOptions.yAxisTicks = [20, 40, 60, 80, 100];
        } else if (c.id === 'meter_power') {
          p.rawOptions.unit = 'kWh';
          p.rawOptions.yAxisLabel = 'kWh';
          p.rawOptions.chartType = 'bar';
          p.rawOptions.color = 'orange';
          delete p.rawOptions.yAxisTicks;
        } else if (c.units) {
          p.rawOptions.unit = c.units;
          p.rawOptions.yAxisLabel = c.units;
        }
      }
    } else {
      delete p.rawOptions.chartSource;
      delete p.rawOptions.weatherForecast;
    }
    renderChartBinding();
    loadChartConfig(p);
    renderScreen();
  });
}
