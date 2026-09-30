    // --- MQTT Setup Functions ---
    function onGlobalMqttModeChange() {
      const isStandalone = document.getElementById('mode_standalone').checked;
      document.getElementById('global_broker_fields').style.display = isStandalone ? 'block' : 'none';
      document.getElementById('global_mode_desc').textContent = isStandalone
        ? 'Direct Standalone MQTT muodostaa yhteyden suoraan Homeysta MQTT-brokeriin ilman ulkoisia lisäsovelluksia.'
        : 'Käyttää Homeyyn asennettua nl.scanno.mqtt -sovellusta kaikkeen MQTT-viestintään.';
    }

    function loadGlobalMqttSettings() {
      if (window.Homey && window.Homey.get) {
        window.Homey.get('mqtt_mode', (err, mode) => {
          if (!err && mode) {
            if (mode === 'scanno') document.getElementById('mode_scanno').checked = true;
            else document.getElementById('mode_standalone').checked = true;
          }
          onGlobalMqttModeChange();
        });

        window.Homey.get('mqtt_host', (err, val) => { if (!err && val) document.getElementById('cfg_host').value = val; });
        window.Homey.get('mqtt_port', (err, val) => { if (!err && val) document.getElementById('cfg_port').value = val; });
        window.Homey.get('mqtt_user', (err, val) => { if (!err && val) document.getElementById('cfg_user').value = val; });
        window.Homey.get('mqtt_password', (err, val) => { if (!err && val) document.getElementById('cfg_password').value = val; });
      } else {
        onGlobalMqttModeChange();
      }
    }

    let globalMqttSaving = false;

    function readGlobalMqttPort(status) {
      const text = document.getElementById('cfg_port').value.trim();
      const port = Number(text);
      if (!/^\d+$/.test(text) || !Number.isInteger(port) || port < 1 || port > 65535) {
        status.style.color = 'var(--danger)';
        status.textContent = 'Portin on oltava kokonaisluku väliltä 1–65535.';
        return null;
      }
      return port;
    }

    function saveGlobalMqttSettings() {
      if (globalMqttSaving) return;
      const status = document.getElementById('global_mqtt_save_status');
      const standalone = document.getElementById('mode_standalone').checked;
      const host = document.getElementById('cfg_host').value.trim();
      // Scanno mode does not use or overwrite the standalone broker settings.
      const entries = [];
      if (standalone) {
        const port = readGlobalMqttPort(status);
        if (port === null) return;
        if (!host) {
          status.style.color = 'var(--danger)';
          status.textContent = 'Syötä ensin brokerin IP/osoite.';
          return;
        }
        entries.push(['mqtt_host', host], ['mqtt_port', port],
          ['mqtt_user', document.getElementById('cfg_user').value.trim()],
          ['mqtt_password', document.getElementById('cfg_password').value]);
      }
      entries.push(['mqtt_mode', standalone ? 'standalone' : 'scanno']);
      if (typeof window.Homey?.set !== 'function') {
        status.style.color = 'var(--success)';
        status.textContent = '✓ Asetukset tallennettu (Simuloitu)!';
        return;
      }
      globalMqttSaving = true;
      status.style.color = 'var(--text-muted)';
      status.textContent = 'Tallennetaan MQTT-asetuksia…';
      let index = 0;
      function writeNext() {
        if (index === entries.length) {
          globalMqttSaving = false;
          status.style.color = 'var(--success)';
          status.textContent = '✓ Asetukset tallennettu onnistuneesti!';
          return;
        }
        const [key, value] = entries[index++];
        let settled = false;
        const timer = setTimeout(() => finish(new Error('Tallennuksen aikakatkaisu')), 20000);
        function finish(error) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (error) {
            globalMqttSaving = false;
            status.style.color = 'var(--danger)';
            status.textContent = 'Asetuksen ' + key + ' tallennusta ei voitu vahvistaa. Osa asetuksista on voinut tallentua. Yritä tallennusta uudelleen.';
            return;
          }
          writeNext();
        }
        try { window.Homey.set(key, value, finish); } catch (error) { finish(error); }
      }
      writeNext();
    }

    function testGlobalMqtt() {
      const host = document.getElementById('cfg_host').value.trim();
      const user = document.getElementById('cfg_user').value.trim();
      const password = document.getElementById('cfg_password').value;
      const btn = document.getElementById('btn_test_global_mqtt');
      const status = document.getElementById('global_mqtt_test_status');

      if (!host) {
        status.style.color = 'var(--danger)';
        status.textContent = 'Syötä ensin brokerin IP/osoite.';
        return;
      }

      const port = readGlobalMqttPort(status);
      if (port === null) return;

      btn.disabled = true;
      btn.textContent = 'Testataan...';
      status.style.color = 'var(--text-muted)';
      status.textContent = 'Yhdistetään...';

      if (window.Homey && window.Homey.api) {
        window.Homey.api('POST', '/test-mqtt', { host, port, user, password }, (err, res) => {
          btn.disabled = false;
          btn.textContent = 'Testaa broker-yhteyttä';
          if (err || !res?.success) {
            status.style.color = 'var(--danger)';
            status.textContent = '✗ Yhteys epäonnistui: ' + (err?.message || res?.error || 'Tuntematon virhe');
          } else {
            status.style.color = 'var(--success)';
            status.textContent = '✓ Yhteys muodostettu onnistuneesti!';
          }
        });
      } else {
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = 'Testaa broker-yhteyttä';
          status.style.color = 'var(--success)';
          status.textContent = '✓ Yhdistetty onnistuneesti (Demo)!';
        }, 800);
      }
    }

