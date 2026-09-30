    // --- Page Presets ---
    function applyPreset(presetName) {
      const previous = currentPages[selectedPageId];
      if (!previous || selectedPageId === 'screensaver' ||
          (typeof studioSaving !== 'undefined' && studioSaving) ||
          (typeof studioDeletions !== 'undefined' && studioDeletions.has(selectedPageId))) return false;
      if (presetName === 'lights') {
        currentPages[selectedPageId] = {
          type: 'grid',
          title: 'Valot & Releet',
          navigation: { leading: { target: 'screensaver' }, trailing: { target: '' } },
          slots: {
            1: { title: 'Kattovalo', icon: 'lightbulb', color: '#FFAA00', type: 'switch', binding: { source: 'relay', relay: 1 }, id: 'slot_1', val: '1' },
            2: { title: 'Rele 2', icon: 'power', color: '#2696A8', type: 'switch', binding: { source: 'relay', relay: 2 }, id: 'slot_2', val: '0' },
            3: { title: 'Lattiavalaisin', icon: 'lamp', color: '#38BDF8', type: 'switch', id: 'living_lamp', val: '1' },
            4: { title: 'TV & Viihde', icon: 'television', color: '#A855F7', type: 'switch', id: 'tv_power', val: '0' },
            5: { title: 'Lämpötila', icon: 'thermometer', color: '#10B981', type: 'text', binding: { source: 'internal' }, id: 'slot_3', val: '21.5 °C' },
            6: { title: 'Lepotila', icon: 'clock-outline', color: '#94A3B8', type: 'button', id: 'screensaver', val: '' }
          }
        };
      } else if (presetName === 'thermo') {
        currentPages[selectedPageId] = {
          type: 'thermostat',
          title: 'Termostaatti',
          navigation: { leading: { target: 'active' }, trailing: { target: '' } },
          rawOptions: { target: 21.5, current: 20.8, min: 15, max: 30, step: 0.5 }
        };
      } else if (presetName === 'media') {
        currentPages[selectedPageId] = {
          type: 'media',
          title: 'Musiikkisoitin',
          navigation: { leading: { target: 'active' }, trailing: { target: '' } },
          rawOptions: {
            title: 'Musiikkisoitin',
            media: { title: 'Nemo', author: 'Nightwish', icon: 'music' },
            volume: 65,
            paused: false
          }
        };
      } else if (presetName === 'alarm') {
        currentPages[selectedPageId] = {
          type: 'alarm',
          title: 'Turvajärjestelmä',
          navigation: { leading: { target: 'active' }, trailing: { target: '' } },
          rawOptions: {
            title: 'Turvajärjestelmä',
            state: 'disarmed',
            pin: '1234',
            pin_required: true,
            pin_for_arm: false,
            language: 'fi',
            binding: { source: 'flow' }
          }
        };
      } else if (presetName === 'qrcode') {
        currentPages[selectedPageId] = {
          type: 'qrcode',
          title: 'Vierasverkko',
          navigation: { leading: { target: 'active' }, trailing: { target: '' } },
          rawOptions: { title: 'Vierasverkko', qrcode: 'WIFI:S:Vierasverkko;T:WPA;P:Salasana123;;' }
        };
      } else if (presetName === 'weather') {
        currentPages[selectedPageId] = {type:'grid',title:'Sääennuste',navigation:{leading:{target:'active'}},slots:{},rawOptions:{weatherForecast:true}};
      } else if (presetName === 'power') {
        currentPages[selectedPageId] = {
          type: 'power',
          title: 'Energiavirta',
          navigation: { leading: { target: 'active' }, trailing: { target: '' } },
          rawOptions: {
            title: 'Energiavirta',
            home: { title: 'Koti', icon: 'home', color: 'white', consumption: '2.4 kW' },
            nodes: [
              { title: 'Verkko', icon: 'transmission-tower', color: 'orange', consumption: '1.2 kW', speed: 20 },
              { title: 'Akku', icon: 'battery-charging', color: 'green', consumption: '0.8 kW', speed: -15 },
              { title: 'Lämpöpumppu', icon: 'heat-pump', color: 'cyan', consumption: '1.6 kW', speed: -25 },
              { title: 'Aurinko', icon: 'solar-power', color: 'yellow', consumption: '3.5 kW', speed: 35 },
              { title: 'Sähköauto', icon: 'car-electric', color: 'blue', consumption: '11.0 kW', speed: -45 },
              { title: 'Muu kuorma', icon: 'power-socket-eu', color: 'purple', consumption: '0.6 kW', speed: -10 }
            ]
          }
        };
      } else if (presetName === 'spot') {
        currentPages[selectedPageId] = {
          type: 'chart',
          title: 'Pörssisähkö',
          navigation: { leading: { target: 'active' }, trailing: { target: '' } },
          rawOptions: {
            title: 'Pörssisähkö',
            chartType: 'bar',
            unit: 'c/kWh',
            color: 'yellow',
            yAxisTicks: [10, 20, 30, 40, 50],
            binding: {source:'flow'}, values: []
          }
        };
      } else if (presetName === 'chart_temp') {
        currentPages[selectedPageId] = {
          type: 'chart',
          title: 'Huonelämpötila',
          navigation: { leading: { target: 'active' }, trailing: { target: '' } },
          rawOptions: {
            title: 'Huonelämpötila',
            chartType: 'line',
            unit: '°C',
            color: 'cyan',
            values: [205, 204, 203, 202, 201, 202, 205, 210, 215, 218, 220, 221, 222, 221, 220, 218, 217, 216, 215, 214, 212, 210, 208, 206]
          }
        };
      } else if (presetName === 'chart_power') {
        currentPages[selectedPageId] = {
          type: 'chart',
          title: 'Sähkönkulutus',
          navigation: { leading: { target: 'active' }, trailing: { target: '' } },
          rawOptions: {
            title: 'Sähkönkulutus',
            chartType: 'line',
            unit: 'W',
            color: 'yellow',
            values: [450, 420, 380, 390, 410, 850, 1650, 2100, 1200, 950, 850, 780, 820, 1100, 1400, 1950, 2400, 2800, 2200, 1800, 1250, 850, 620, 480]
          }
        };
      } else if (presetName === 'chart_weather') {
        currentPages[selectedPageId] = {
          type: 'chart',
          title: 'Lämpötilaennuste 24h',
          navigation: { leading: { target: 'active' }, trailing: { target: '' } },
          rawOptions: {
            title: 'Lämpötilaennuste 24h',
            chartType: 'line',
            chartSource: 'met',
            binding: {source:'met'},
            unit: '°C',
            color: 'cyan',
            values: []
          }
        };
      } else if (presetName === 'ventilation') {
        currentPages[selectedPageId] = {
          type: 'grid',
          title: 'Ilmanvaihto',
          navigation: { leading: { target: 'active' }, trailing: { target: '' } },
          slots: {
            1: { title: 'Ilmanvaihto', icon: 'fan', color: '#38BDF8', type: 'fan', id: 'ventilation', val: 'Kotona' },
            2: { title: 'Takkatila', icon: 'fire', color: '#F97316', type: 'switch', id: 'fireplace_mode', val: '0' },
            3: { title: 'Tuloilma', icon: 'thermometer', color: '#10B981', type: 'text', id: 'supply_temp', val: '19.5 °C' },
            4: { title: 'Poistoilma', icon: 'thermometer-lines', color: '#F59E0B', type: 'text', id: 'exhaust_temp', val: '21.8 °C' },
            5: { title: 'Tehostus', icon: 'fan-plus', color: '#818CF8', type: 'button', id: 'boost_btn', val: '30 min' },
            6: { title: 'Koti', icon: 'home', color: '#94A3B8', type: 'button', id: 'active', val: '' }
          }
        };
      } else if (presetName === 'modes') {
        currentPages[selectedPageId] = {
          type: 'entities',
          title: 'Kodin tilat',
          navigation: { leading: { target: 'active' }, trailing: { target: '' } },
          slots: {
            1: { title: 'Kodin tila', icon: 'home', color: '#10B981', type: 'input_sel', id: 'home_mode', val: 'Kotona', modes: 'Kotona?Poissa?Nukkumassa?Loma' },
            2: { title: 'Ilmanvaihtotila', icon: 'fan', color: '#38BDF8', type: 'input_sel', id: 'fan_mode', val: 'Kotona', modes: 'Poissa?Kotona?Tehostus?Takkatila' },
            3: { title: 'Sauna', icon: 'radiator', color: '#F59E0B', type: 'switch', id: 'sauna_switch', val: '0' },
            4: { title: 'Lepotila', icon: 'clock', color: '#94A3B8', type: 'navigate', id: 'screensaver', val: '' }
          }
        };
      }

      if (presetName === 'timer') {
        currentPages[selectedPageId] = {
          type: 'entities',
          title: 'Ajastimet',
          navigation: { leading: { target: 'active' }, trailing: { target: '' } },
          slots: {
            1: { title: 'Keittiöajastin', icon: 'timer', color: '#F59E0B', type: 'timer', id: 'kitchen_timer', durationSeconds:300, val: '05:00' },
            2: { title: 'Pika-ajastin 10 min', icon: 'timer-outline', color: '#10B981', type: 'timer', id: 'timer_10m', durationSeconds:600, val: '10:00' },
            3: { title: 'Pika-ajastin 30 min', icon: 'timer-sand', color: '#38BDF8', type: 'timer', id: 'timer_30m', durationSeconds:1800, val: '30:00' },
            4: { title: 'Lepotila', icon: 'clock', color: '#94A3B8', type: 'navigate', id: 'screensaver', val: '' }
          }
        };
      }

      if (presetName === 'lights_popup') {
        currentPages[selectedPageId] = {
          type: 'grid',
          title: 'Valaistus',
          navigation: { leading: { target: 'active' }, trailing: { target: '' } },
          slots: {
            1: { title: 'Kattovalo', icon: 'lightbulb', color: '#FFAA00', type: 'light', id: 'ceiling_light', val: '80 %' },
            2: { title: 'Pöytävalaisin', icon: 'lamp', color: '#38BDF8', type: 'light', id: 'desk_light', val: '100 %' },
            3: { title: 'Tunnelmavalo', icon: 'lightbulb-multiple', color: '#A855F7', type: 'light', id: 'ambient_light', val: '50 %' },
            4: { title: 'Spottivalot', icon: 'lightbulb-spot', color: '#10B981', type: 'light', id: 'spot_lights', val: '65 %' },
            5: { title: 'Kaikki pois', icon: 'power', color: '#EF4444', type: 'button', id: 'all_off', val: '' },
            6: { title: 'Lepotila', icon: 'clock', color: '#94A3B8', type: 'navigate', id: 'screensaver', val: '' }
          }
        };
      }

      if (presetName === 'shutters') {
        currentPages[selectedPageId] = {
          type: 'entities',
          title: 'Verhot & Kaihtimet',
          navigation: { leading: { target: 'active' }, trailing: { target: '' } },
          slots: {
            1: { title: 'Olohuoneen verhot', icon: 'window-shutter', color: '#38BDF8', type: 'shutter', id: 'living_shutter', val: '75 %' },
            2: { title: 'Makuuhuoneen sälekaihdin', icon: 'blinds', color: '#10B981', type: 'shutter', id: 'bedroom_blinds', val: '50 %' },
            3: { title: 'Keittiön rullaverho', icon: 'window-shutter-open', color: '#F59E0B', type: 'shutter', id: 'kitchen_shutter', val: '100 %' },
            4: { title: 'Lepotila', icon: 'clock', color: '#94A3B8', type: 'navigate', id: 'screensaver', val: '' }
          }
        };
      }

      if (currentPages[selectedPageId] === previous) return false;
      for (const key of ['order', '_renameFrom']) {
        if (Object.prototype.hasOwnProperty.call(previous, key)) currentPages[selectedPageId][key] = previous[key];
      }
      loadSelectedPage();
      const status = document.getElementById('push-status');
      status.style.color = 'var(--success)';
      status.textContent = '✓ Pikamalli ladattu!';
      setTimeout(() => { status.textContent = ''; }, 3000);
      return true;
    }

