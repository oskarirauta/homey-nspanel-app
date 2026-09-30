    // Reject incomplete/invalid values without replacing the saved draft with defaults.
    function readCardNumber(id, previous, min = -Infinity, max = Infinity) {
      const input = document.getElementById(id);
      const text = input.value.trim();
      const value = Number(text);
      if (!text || !Number.isFinite(value) || value < min || value > max) return previous;
      return value;
    }

    function updateThermoConfig() {
      const p = currentPages[selectedPageId];
      if (!p) return;
      if (!p.rawOptions) p.rawOptions = {};

      p.rawOptions.target = readCardNumber('thermo-target-input', p.rawOptions.target ?? 21.5);
      p.rawOptions.current = readCardNumber('thermo-current-input', p.rawOptions.current ?? 20.8);
      p.rawOptions.min = readCardNumber('thermo-min-input', p.rawOptions.min ?? 15);
      p.rawOptions.max = readCardNumber('thermo-max-input', p.rawOptions.max ?? 30);

      const th1 = document.getElementById('thermo-heading1-input'); if (th1) p.rawOptions.heading1 = th1.value;
      const tc1 = document.getElementById('thermo-curmode1-input'); if (tc1) p.rawOptions.currentMode1 = tc1.value;
      const tm1 = document.getElementById('thermo-modes1-input'); if (tm1) p.rawOptions.modeList1 = tm1.value;

      const th2 = document.getElementById('thermo-heading2-input'); if (th2) p.rawOptions.heading2 = th2.value;
      const tc2 = document.getElementById('thermo-curmode2-input'); if (tc2) p.rawOptions.currentMode2 = tc2.value;
      const tm2 = document.getElementById('thermo-modes2-input'); if (tm2) p.rawOptions.modeList2 = tm2.value;

      const th3 = document.getElementById('thermo-heading3-input'); if (th3) p.rawOptions.heading3 = th3.value;
      const tc3 = document.getElementById('thermo-curmode3-input'); if (tc3) p.rawOptions.currentMode3 = tc3.value;
      const tm3 = document.getElementById('thermo-modes3-input'); if (tm3) p.rawOptions.modeList3 = tm3.value;

      renderScreen();
    }

    function stepThermostat(delta) {
      const inp = document.getElementById('thermo-target-input');
      const page = currentPages[selectedPageId];
      if (!page || !Number.isFinite(delta)) return;
      let val = readCardNumber('thermo-target-input', page.rawOptions?.target ?? 21.5);
      val += delta;
      inp.value = val.toFixed(1);
      updateThermoConfig();
    }

    function updateMediaConfig() {
      const p = currentPages[selectedPageId];
      if (!p) return;
      if (!p.rawOptions) p.rawOptions = {};
      if (!p.rawOptions.media) p.rawOptions.media = {};

      p.rawOptions.media.title = document.getElementById('media-title-input').value;
      p.rawOptions.media.author = document.getElementById('media-artist-input').value;
      p.rawOptions.volume = readCardNumber('media-vol-input', p.rawOptions.volume ?? 50, 0, 100);

      renderScreen();
    }

    function loadAlarmConfig(p) {
      if (!p) return;
      const raw = p.rawOptions || {};
      const stateEl = document.getElementById('alarm-state-select');
      if (stateEl) stateEl.value = raw.state || 'disarmed';
      const pinEl = document.getElementById('alarm-pin-code');
      if (pinEl) pinEl.value = raw.pin || '';
      const pinReqEl = document.getElementById('alarm-pin-req');
      if (pinReqEl) pinReqEl.checked = raw.pin_required !== false;
      const pinArmEl = document.getElementById('alarm-pin-for-arm');
      if (pinArmEl) pinArmEl.checked = !!raw.pin_for_arm;
      const langEl = document.getElementById('alarm-lang-select');
      if (langEl) langEl.value = raw.language || 'fi';
    }

    function updateAlarmConfig() {
      const p = currentPages[selectedPageId];
      if (!p) return;
      if (!p.rawOptions) p.rawOptions = {};

      const stateEl = document.getElementById('alarm-state-select');
      if (stateEl) p.rawOptions.state = stateEl.value;
      const pinEl = document.getElementById('alarm-pin-code');
      if (pinEl) p.rawOptions.pin = pinEl.value;
      const pinReqEl = document.getElementById('alarm-pin-req');
      if (pinReqEl) p.rawOptions.pin_required = pinReqEl.checked;
      const pinArmEl = document.getElementById('alarm-pin-for-arm');
      if (pinArmEl) p.rawOptions.pin_for_arm = pinArmEl.checked;
      const langEl = document.getElementById('alarm-lang-select');
      if (langEl) p.rawOptions.language = langEl.value;

      markStudioDirty(selectedPageId);
      renderScreen();
    }

    function updateQRConfig() {
      const p = currentPages[selectedPageId];
      if (!p) return;
      if (!p.rawOptions) p.rawOptions = {};

      p.rawOptions.qrcode = document.getElementById('qrcode-content-input').value;
      renderScreen();
    }

