// Energy card form editing and node motion settings.
    function loadPowerConfig() {
      const p = currentPages[selectedPageId];
      if (!p) return;
      const raw = ensurePowerOptions(p);

      const titleEl = document.getElementById('power-home-title');
      const powerEl = document.getElementById('power-home-power');
      const iconEl = document.getElementById('power-home-icon');
      const colorEl = document.getElementById('power-home-color');

      if (titleEl) titleEl.value = raw.home.title || 'Koti';
      if (powerEl) powerEl.value = raw.home.consumption !== undefined ? raw.home.consumption : '';
      if (iconEl) iconEl.value = raw.home.icon || 'home';
      if (colorEl) colorEl.value = raw.home.color || 'white';

      renderPowerNodeTabs();
      loadPowerNodeDetail(selectedPowerNode);
      renderPowerBinding(true);
    }

    function renderPowerNodeTabs() {
      const p = currentPages[selectedPageId];
      if (!p) return;
      const raw = ensurePowerOptions(p);
      const container = document.getElementById('power-node-tabs');
      if (!container) return;
      container.innerHTML = '';

      for (let i = 0; i < 6; i++) {
        const n = raw.nodes[i] || {};
        const title = n.title || `Solmu ${i + 1}`;
        const btn = document.createElement('div');
        btn.className = 'slot-tab-btn' + (selectedPowerNode === i ? ' active' : '');
        btn.innerHTML = `<span style="opacity:0.6;font-size:0.7rem;margin-right:2px;">#${i + 1}</span> ${escapeHtml(title)}`;
        btn.onclick = () => selectPowerNode(i);
        container.appendChild(btn);
      }
    }

    function selectPowerNode(i) {
      savePowerCurrentNodeDetail();
      selectedPowerNode = i;
      renderPowerNodeTabs();
      loadPowerNodeDetail(i);
      renderScreen();
    }

    function loadPowerNodeDetail(i) {
      const p = currentPages[selectedPageId];
      if (!p) return;
      const raw = ensurePowerOptions(p);
      const node = raw.nodes[i] || {};
      const container = document.getElementById('power-node-detail');
      if (!container) return;

      const speedVal = typeof node.speed === 'number' ? node.speed : 0;
      let dirVal = 'none';
      if (speedVal > 0) dirVal = 'inflow';
      else if (speedVal < 0) dirVal = 'outflow';

      container.innerHTML = `
        <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 0.6rem; color: var(--accent); display: flex; justify-content: space-between; align-items: center;">
          <span>${powerNodeNames()[i]}</span>
          <button class="btn btn-sm" onclick="clearPowerNode(${i})" style="font-size: 0.68rem; padding: 2px 7px; color: var(--danger); border-color: rgba(239,68,68,0.3);">Tyhjennä</button>
        </div>
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
          <div class="form-group" style="flex: 1;">
            <label>Otsikko / Nimi</label>
            <input type="text" id="pnode-title" class="form-control" value="${escapeHtml(node.title || '')}" oninput="updatePowerNodeField(${i}, 'title', this.value)">
          </div>
          <div class="form-group" id="node-power-default" style="flex: 1;">
            <label for="pnode-power">Oletusteho</label>
            <input type="text" id="pnode-power" class="form-control" value="${escapeHtml(node.consumption !== undefined ? node.consumption : '')}" oninput="updatePowerNodeField(${i}, 'consumption', this.value)">
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
          <div class="form-group" style="flex: 1;">
            <label>Kuvake (MDI)</label>
            <input type="text" id="pnode-icon" class="form-control" value="${escapeHtml(node.icon || '')}" oninput="updatePowerNodeField(${i}, 'icon', this.value)">
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 5px;">
              ${['transmission-tower', 'solar-power', 'battery-charging', 'car-electric', 'heat-pump', 'washing-machine', 'power-socket-eu', 'flash'].map(ic => `
                <span onclick="setPowerNodeIcon(${i}, '${ic}')" title="${ic}" style="cursor: pointer; font-size: 0.68rem; padding: 1px 5px; background: rgba(255,255,255,0.08); border-radius: 3px;">${ic}</span>
              `).join('')}
            </div>
          </div>
          <div class="form-group" style="flex: 1;">
            <label>Väri</label>
            <input type="text" id="pnode-color" class="form-control" value="${escapeHtml(node.color || 'white')}" oninput="updatePowerNodeField(${i}, 'color', this.value)">
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; align-items: center;">
              ${['orange', 'yellow', 'green', 'blue', 'cyan', 'purple', 'red', 'white'].map(col => `
                <span onclick="setPowerNodeColor(${i}, '${col}')" title="${col}" style="cursor: pointer; width: 16px; height: 16px; border-radius: 50%; background: ${col}; display: inline-block; border: 1px solid rgba(255,255,255,0.25);"></span>
              `).join('')}
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <div class="form-group" id="node-direction-field" style="flex: 1;">
            <label for="pnode-dir">Virtaussuunta</label>
            <select id="pnode-dir" class="form-control" onchange="updatePowerNodeDir(${i}, this.value)">
              <option value="inflow" ${dirVal === 'inflow' ? 'selected' : ''}>Kotiin päin (Tuotto / Tuonti)</option>
              <option value="outflow" ${dirVal === 'outflow' ? 'selected' : ''}>Kodista ulos (Kulutus / Lataus)</option>
              <option value="none" ${dirVal === 'none' ? 'selected' : ''}>Ei virtausta (Pysähdyksissä)</option>
            </select>
          </div>
          <div class="form-group" id="node-speed-field" style="flex: 1;">
            <label for="pnode-speed">Nopeus (0 = automaattinen)</label>
            <input type="number" id="pnode-speed" class="form-control" min="0" max="100" value="${node.autoSpeed ? 0 : Math.abs(speedVal)}" oninput="updatePowerNodeSpeed(${i}, this.value)">
          </div>
        </div>
      `;
      renderPowerBinding(false);
    }

    function savePowerCurrentNodeDetail() {
      const p = currentPages[selectedPageId];
      if (!p) return;
      const raw = ensurePowerOptions(p);

      const titleEl = document.getElementById('pnode-title');
      const powerEl = document.getElementById('pnode-power');
      const iconEl = document.getElementById('pnode-icon');
      const colorEl = document.getElementById('pnode-color');
      const dirEl = document.getElementById('pnode-dir');
      const speedEl = document.getElementById('pnode-speed');

      if (titleEl) raw.nodes[selectedPowerNode].title = titleEl.value.trim();
      if (powerEl) raw.nodes[selectedPowerNode].consumption = powerEl.value.trim();
      if (iconEl) raw.nodes[selectedPowerNode].icon = iconEl.value.trim();
      if (colorEl) raw.nodes[selectedPowerNode].color = colorEl.value.trim();

      if (dirEl && speedEl && (!raw.nodes[selectedPowerNode].binding || raw.nodes[selectedPowerNode].binding.source !== 'flow')) {
        setNodeMotion(raw.nodes[selectedPowerNode], dirEl.value, speedEl.value);
      }
    }

    function setNodeMotion(node, direction, speed) {
      const magnitude=Math.max(0,Math.min(100,Number(speed)||0));
      node.autoSpeed=node.binding?.source==='homey' || magnitude===0;
      node.flowDirection=direction;
      node.speed=direction==='none'?0:(direction==='outflow'?-1:1)*magnitude;
      if(node.binding)delete node.binding.invert;
    }

    function clearPowerNode(i) {
      const p = currentPages[selectedPageId];
      if (!p) return;
      const raw = ensurePowerOptions(p);
      raw.nodes[i] = { title: '', icon: '', color: 'white', consumption: '', speed: 0 };
      renderPowerNodeTabs();
      loadPowerNodeDetail(i);
      renderScreen();
    }

    function setPowerNodeIcon(i, iconName) {
      const p = currentPages[selectedPageId];
      if (!p) return;
      const raw = ensurePowerOptions(p);
      raw.nodes[i].icon = iconName;
      const input = document.getElementById('pnode-icon');
      if (input) input.value = iconName;
      renderScreen();
    }

    function setPowerNodeColor(i, colorName) {
      const p = currentPages[selectedPageId];
      if (!p) return;
      const raw = ensurePowerOptions(p);
      raw.nodes[i].color = colorName;
      const input = document.getElementById('pnode-color');
      if (input) input.value = colorName;
      renderScreen();
    }

    function updatePowerConfig() {
      const p = currentPages[selectedPageId];
      if (!p) return;
      const raw = ensurePowerOptions(p);

      const titleEl = document.getElementById('power-home-title');
      const powerEl = document.getElementById('power-home-power');
      const iconEl = document.getElementById('power-home-icon');
      const colorEl = document.getElementById('power-home-color');

      if (titleEl) raw.home.title = titleEl.value;
      if (powerEl) raw.home.consumption = powerEl.value;
      if (iconEl) raw.home.icon = iconEl.value;
      if (colorEl) raw.home.color = colorEl.value;

      renderScreen();
    }

    function updatePowerNodeField(index, field, value) {
      const p = currentPages[selectedPageId];
      if (!p) return;
      const raw = ensurePowerOptions(p);
      raw.nodes[index][field] = value;
      if (field === 'title') renderPowerNodeTabs();
      renderScreen();
    }

    function updatePowerNodeDir(index, dir) {
      const node=ensurePowerOptions(currentPages[selectedPageId]).nodes[index];
      setNodeMotion(node, dir, document.getElementById('pnode-speed')?.value);
      renderScreen();
    }
    function updatePowerNodeSpeed(index, speed) {
      const node=ensurePowerOptions(currentPages[selectedPageId]).nodes[index];
      setNodeMotion(node, document.getElementById('pnode-dir')?.value || 'auto', speed);
      renderScreen();
    }

    function applyPowerDefaults() {
      const p = currentPages[selectedPageId];
      if (!p) return;
      if (typeof p.rawOptions === 'string') {
        try { p.rawOptions = JSON.parse(p.rawOptions); } catch { p.rawOptions = {}; }
      }
      p.rawOptions = {
        title: p.title || 'Energiavirta',
        home: { title: 'Koti', icon: 'home', color: 'white', consumption: '2.4 kW' },
        nodes: [
          { title: 'Verkko', icon: 'transmission-tower', color: 'orange', consumption: '1.2 kW', speed: 20 },
          { title: 'Akku', icon: 'battery-charging', color: 'green', consumption: '0.8 kW', speed: -15 },
          { title: 'Lämpöpumppu', icon: 'heat-pump', color: 'cyan', consumption: '1.6 kW', speed: -25 },
          { title: 'Aurinko', icon: 'solar-power', color: 'yellow', consumption: '3.5 kW', speed: 35 },
          { title: 'Sähköauto', icon: 'car-electric', color: 'blue', consumption: '11.0 kW', speed: -45 },
          { title: 'Muu kuorma', icon: 'power-socket-eu', color: 'purple', consumption: '0.6 kW', speed: -10 }
        ]
      };
      loadPowerConfig();
      renderScreen();
    }

    // --- Presets ---
