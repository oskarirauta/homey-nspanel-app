// Studio preview rendering and simulated navigation.
// Uses the shared Studio state and editor callbacks; no initialization on load.

    // --- Screen Simulation ---
    function renderScreen() {
      const header = document.querySelector('.display-header');

      if (selectedPageId === 'screensaver') {
        if (header) header.style.display = 'none';
        const container = document.getElementById('screen-content');
        container.innerHTML = '';
        renderScreensaverScreen(container);
        return;
      }

      if (header) header.style.display = 'flex';

      const p = currentPages[selectedPageId];
      if (!p) return;

      const raw = typeof p.rawOptions === 'string' ? (() => { try { return JSON.parse(p.rawOptions); } catch { return {}; } })() : (p.rawOptions || {});
      const hasPin = !!(p.require_pin || p.pin || raw.require_pin || raw.pin);
      document.getElementById('screen-title').textContent = (p.title || 'NSPanel') + (hasPin ? ' 🔒' : '');

      const prevBtn = document.getElementById('header-prev');
      const nextBtn = document.getElementById('header-next');

      prevBtn.style.opacity = p.navigation?.leading?.target ? '1' : '0.2';
      nextBtn.style.opacity = p.navigation?.trailing?.target ? '1' : '0.2';

      const container = document.getElementById('screen-content');
      container.innerHTML = '';

      if (p.type === 'grid' || p.type === 'grid2') {
        renderGridScreen(container, p);
      } else if (p.type === 'entities') {
        renderEntitiesScreen(container, p);
      } else if (p.type === 'thermostat') {
        renderThermostatScreen(container, p);
      } else if (p.type === 'media') {
        renderMediaScreen(container, p);
      } else if (p.type === 'alarm') {
        renderAlarmScreen(container, p);
      } else if (p.type === 'qrcode') {
        renderQRCodeScreen(container, p);
      } else if (p.type === 'power') {
        renderPowerScreen(container, p);
      } else if (p.type === 'chart') {
        renderChartScreen(container, p);
      } else if (p.type === 'unlock' || p.type === 'cardUnlock') {
        renderUnlockScreen(container, p);
      }
    }

    function renderUnlockScreen(container, p) {
      const view = document.createElement('div');
      view.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:10px;text-align:center;background:#1a1d24;';
      view.innerHTML = `
        <div style="font-size: 1.05rem; font-weight: 600; margin-bottom: 6px; color:#fff;">🔒 ${p.title || Homey.__('studio.preview.enter_pin')}</div>
        <div style="display: flex; gap: 8px; margin-bottom: 12px; justify-content:center;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#38bdf8;"></span>
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#38bdf8;"></span>
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#38bdf8;"></span>
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,0.2);"></span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3, 44px);gap:6px;justify-content:center;">
          ${[1,2,3,4,5,6,7,8,9,'✕',0,'✓'].map(n => `<div style="background:rgba(255,255,255,0.08);border-radius:6px;height:30px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.85rem;color:#fff;">${n}</div>`).join('')}
        </div>
      `;
      container.appendChild(view);
    }

    function renderScreensaverScreen(container) {
      const view = document.createElement('div');
      view.className = 'screensaver-view' + (currentScreensaverConfig.background_color === 'black' ? ' theme-black' : '');
      view.title = Homey.__('studio.preview.screensaver_hint');
      view.onclick = () => {
        selectedPageId = 'active';
        updatePageDropdown();
        loadSelectedPage();
      };

      // Top bar for status icons
      const topBar = document.createElement('div');
      topBar.className = 'ss-top-bar';

      const ic1Div = document.createElement('div');
      ic1Div.className = 'ss-status-icon ss-status-left';
      if (currentScreensaverConfig.statusIcon1?.icon) {
        const glyph = document.createElement('span');
        glyph.className = 'ss-status-glyph';
        glyph.style.color = currentScreensaverConfig.statusIcon1.color || '#FFB74D';
        glyph.textContent = getSymbolForIcon(currentScreensaverConfig.statusIcon1.icon);
        ic1Div.appendChild(glyph);
      }

      const ic2Div = document.createElement('div');
      ic2Div.className = 'ss-status-icon ss-status-right';
      if (currentScreensaverConfig.statusIcon2?.icon) {
        const glyph = document.createElement('span');
        glyph.className = 'ss-status-glyph';
        glyph.style.color = currentScreensaverConfig.statusIcon2.color || '#4FC3F7';
        glyph.textContent = getSymbolForIcon(currentScreensaverConfig.statusIcon2.icon);
        ic2Div.appendChild(glyph);
      }

      topBar.appendChild(ic1Div);
      topBar.appendChild(ic2Div);

      // Time & Date area
      const timeArea = document.createElement('div');
      timeArea.className = 'ss-time-area';

      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const clock = document.createElement('div');
      clock.className = 'ss-clock';
      clock.textContent = `${hours}:${minutes}`;

      const dateStr = now.toLocaleDateString('fi-FI', { weekday: 'long', day: 'numeric', month: 'long' });
      const dateEl = document.createElement('div');
      dateEl.className = 'ss-date';
      dateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

      timeArea.appendChild(clock);
      timeArea.appendChild(dateEl);

      // Weather & temps
      const weatherSummary = document.createElement('div');
      weatherSummary.className = 'ss-weather-summary';
      weatherSummary.innerHTML = `
        <span class="ss-weather-main-icon">⛅</span>
        <span class="ss-temp-indoor">${Homey.__('studio.preview.indoor_temp')}</span>
        <span class="ss-temp-divider">•</span>
        <span class="ss-temp-outdoor">Ulkona: 14.0 °C</span>
      `;

      // 4-day forecast
      const fcRow = document.createElement('div');
      fcRow.className = 'ss-forecast-row';

      const days = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];
      const curDayIdx = (now.getDay() + 6) % 7; // Monday = 0
      const sampleIcons = ['☀️', '⛅', '🌧️', '🌦️'];
      const sampleTemps = ['16° / 8°', '15° / 7°', '12° / 6°', '13° / 5°'];

      for (let i = 1; i <= 4; i++) {
        const dIdx = (curDayIdx + i) % 7;
        const col = document.createElement('div');
        col.className = 'ss-fc-col';
        col.innerHTML = `
          <span class="ss-fc-day">${days[dIdx]}</span>
          <span class="ss-fc-icon">${sampleIcons[i - 1]}</span>
          <span class="ss-fc-temp">${sampleTemps[i - 1]}</span>
        `;
        fcRow.appendChild(col);
      }

      view.appendChild(topBar);
      view.appendChild(timeArea);
      view.appendChild(weatherSummary);
      view.appendChild(fcRow);

      container.appendChild(view);
    }

    function renderGridScreen(container, p) {
      const isGrid2 = p.type === 'grid2';
      const maxSlots = isGrid2 ? 8 : 6;
      const grid = document.createElement('div');
      grid.className = 'display-grid' + (isGrid2 ? ' grid8' : '');

      for (let i = 1; i <= maxSlots; i++) {
        const s = (p.rawOptions?.weatherForecast ? (i<=5?{title:new Intl.DateTimeFormat(Homey.language||'en',{weekday:'short'}).format(new Date(new Date().setDate(new Date().getDate()+i))),icon:'calendar',type:'text',val:'—'}:{type:'delete',title:' ',icon:''}) : p.slots?.[i]) || { title: Homey.__('studio.preview.empty_slot') + ' ' + i, icon: 'circle-outline', color: '#94a3b8', type: 'delete' };
        const cell = document.createElement('div');
        if(p.rawOptions?.weatherForecast && s.type==='delete')cell.style.visibility='hidden';
        cell.className = 'grid-cell' + (selectedSlot === i ? ' active' : '') + (s.val === '1' ? ' is-on' : '');
        if(!p.rawOptions?.weatherForecast)cell.onclick = () => selectSlot(i);

        if (s.type === 'delete') {
          cell.style.opacity = '0.35';
        }

        const icon = document.createElement('div');
        icon.className = 'grid-cell-icon';
        icon.style.color = s.color || '#fff';
        icon.textContent = getSymbolForIcon(s.icon);

        const title = document.createElement('div');
        title.className = 'grid-cell-title';
        title.textContent = s.title || `Slot ${i}`;

        const val = document.createElement('div');
        val.className = 'grid-cell-val';
        val.textContent = s.val ? (s.val === '1' ? Homey.__('studio.preview.on') : (s.val === '0' ? Homey.__('studio.preview.off') : s.val)) : (s.type === 'fan' || s.type === 'input_sel' || s.type === 'timer' || s.type === 'light' || s.type === 'shutter' ? Homey.__('studio.preview.open') : '');

        cell.appendChild(icon);
        cell.appendChild(title);
        cell.appendChild(val);

        if (s.require_pin || s.pin_required || s.pin) {
          const lockBadge = document.createElement('span');
          lockBadge.style.cssText = 'position:absolute;top:4px;right:6px;font-size:0.7rem;opacity:0.85;';
          lockBadge.textContent = '🔒';
          cell.style.position = 'relative';
          cell.appendChild(lockBadge);
        }

        grid.appendChild(cell);
      }
      container.appendChild(grid);
    }

    function renderEntitiesScreen(container, p) {
      const list = document.createElement('div');
      list.className = 'display-entities';

      for (let i = 1; i <= 4; i++) {
        const s = (p.rawOptions?.weatherForecast ? (i<=5?{title:new Intl.DateTimeFormat('fi',{weekday:'short'}).format(new Date(new Date().setDate(new Date().getDate()+i))),icon:'calendar',type:'text',val:'—'}:{type:'delete',title:' ',icon:''}) : p.slots?.[i]) || { title: 'Laite ' + i, icon: 'power', color: '#2696A8', type: 'switch', val: '0' };
        const row = document.createElement('div');
        row.className = 'entity-row' + (selectedSlot === i ? ' active' : '');
        row.onclick = () => selectSlot(i);

        const left = document.createElement('div');
        left.className = 'entity-left';

        const icon = document.createElement('span');
        icon.className = 'entity-icon';
        icon.textContent = getSymbolForIcon(s.icon);
        icon.style.color = s.color || '#fff';

        const title = document.createElement('span');
        title.className = 'entity-title';
        title.textContent = s.title || `Entiteetti ${i}`;

        left.appendChild(icon);
        left.appendChild(title);

        if (s.require_pin || s.pin_required || s.pin) {
          const lockSpan = document.createElement('span');
          lockSpan.style.cssText = 'margin-left:6px;font-size:0.75rem;opacity:0.85;';
          lockSpan.textContent = '🔒';
          left.appendChild(lockSpan);
        }

        const right = document.createElement('div');
        if (s.type === 'switch') {
          right.className = 'entity-toggle' + (s.val === '1' ? ' active' : '');
          const thumb = document.createElement('div');
          thumb.className = 'entity-toggle-thumb';
          right.appendChild(thumb);
        } else if (s.type === 'fan' || s.type === 'input_sel' || s.type === 'timer' || s.type === 'light' || s.type === 'shutter') {
          right.className = 'entity-text-val';
          right.textContent = s.val || (s.type === 'fan' ? '🌀 Avaa' : (s.type === 'timer' ? '⏱ 05:00' : (s.type === 'light' ? '💡 100 %' : (s.type === 'shutter' ? '↕ 50 %' : '📋 Valitse'))));
        } else {
          right.className = 'entity-text-val';
          right.textContent = s.val || (s.type === 'button' ? 'PAINIKE' : '---');
        }

        row.appendChild(left);
        row.appendChild(right);
        list.appendChild(row);
      }
      container.appendChild(list);
    }

    let thermoPopupPreviewActive = false;
    function toggleThermoPopupPreview() {
      thermoPopupPreviewActive = !thermoPopupPreviewActive;
      renderScreen();
    }

    function selectThermoPopupMode(row, modeName) {
      const p = currentPages[selectedPageId];
      if (!p) return;
      if (!p.rawOptions) p.rawOptions = {};
      if (row === 1) {
        p.rawOptions.currentMode1 = modeName;
        const el = document.getElementById('thermo-curmode1-input');
        if (el) el.value = modeName;
      } else if (row === 2) {
        p.rawOptions.currentMode2 = modeName;
        const el = document.getElementById('thermo-curmode2-input');
        if (el) el.value = modeName;
      } else if (row === 3) {
        p.rawOptions.currentMode3 = modeName;
        const el = document.getElementById('thermo-curmode3-input');
        if (el) el.value = modeName;
      }
      renderScreen();
    }

    function renderThermostatScreen(container, p) {
      const target = p.rawOptions?.target ?? 21.5;
      const current = p.rawOptions?.current ?? 20.8;
      const curMode1 = p.rawOptions?.currentMode1 || Homey.__('studio.preview.heating');

      const view = document.createElement('div');
      view.className = 'display-thermo';
      view.innerHTML = `
        <div class="thermo-dial">
          <div class="thermo-temp-target">${Number(target).toFixed(1)}<small>°C</small></div>
          <div class="thermo-temp-current">Nykyinen: ${Number(current).toFixed(1)} °C</div>
        </div>
        <div class="thermo-controls">
          <div class="thermo-btn" onclick="stepThermostat(-0.5)">−</div>
          <div class="thermo-modes" onclick="toggleThermoPopupPreview()" title="${Homey.__('studio.preview.thermo_modes_hint')}" style="cursor: pointer;">
            <span class="thermo-mode-badge active">${curMode1}</span>
            <span class="thermo-mode-badge" style="display:flex;align-items:center;gap:3px;">⚙ ${Homey.__('studio.preview.add')}</span>
          </div>
          <div class="thermo-btn" onclick="stepThermostat(0.5)">+</div>
        </div>
      `;
      container.appendChild(view);

      if (thermoPopupPreviewActive) {
        const popup = document.createElement('div');
        popup.className = 'popup-thermo-view';
        const h1 = p.rawOptions?.heading1 || Homey.__('studio.preview.mode_heading');
        const c1 = p.rawOptions?.currentMode1 || Homey.__('studio.preview.heating');
        const rawM1 = p.rawOptions?.modeList1 || [Homey.__('studio.preview.auto'),Homey.__('studio.preview.heating'),Homey.__('studio.preview.cooling'),Homey.__('studio.preview.off_mode')].join('?');
        const m1 = rawM1.split(rawM1.includes('?') ? '?' : ',');

        const h2 = p.rawOptions?.heading2 || Homey.__('studio.preview.preset_heading');
        const c2 = p.rawOptions?.currentMode2 || Homey.__('studio.preview.home');
        const rawM2 = p.rawOptions?.modeList2 || [Homey.__('studio.preview.home'),Homey.__('studio.preview.eco'),Homey.__('studio.preview.comfort'),Homey.__('studio.preview.boost')].join('?');
        const m2 = rawM2.split(rawM2.includes('?') ? '?' : ',');

        const h3 = p.rawOptions?.heading3 || Homey.__('studio.preview.fan_heading');
        const c3 = p.rawOptions?.currentMode3 || Homey.__('studio.preview.auto');
        const rawM3 = p.rawOptions?.modeList3 || [Homey.__('studio.preview.auto'),Homey.__('studio.preview.fan_low'),Homey.__('studio.preview.fan_mid'),Homey.__('studio.preview.fan_high')].join('?');
        const m3 = rawM3.split(rawM3.includes('?') ? '?' : ',');

        const renderButtons = (modes, cur, row) => {
          return modes.map(m => m.trim()).filter(Boolean).map(m => `
            <button type="button" class="popup-thermo-btn ${m === cur ? 'active' : ''}" onclick="selectThermoPopupMode(${row}, '${m}')">${m}</button>
          `).join('');
        };

        popup.innerHTML = `
          <div class="popup-thermo-header">
            <div class="popup-thermo-title">🌡 ${p.title || 'Termostaatti'}</div>
            <button type="button" class="popup-thermo-close" onclick="toggleThermoPopupPreview()" title="Sulje popup">✕</button>
          </div>
          <div class="popup-thermo-row">
            <div class="popup-thermo-row-title">${h1}</div>
            <div class="popup-thermo-btn-group">${renderButtons(m1, c1, 1)}</div>
          </div>
          <div class="popup-thermo-row">
            <div class="popup-thermo-row-title">${h2}</div>
            <div class="popup-thermo-btn-group">${renderButtons(m2, c2, 2)}</div>
          </div>
          <div class="popup-thermo-row">
            <div class="popup-thermo-row-title">${h3}</div>
            <div class="popup-thermo-btn-group">${renderButtons(m3, c3, 3)}</div>
          </div>
        `;
        container.appendChild(popup);
      }
    }

    function renderMediaScreen(container, p) {
      const title = p.rawOptions?.media?.title || 'Nemo';
      const artist = p.rawOptions?.media?.author || 'Nightwish';
      const vol = p.rawOptions?.volume ?? 65;

      const view = document.createElement('div');
      view.className = 'display-media';
      view.innerHTML = `
        <div class="media-art">🎵</div>
        <div>
          <div class="media-title">${title}</div>
          <div class="media-artist">${artist}</div>
        </div>
        <div class="media-controls">
          <span>⏮</span>
          <div class="media-play-btn">▶</div>
          <span>⏭</span>
        </div>
        <div class="media-vol-bar">
          <div class="media-vol-fill" style="width: ${vol}%"></div>
        </div>
      `;
      container.appendChild(view);
    }

    function renderAlarmScreen(container, p) {
      const state = p.rawOptions?.state || 'disarmed';
      const isDisarmed = state === 'disarmed';
      const isHome = state === 'armed_home' || state === 'partially_armed';
      const isAway = state === 'armed_away' || state === 'armed';
      const isNight = state === 'armed_night';
      const isArming = state === 'arming' || state === 'pending';
      const isTriggered = state === 'triggered';

      let statusColor = '#10b981';
      let statusIcon = '🛡';
      let statusText = Homey.__('studio.preview.alarm_disarmed');

      if (isHome) {
        statusColor = '#f59e0b';
        statusIcon = '🏠';
        statusText = Homey.__('studio.preview.alarm_home');
      } else if (isAway) {
        statusColor = '#ef4444';
        statusIcon = '🔒';
        statusText = Homey.__('studio.preview.alarm_armed');
      } else if (isNight) {
        statusColor = '#8b5cf6';
        statusIcon = '🌙';
        statusText = Homey.__('studio.preview.night_mode');
      } else if (isArming) {
        statusColor = '#f97316';
        statusIcon = '⏳';
        statusText = Homey.__('studio.preview.alarm_arming');
      } else if (isTriggered) {
        statusColor = '#dc2626';
        statusIcon = '🚨';
        statusText = Homey.__('studio.preview.alarm_active');
      }

      const labelDisarm = Homey.__('studio.preview.label_disarm');
      const labelHome = Homey.__('studio.preview.label_home');
      const labelAway = Homey.__('studio.preview.label_away');
      const labelNight = Homey.__('studio.preview.label_night');

      const view = document.createElement('div');
      view.className = 'display-alarm';
      view.innerHTML = `
        <div>
          <div class="alarm-status-icon" style="color: ${statusColor}">${statusIcon}</div>
          <div class="alarm-status-text" style="color: ${statusColor}">
            ${statusText}
          </div>
        </div>
        <div class="alarm-keypad">
          <div class="alarm-key">1</div><div class="alarm-key">2</div><div class="alarm-key">3</div>
          <div class="alarm-key">4</div><div class="alarm-key">5</div><div class="alarm-key">6</div>
          <div class="alarm-key">7</div><div class="alarm-key">8</div><div class="alarm-key">9</div>
          <div class="alarm-key">✕</div><div class="alarm-key">0</div><div class="alarm-key">✓</div>
        </div>
        <div class="alarm-modes-bar">
          ${isDisarmed ? `
            <div class="alarm-mode-btn" onclick="p.rawOptions.state='armed_home';renderScreen()">${labelHome}</div>
            <div class="alarm-mode-btn" onclick="p.rawOptions.state='armed_away';renderScreen()">${labelAway}</div>
            <div class="alarm-mode-btn" onclick="p.rawOptions.state='armed_night';renderScreen()">${labelNight}</div>
          ` : `
            <div class="alarm-mode-btn active" style="grid-column: span 3;" onclick="p.rawOptions.state='disarmed';renderScreen()">${labelDisarm}</div>
          `}
        </div>
      `;
      container.appendChild(view);
    }

    function renderQRCodeScreen(container, p) {
      const qr = p.rawOptions?.qrcode || p.title || 'Homey NSPanel';
      const view = document.createElement('div');
      view.className = 'display-qrcode';
      view.innerHTML = `
        <div class="qrcode-box">
          <div style="font-size: 5rem;">📱</div>
        </div>
        <div class="qrcode-text">${qr}</div>
      `;
      container.appendChild(view);
    }

    function renderPowerScreen(container, p) {
      try {
        const raw = ensurePowerOptions(p);
        const home = raw.home || { title: 'Koti', icon: 'home', color: 'white', consumption: '2.4 kW' };
        const nodes = raw.nodes || [];

        const view = document.createElement('div');
        view.className = 'display-power';

        let nodesHtml = '';
        let svgLines = '';

        const coords = [
          { x: 18, y: 18 }, // Node 0: Top-Left
          { x: 18, y: 50 }, // Node 1: Center-Left
          { x: 18, y: 82 }, // Node 2: Bottom-Left
          { x: 82, y: 18 }, // Node 3: Top-Right
          { x: 82, y: 50 }, // Node 4: Center-Right
          { x: 82, y: 82 }, // Node 5: Bottom-Right
        ];

        for (let i = 0; i < 6; i++) {
          const n = nodes[i] || {};
          const hasContent = !!(n.icon || n.title || (n.consumption !== undefined && n.consumption !== ''));
          const iconSym = getSymbolForIcon(n.icon || 'flash');
          const color = n.color || '#38bdf8';
          const title = n.title || `Solmu ${i + 1}`;
          const val = n.consumption !== undefined ? String(n.consumption) : '';
          let speed = typeof n.speed === 'number' ? n.speed : 0;
          if(n.autoSpeed !== undefined || n.flowDirection) {
            const match=String(n.consumption??'').trim().replace(',','.').match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(kW|W)?$/i);
            let watts=match?Number(match[1])*(match[2]?.toLowerCase()==='w'?1:1000):undefined;
            const direction=n.flowDirection||'auto';if(direction==='auto-inverted' && watts!==undefined)watts=-watts;
            const magnitude=n.autoSpeed||speed===0?(watts===undefined?0:Math.max(1,Math.min(100,Math.round(Math.abs(watts)/100)))):Math.abs(speed);
            speed=direction==='none'||watts===0?0:magnitude*(direction==='inflow'?1:direction==='outflow'?-1:Math.sign(watts??speed));
          }

          let animClass = '';
          if (speed > 0) animClass = 'flow-line-in';
          else if (speed < 0) animClass = 'flow-line-out';

          nodesHtml += `
            <div class="power-node-outer power-node-${i} ${selectedPowerNode === i ? 'active' : ''}" style="${hasContent ? '' : 'opacity: 0.25;'}" onclick="selectPowerNode(${i})">
              <div class="node-title">${escapeHtml(title)}</div>
              <div class="node-icon" style="color: ${color};">${iconSym}</div>
              <div class="node-power">${escapeHtml(val)}</div>
            </div>
          `;

          if (hasContent) {
            svgLines += `
              <line x1="${coords[i].x}%" y1="${coords[i].y}%" x2="50%" y2="50%" 
                    stroke="${color}" stroke-width="2" stroke-dasharray="4,4" 
                    class="${animClass}" opacity="0.65" />
            `;
          }
        }

        const homeIconSym = getSymbolForIcon(home.icon || 'home');
        const homeColor = home.color || '#38bdf8';
        const homeTitle = home.title || 'Koti';
        const homeVal = home.consumption || '';

        view.innerHTML = `
          <div class="power-flow-container">
            <svg class="power-flow-svg">
              ${svgLines}
            </svg>
            <div class="power-node-center">
              <div class="node-title">${homeTitle}</div>
              <div class="node-icon" style="color: ${homeColor};">${homeIconSym}</div>
              <div class="node-power">${homeVal}</div>
            </div>
            ${nodesHtml}
          </div>
        `;

        container.appendChild(view);
      } catch (err) {
        console.error('Failed to render power screen:', err);
        container.innerHTML = `<div style="color:var(--danger);padding:1rem;font-size:0.8rem;">${Homey.__('studio.preview.error_power_render').replace('{0}', err.message)}</div>`;
      }
    }

    function renderChartScreen(container, p) {
      try {
        const opts = typeof p.rawOptions === 'string' ? (() => { try { return JSON.parse(p.rawOptions); } catch { return {}; } })() : (p.rawOptions || {});
        const chartType = opts.chartType || 'bar';
        const unit = opts.unit || opts.yAxisLabel || '';
        const colorKey = opts.color || 'yellow';
        const colorMap = {
          yellow: '#eab308',
          green: '#22c55e',
          blue: '#3b82f6',
          red: '#ef4444',
          orange: '#f97316',
          cyan: '#06b6d4',
          white: '#f8fafc'
        };
        const barColor = colorMap[colorKey] || colorKey;

        let rawValues = opts.values ?? opts.data;
        let points = [];
        if (Array.isArray(rawValues) && rawValues.length > 0) {
          points = rawValues.map((item, idx) => {
            if (typeof item === 'object' && item !== null && 'value' in item) {
              return { value: Number(item.value) || 0, label: item.label };
            } else if (typeof item === 'string') {
              let valPart = item;
              let labelPart = undefined;
              if (valPart.includes('^')) {
                const s = valPart.split('^');
                valPart = s[0];
                labelPart = s[1];
              }
              if (valPart.includes(':')) {
                const s = valPart.split(':');
                valPart = s[1];
              }
              return { value: Number(valPart) || 0, label: labelPart };
            } else {
              return { value: Number(item) || 0 };
            }
          });
        } else {
          container.innerHTML=`<p style="padding:24px;color:var(--text-muted)">${Homey.__('studio.preview.no_chart_data')}</p>`;return;
        }

        const numVals = points.map(pt => pt.value);
        const maxVal = Math.max(...numVals, 10);

        let ticks = [maxVal, Math.round(maxVal * 0.75), Math.round(maxVal * 0.5), Math.round(maxVal * 0.25), 0];
        if (opts.yAxisTicks) {
          const rawTicks = Array.isArray(opts.yAxisTicks) ? opts.yAxisTicks : String(opts.yAxisTicks).split(':');
          const parsed = rawTicks.map(Number).filter(n => !isNaN(n));
          if (parsed.length > 0) {
            ticks = parsed.sort((a, b) => b - a);
            if (!ticks.includes(0)) ticks.push(0);
          }
        }

        const view = document.createElement('div');
        view.className = 'display-chart';

        let ticksHtml = `<div class="chart-unit-label">${escapeHtml(unit)}</div>`;
        ticks.forEach(t => {
          const displayTick = (unit === 'c/kWh' || unit === '°C') ? (t / 10).toFixed(1) : t;
          ticksHtml += `<div>${displayTick}</div>`;
        });

        let plotHtml = '';
        if (chartType === 'line') {
          const w = 380;
          const h = 170;
          const pts = points.map((pt, i) => {
            const x = (i / Math.max(points.length - 1, 1)) * w;
            const y = h - ((pt.value / maxVal) * (h - 20)) - 10;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(' ');

          plotHtml = `
            <div class="chart-bars-wrap" style="align-items: stretch; justify-content: stretch;">
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="overflow: visible;">
                <polyline fill="none" stroke="${barColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${pts}" />
                ${points.map((pt, i) => {
                  const x = (i / Math.max(points.length - 1, 1)) * w;
                  const y = h - ((pt.value / maxVal) * (h - 20)) - 10;
                  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${barColor}" />`;
                }).join('')}
              </svg>
            </div>
          `;
        } else {
          plotHtml = `
            <div class="chart-bars-wrap">
              ${points.map((pt, i) => {
                const pct = Math.max(Math.min((pt.value / maxVal) * 100, 100), 2);
                const displayVal = (unit === 'c/kWh' || unit === '°C') ? (pt.value / 10).toFixed(1) : pt.value;
                const title = `${pt.label || `${i}:00`}: ${displayVal} ${unit}`;
                return `
                  <div class="chart-bar-col" title="${escapeHtml(title)}">
                    <div class="chart-bar-rect" style="height: ${pct}%; background: ${barColor};"></div>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }

        const xLabelsHtml = `
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:00</span>
        `;

        view.innerHTML = `
          <div class="chart-main">
            <div class="chart-y-axis">${ticksHtml}</div>
            <div class="chart-plot-area">
              ${plotHtml}
              <div class="chart-x-labels">${xLabelsHtml}</div>
            </div>
          </div>
        `;

        container.appendChild(view);
      } catch (err) {
        console.error('Failed to render chart screen:', err);
        container.innerHTML = `<div style="color:var(--danger);padding:1rem;font-size:0.8rem;">${Homey.__('studio.preview.error_chart_render').replace('{0}', err.message)}</div>`;
      }
    }


    // --- Simulator Navigation ---
    function simulateNavigate(dir) {
      const p = currentPages[selectedPageId];
      if (!p) return;

      const target = dir === 'prev' ? p.navigation?.leading?.target : p.navigation?.trailing?.target;
      if (!target) return;

      if (target === 'screensaver') {
        simulateScreensaver();
        return;
      }

      if (currentPages[target]) {
        selectedPageId = target;
        document.getElementById('page-select').value = target;
        loadSelectedPage();
      }
    }

    function simulateScreensaver() {
      const header = document.querySelector('.display-header');
      if (header) header.style.display = 'none';
      const container = document.getElementById('screen-content');
      container.innerHTML = '';
      renderScreensaverScreen(container);
    }


    // --- Icon Helpers ---
    function getSymbolForIcon(name) {
      if (!name) return '💡';
      const s = String(name).toLowerCase();
      if (s.includes('home')) return '🏠';
      if (s.includes('solar') || s.includes('sun')) return '☀️';
      if (s.includes('battery')) return '🔋';
      if (s.includes('tower') || s.includes('grid') || s.includes('transmission')) return '🗼';
      if (s.includes('car') || s.includes('auto')) return '🚗';
      if (s.includes('heat') || s.includes('radiator') || s.includes('pump')) return '♨️';
      if (s.includes('socket') || s.includes('plug') || s.includes('power')) return '🔌';
      if (s.includes('washing')) return '🧺';
      if (s.includes('flash') || s.includes('bolt') || s.includes('electric')) return '⚡';
      if (s.includes('light')) return '💡';
      if (s.includes('lamp')) return '🛋';
      if (s.includes('tv') || s.includes('television')) return '📺';
      if (s.includes('music')) return '🎵';
      if (s.includes('fan')) return '🌀';
      if (s.includes('lock')) return '🔒';
      if (s.includes('shield') || s.includes('alarm')) return '🛡';
      if (s.includes('temp') || s.includes('thermometer')) return '🌡';
      if (s.includes('clock')) return '⏰';
      return '●';
    }

