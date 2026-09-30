import assert from 'assert';
import { powerWatts, powerSpeed } from '../lib/power';
import { readBinding, BindingService } from '../lib/bindings';
import { Weather } from '../lib/weather';
import { Page } from '../lib/page';
const Module = require('module');
const originalLoad = Module._load;
Module._load = function(id: string, ...args: any[]) {
  if (id === 'homey') return { Device: class {}, App: class {}, Driver: class {} };
  return originalLoad.call(this, id, ...args);
};
const Device = require('../drivers/nspanel/device');
const Api = require('../api');
async function run() {
  assert.equal(powerWatts('1,2 kW'), 1200);
  assert.equal(powerWatts('1200 W'), 1200);
  assert.equal(powerWatts('2 kWh'), undefined);
  assert.equal(powerSpeed(powerWatts('1 kW')), powerSpeed(powerWatts('1000 W')));
  assert.equal(powerSpeed(0, 30), 0);
  assert.equal(powerSpeed(-2500), -25);
  assert.equal(powerSpeed(500, 77), 77);
  assert.equal(powerSpeed(undefined), 0);
  assert.equal(powerSpeed(1200, 0), 12);
  assert.equal(powerSpeed(1200, 0, 'auto-inverted'), -12);
  assert.equal(powerSpeed(-1200, undefined, 'inflow'), 12);
  assert.equal(powerSpeed(1200, undefined, 'outflow'), -12);
  assert.equal(readBinding({source:'flow'}, {internal:25,flow:0,homey:()=>40,relay:()=>false}),0);
  const forecast=Weather.parse_owm(JSON.stringify({current:{temp:10}, daily:[{dt:1,temp:{day:99}},{dt:Math.floor(Date.now()/1000)+86400,temp:{day:11}}]}),'Europe/Helsinki');
  assert.equal(forecast?.day1?.temperature,11);
  assert.equal(Weather.parse('{}','Europe/Helsinki'),undefined);
  const listeners: any = {};
  const cards: any = {};
  const conditions: any = {};
  function device() {
    const d = new Device();
    d.log=d.error=()=>{};
    d.getSettings=()=>({});d.getSetting=()=>false;
    d.setCapabilityValue=async()=>{};
    d.homey={ app:{bindingService:{unit:()=>'',value:()=>undefined}}, flow:{getActionCard:(id:string)=>({registerRunListener:(fn:any)=>cards[id]=fn}), getConditionCard:(id:string)=>({registerRunListener:(fn:any)=>conditions[id]=fn})}, setTimeout:()=>0, clearTimeout:()=>{}, setInterval:()=>0, clearInterval:()=>{}, i18n:{getUnits:()=> 'metric'} };
    d.weatherUpdate=()=>{};
    d.updateSleepTimer=()=>{};
    d.renderAndDisplayPage=async()=>{};
    d.screensaverActive=false;
    return d;
  }
  const a=device(), b=device();
  // Both weather providers feed the five-day page, with Flow kept separately.
  a.homey.clock={getTimezone:()=> 'Europe/Helsinki'};
  a.homey.i18n.getLanguage=()=> 'fi';
  a.registerFlowActions();
  await cards.set_screensaver_forecast_day_action({device:a,day_index:'day5',temperature:15,weather_type:'rainy'});
  assert.equal(a.weather.day5.temperature,15);
  a.bindings.weather={source:'flow'};
  assert.equal(a.activeWeather().day5.temperature,15);
  a.bindings.weather={source:'met',location:'custom',latitude:60,longitude:25};
  a.homey.app.metWeatherService={get:async()=>({forecast:{current:{temperature:7,type:Weather.Type.cloudy},days:Array.from({length:5},(_,i)=>({day:'D'+(i+1),temperature:i+11,type:Weather.Type.rainy})),updatedAt:'2026-09-26T00:00:00Z'},nextAt:Date.now()+3600000,stale:false})};
  a.homey.app.globalWeather={subscribe:(_owner:any,callback:any)=>{callback({state:'ready',forecast:{current:{temperature:7,type:Weather.Type.cloudy},days:Array.from({length:5},(_,i)=>({day:'D'+(i+1),temperature:i+11,type:Weather.Type.rainy}))}});return()=>{};}};
  await a.refreshWeatherSource();assert.equal(a.weatherStatus.state,'ready');
  assert.equal(a.activeWeather().day0.temperature,7);assert.equal(a.weather.day5.temperature,15);
  const forecastPage={type:Page.Type.grid,title:'Forecast',slots:{},rawOptions:{weatherForecast:true}};
  a.pages.forecast=forecastPage;a.currentPageId='forecast';a.currentPageType=Page.Type.grid;
  const forecastCommands:any[]=[];a.sendCmnd=(_name:string,command:string)=>forecastCommands.push(command);
  await Device.prototype.renderAndDisplayPage.call(a,forecastPage,false);
  assert(forecastCommands.some(command=>command.includes('D5')&&command.includes('15.0 °C')),'Day five renders on the panel');
  assert.deepEqual(forecastPage.slots,{},'Rendering must not persist live forecast as fixed slots');
  a.bindings.weather={source:'flow'};await a.refreshWeatherSource();assert.equal(a.weatherStatus.state,'flow');
  assert.equal(a.activeWeather().day5.temperature,15);

  a.bindings.buttons={'1':{source:'relay',relay:2}};assert.equal(a.buttonsNeedDecoupling(),true);a.bindings.buttons={};a.registerFlowActions();b.registerFlowActions();
  await cards.update_indoor_temperature_action({device:a,temperature:12});
  assert.equal(a.indoorTemperature,12);assert.equal(b.indoorTemperature,undefined);
  const previousWeather=a.weather,previousUpdate=a.weatherUpdate,previousExit=a.exitScreensaver,previousNavigate=a.navigateToPage,previousIcons=a.setStatusIcons;
  let weatherRefreshes=0; a.weatherUpdate=()=>{weatherRefreshes++;};
  await cards.update_outdoor_temperature_action({device:a,temperature:0});
  assert.equal(a.flowOutdoorTemperature,0);assert.equal(a.weather.day0.temperature,0);
  await cards.set_screensaver_weather_action({device:a,temperature:-5.2,indoor_temperature:0,weather_type:'rainy'});
  assert.equal(a.flowOutdoorTemperature,-5.2);assert.equal(a.indoorTemperature,0);assert.equal(a.weather.day0.type,Weather.Type.rainy);
  await cards.update_forecast_action({device:a,json:JSON.stringify({weather:[{temp:7,icon:'sunny'}]})});
  assert.equal(a.flowOutdoorTemperature,7);assert.equal(a.weather.day0.temperature,7);
  await assert.rejects(cards.update_forecast_action({device:a,json:'{}'}),/Invalid weather/);
  await cards.update_forecast_owm_action({device:a,json:JSON.stringify({current:{temp:8},daily:[]})});
  assert.equal(a.flowOutdoorTemperature,8);assert.equal(weatherRefreshes,4);
  await assert.rejects(cards.update_indoor_temperature_action({temperature:99}),/device is required/);
  let wakeCalls=0;let wakeTarget='';a.screensaverActive=true;a.exitScreensaver=async()=>{wakeCalls++;a.screensaverActive=false;};a.navigateToPage=async(target:string)=>{wakeTarget=target;};
  await cards.wake_screen_action({device:a,target_page:' room '});assert.equal(wakeCalls,1);assert.equal(wakeTarget,'room');
  let statusArgs:any[]=[];a.setStatusIcons=(...args:any[])=>{statusArgs=args;};
  await cards.set_screensaver_status_icon_action({device:a,slot:'2',icon:'home',color:'red'});assert.deepEqual(statusArgs,[undefined,undefined,'home','red']);
  a.weather=previousWeather;a.weatherUpdate=previousUpdate;a.exitScreensaver=previousExit;a.navigateToPage=previousNavigate;a.setStatusIcons=previousIcons;
  const relayCommands:any[]=[];const oldSend=a.sendCmnd,oldBrightness=a.updateBrightness;
  a.sendCmnd=(...args:any[])=>relayCommands.push(args);
  for(const state of ['on','off','toggle'])await cards.set_relay_action({device:a,relay:'2',state});
  assert.deepEqual(relayCommands,[['Power2','ON'],['Power2','OFF'],['Power2','TOGGLE']]);
  let brightnessDim:any; a.updateBrightness=(dim:any)=>{brightnessDim=dim;};a.dimmed=true;
  await cards.set_brightness({device:a,brightness:200,sleep_brightness:-1});
  assert.equal(a.customBrightness,100);assert.equal(a.customSleepBrightness,0);assert.equal(brightnessDim,true);
  await cards.set_brightness({device:a,brightness:'junk'});assert.equal(a.customBrightness,100);
  const previousType=a.currentPageType,previousOptions=a.currentOptions;
  a.currentPageType=Page.Type.qrcode;a.screensaverActive=false;
  const config=JSON.stringify({title:'Guest',qrcode:'WIFI:S:Guest;T:nopass;;'});
  await cards.update_page_config_action({device:a,config});
  assert.equal(a.currentOptions,Page.GenerateQRCode(config));assert.equal(relayCommands[relayCommands.length-1][1],a.currentOptions);
  const commandCount=relayCommands.length;a.screensaverActive=true;
  await cards.update_page_config_action({device:a,config});assert.equal(relayCommands.length,commandCount);
  a.screensaverActive=false;a.currentPageType=previousType;a.currentOptions=previousOptions;a.sendCmnd=oldSend;a.updateBrightness=oldBrightness;
  const sent:any[]=[];a.sendCmnd=(...args:any[])=>sent.push(args);
  a.pages.custom={type:'grid',title:'Custom',slots:{1:{name:'slot_1',type:'switch',value:'0'}}};a.currentPageId='custom';
  await a.handleNextionEvent('event,buttonPress2,slot_1,OnOff,1');
  assert.equal(sent.length,0,'Custom slot 1 must never implicitly switch relay 1');
  a.pages.custom.slots[1].binding={source:'relay',relay:2};
  await a.handleNextionEvent('event,buttonPress2,slot_1,OnOff,1');
  assert.deepEqual(sent.pop(),['Power2','ON']);
  let triggered=0;a.switch1=false;a.switchChangedTrigger={trigger:async()=>triggered++};
  await a.onMessage('panel','stat/RESULT',JSON.stringify({POWER1:'ON'}));
  assert.equal(triggered,1);
  await a.onMessage('panel','stat/RESULT',JSON.stringify({POWER1:'ON'}));assert.equal(triggered,1);
  let applied=0;a.getData=()=>({id:'a'});a.setSettings=async()=>{};a.onSettings=async()=>applied++;
  await Api.setDeviceSettings({homey:{drivers:{getDriver:()=>({getDevices:()=>[a]})}},params:{id:'a'},body:{settings:{brightness:60}}});
  assert.equal(applied,1);
  // Shared subscriptions, external state and command serialization.
  const writes:any[]=[];let destroyed=0;
  const target={available:true,capabilitiesObj:{onoff:{type:'boolean',setable:true,value:false}},makeCapabilityInstance:(_id:string,fn:any)=>{listeners.onoff=fn;return{destroy:()=>destroyed++};},setCapabilityValue:async({value}:any)=>{writes.push(value);}};
  const service:any=new BindingService(()=>({}));service.api=async()=>({devices:{getDevice:async()=>target}});
  const binding:any={source:'homey',deviceId:'light',capabilityId:'onoff',action:'toggle'};
  let changes=0;const dispose=await service.watch(binding,()=>changes++);
  listeners.onoff(true);assert.equal(service.value(binding),true);assert.equal(changes,1);
  await Promise.all([service.control(binding),service.control(binding)]);assert.deepEqual(writes,[false,true]);
  target.available=false;await assert.rejects(service.control(binding));assert.equal(service.value(binding),undefined);
  // Panel choice remains independent; provider configuration is now global.
  a.setStoreValue = async () => {};
  await a.setBindings({ indoor: { source: 'internal' }, outdoor: { source: 'forecast' }, buttons: {}, weather: { source: 'none' } });
  assert.equal(a.activeWeather(),undefined);
  await a.setBindings({ indoor: { source: 'internal' }, outdoor: { source: 'forecast' }, buttons: {}, weather: { source: 'flow' } });
  assert.equal(a.activeWeather().day5.temperature,15);
  // Test BindingService.set
  target.available = true;
  await service.set('light', 'onoff', true);
  assert.deepEqual(writes, [false, true, true]);

  // Test Thermostat Homey binding
  const thermoSetValues: any[] = [];
  a.homey.app.bindingService = {
    value: (b: any) => b.capabilityId === 'target_temperature' ? 22.0 : b.capabilityId === 'measure_temperature' ? 21.4 : undefined,
    unit: () => '°C',
    watch: async () => () => {},
    set: async (_devId: string, capId: string, val: any) => thermoSetValues.push({ capId, val })
  };
  a.pages.climate = { type: Page.Type.thermostat, title: 'Climate', slots: {}, rawOptions: { binding: { source: 'homey', deviceId: 'thermo-1' } } };
  a.currentPageId = 'climate';
  a.currentPageType = Page.Type.thermostat;
  const thermoCommands: any[] = [];
  a.sendCmnd = (_name: string, command: string) => thermoCommands.push(command);
  await Device.prototype.renderAndDisplayPage.call(a, a.pages.climate, false);
  assert(thermoCommands.some(cmd => cmd.includes('21.4 °C') && cmd.includes('220')), 'Thermostat displays live bound values');

  await a.handleNextionEvent('event,buttonPress2,climate,tempUpd,235');
  assert.deepEqual(thermoSetValues, [{ capId: 'target_temperature', val: 23.5 }], 'Touch setpoint directly sets bound Homey thermostat');

  // Reject malformed setpoints before Homey writes, local updates or Flow events.
  const setpointEvents: number[] = [];
  const localSetpoints: number[] = [];
  let localRenders = 0;
  const previousSetCapability = a.setCapabilityValue;
  const previousThermoUpdate = a.thermoUpdate;
  a.thermostatSetpointChangedTrigger = { trigger: async (_device: any, tokens: any) => { setpointEvents.push(tokens.temperature); } };
  a.setCapabilityValue = async (_cap: string, temperature: number) => { localSetpoints.push(temperature); };
  a.thermoUpdate = () => { localRenders++; };
  for (const bound of [true, false]) {
    a.pages.climate.rawOptions = bound ? { binding: { source: 'homey', deviceId: 'thermo-1' } } : {};
    const count = thermoSetValues.length;
    const previousTemperature = a.temp_setpoint;
    for (const invalid of ['', ' ', '235bad', '23.5', '1e2', 'Infinity', 'NaN', '9007199254740992']) {
      await a.handleNextionEvent(`event,buttonPress2,climate,tempUpd,${invalid}`);
    }
    assert.equal(thermoSetValues.length, count);
    assert.equal(localSetpoints.length, 0);assert.equal(localRenders, 0);
    assert.equal(setpointEvents.length, 0);assert.equal(a.temp_setpoint, previousTemperature);
    for (const [raw, expected] of [['0', 0], ['-55', -5.5], ['231', 23.1]] as const) {
      await a.handleNextionEvent(`event,buttonPress2,climate,tempUpd,${raw}`);
      assert.equal(setpointEvents.at(-1), expected);
      if (bound) assert.equal(thermoSetValues.at(-1).val, expected);
      else { assert.equal(localSetpoints.at(-1), expected);assert.equal(a.temp_setpoint, expected); }
    }
    setpointEvents.length = 0;localSetpoints.length = 0;localRenders = 0;
  }
  a.setCapabilityValue = previousSetCapability;a.thermoUpdate = previousThermoUpdate;

  // Test Media Homey binding
  const mediaSetValues: any[] = [];
  a.homey.app.bindingService = {
    value: (b: any) => b.capabilityId === 'speaker_track' ? 'Song A' : b.capabilityId === 'speaker_artist' ? 'Artist B' : b.capabilityId === 'speaker_playing' ? true : b.capabilityId === 'volume_set' ? 0.6 : undefined,
    unit: () => '',
    watch: async () => () => {},
    set: async (_devId: string, capId: string, val: any) => mediaSetValues.push({ capId, val })
  };
  a.pages.player = { type: Page.Type.media, title: 'Player', slots: {}, rawOptions: { binding: { source: 'homey', deviceId: 'speaker-1' } } };
  a.currentPageId = 'player';
  a.currentPageType = Page.Type.media;
  const mediaCommands: any[] = [];
  a.sendCmnd = (_name: string, command: string) => mediaCommands.push(command);
  await Device.prototype.renderAndDisplayPage.call(a, a.pages.player, false);
  assert(mediaCommands.some(cmd => cmd.includes('Song A') && cmd.includes('Artist B') && cmd.includes('60')), 'Media displays live bound values');

  await a.handleNextionEvent('event,buttonPress2,player,media-pause');
  assert.deepEqual(mediaSetValues.pop(), { capId: 'speaker_playing', val: false });
  await a.handleNextionEvent('event,buttonPress2,player,media-next');
  assert.deepEqual(mediaSetValues.pop(), { capId: 'speaker_next', val: true });
  await a.handleNextionEvent('event,buttonPress2,player,volumeSlider,80');
  assert.deepEqual(mediaSetValues.pop(), { capId: 'volume_set', val: 0.8 });

  // Test Chart page and flow actions
  a.renderAndDisplayPage = Device.prototype.renderAndDisplayPage.bind(a);
  a.setPage = async () => {};
  a.homey.setTimeout = (fn: any) => fn();
  const chartCommands: any[] = [];
  a.sendCmnd = (_name: string, command: string) => chartCommands.push(command);
  await cards.show_chart_page_action({
    device: a,
    title: 'Spot Prices',
    chart_type: 'bar',
    unit: 'c/kWh',
    color: 'yellow',
    ticks: '10:20:30:40:50',
    data: '52^00:00, 48, 75^06:00, 120^12:00'
  });
  assert.equal(a.pages.chart.type, Page.Type.chart);
  assert(chartCommands.some(cmd => cmd.startsWith('entityUpd~Spot Prices~') && cmd.includes('c/kWh~10:20:30:40:50~52^00:00~48~75^06:00~120^12:00')), 'Show chart page creates and renders chart');

  await cards.update_chart_data_action({
    device: a,
    page: 'chart',
    data: '60^00:00, 80, 100^06:00',
    unit: 'c/kWh'
  });
  assert(chartCommands.some(cmd => cmd.includes('60^00:00~80~100^06:00')), 'Update chart data updates and re-renders chart');

  // Test Push Chart Value (FIFO Shift) Action on Bar Chart
  a.currentPageId = 'chart';
  a.pages.chart.rawOptions = {
    chartType: 'bar',
    values: [10, 20, 30]
  };
  await cards.push_chart_value_action({
    device: a,
    page: 'chart',
    value: 40
  });
  assert.deepStrictEqual(a.pages.chart.rawOptions.values, [20, 30, 40], 'Push chart value shifts bar values');

  // Test Push Chart Value on Line Chart with explicit X
  a.pages.chart.rawOptions = {
    chartType: 'line',
    values: [
      { value: 10, x: 0 },
      { value: 5, x: 50 },
      { value: 8, x: 100 }
    ]
  };
  await cards.push_chart_value_action({
    device: a,
    page: 'chart',
    value: 12,
    label: '14:00'
  });
  assert.deepStrictEqual(
    a.pages.chart.rawOptions.values,
    [
      { value: 5, x: 0 },
      { value: 8, x: 50 },
      { value: 12, x: 100, label: '14:00' }
    ],
    'Push chart value shifts line chart coordinates and appends new point'
  );

  // Test Line Chart Flow Action
  await cards.show_chart_page_action({
    device: a,
    title: 'Temperature Line',
    chart_type: 'line',
    unit: '°C',
    color: 'blue',
    data: '15^00:00, 18, 22^06:00, 25^12:00'
  });
  assert(chartCommands.some(cmd => cmd.startsWith('entityUpd~Temperature Line~') && cmd.includes('0^00:00+2^06:00+3^12:00~0:15~1:18~2:22~3:25')), 'Line chart creates proper x:y coordinates and x-ticks');

  // Test Chart history tracking with bound device
  a.chartHistories.clear();
  a.updateChartHistory('sensor-1:measure_power', 1500, 0.1);
  assert.equal(a.chartHistories.get('sensor-1:measure_power')?.length, 1);
  // Test Fan popup and flow actions
  const fanCommands: any[] = [];
  a.sendCmnd = (_name: string, command: string) => fanCommands.push(command);
  
  // 1. show_fan_popup action
  await cards.show_fan_popup_action({
    device: a,
    entity: 'ventilation',
    speed: 3,
    maxSpeed: 4,
    mode: 'Kotona',
    modes: 'Poissa?Kotona?Tehostus?Takkatila',
    onoff: true
  });
  assert.equal(a.popupActive, true);
  assert.equal(a.activeFanEntity, 'ventilation');
  assert(fanCommands.some(cmd => cmd === 'page popupFan'), 'show_fan_popup opens popupFan');
  assert(fanCommands.some(cmd => cmd.startsWith('entityUpdateDetail~ventilation~~') && cmd.includes('~1~3~4~Teho~Kotona~Poissa?Kotona?Tehostus?Takkatila')), 'show_fan_popup renders detail payload');

  // 2. set_fan_state action
  await cards.set_fan_state_action({
    device: a,
    entity: 'ventilation',
    speed: 4,
    mode: 'Tehostus',
    onoff: true
  });
  assert.equal(a.fanStates.get('ventilation')?.speed, 4);
  assert.equal(a.fanStates.get('ventilation')?.currentMode, 'Tehostus');
  assert(fanCommands.some(cmd => cmd.includes('~1~4~4~Teho~Tehostus~')), 'set_fan_state updates live popup');

  // 3. Nextion pageOpenDetail event
  fanCommands.length = 0;
  a.pages.vent_page = {
    type: 'grid',
    title: 'Ilmanvaihto',
    slots: {
      1: { id: 'ventilation', name: 'ventilation', type: 'fan', val: '1', value: 'Kotona' }
    }
  };
  a.currentPageId = 'vent_page';
  await a.handleNextionEvent('event,pageOpenDetail,popupFan,ventilation');
  assert.equal(a.popupActive, true);
  assert.equal(a.activeFanEntity, 'ventilation');
  assert(fanCommands.some(cmd => cmd.startsWith('entityUpdateDetail~ventilation~~')), 'pageOpenDetail sends entityUpdateDetail');

  // 4. Nextion buttonPress2: number-set (speed change)
  let lastFanAction: any = undefined;
  a.fanActionTrigger = {
    trigger: async (_dev: any, tokens: any) => { lastFanAction = tokens; }
  };
  await a.handleNextionEvent('event,buttonPress2,ventilation,number-set,2');
  assert.equal(a.fanStates.get('ventilation')?.speed, 2);
  assert.deepEqual(lastFanAction, {
    entity: 'ventilation',
    action_type: 'speed',
    speed: 2,
    mode: 'Tehostus',
    mode_index: -1,
    onoff: true
  });
  assert.equal(a.pages.vent_page.slots[1].value, '2 / 4');

  // 5. Nextion buttonPress2: mode-preset_modes (mode selection)
  await a.handleNextionEvent('event,buttonPress2,ventilation,mode-preset_modes,3');
  assert.equal(a.fanStates.get('ventilation')?.currentMode, 'Takkatila');
  assert.equal(a.fanStates.get('ventilation')?.modeIndex, 3);
  assert.deepEqual(lastFanAction, {
    entity: 'ventilation',
    action_type: 'mode',
    speed: 2,
    mode: 'Takkatila',
    mode_index: 3,
    onoff: true
  });
  assert.equal(a.pages.vent_page.slots[1].value, 'Takkatila');

  // 6. Nextion buttonPress2: OnOff
  await a.handleNextionEvent('event,buttonPress2,ventilation,OnOff,0');
  assert.equal(a.fanStates.get('ventilation')?.onoff, false);
  assert.equal(lastFanAction?.action_type, 'onoff');
  assert.equal(lastFanAction?.onoff, false);
  assert.equal(a.pages.vent_page.slots[1].val, '0');

  // 7. Nextion buttonPress2: bExit (exit popup)
  let pageRendered = false;
  a.renderAndDisplayPage = async () => { pageRendered = true; };
  await a.handleNextionEvent('event,buttonPress2,popupFan,bExit');
  assert.equal(a.popupActive, false);
  assert.equal(a.activeFanEntity, undefined);
  assert.equal(pageRendered, true);

  // 8. Slot click on slot with type: 'fan' opens popup
  fanCommands.length = 0;
  await a.handleNextionEvent('event,buttonPress2,ventilation,button');
  assert.equal(a.popupActive, true);
  assert(fanCommands.some(cmd => cmd === 'page popupFan'));

  // Test Input Select popup and flow actions
  const selectCommands: any[] = [];
  a.sendCmnd = (_name: string, command: string) => selectCommands.push(command);

  // 1. show_select_popup action
  await cards.show_select_popup_action({
    device: a,
    entity: 'home_mode',
    title: 'Kodin tila',
    current: 'Kotona',
    options: 'Kotona?Poissa?Nukkumassa?Loma',
    color: 'cyan'
  });
  assert.equal(a.popupActive, true);
  assert.equal(a.activeSelectEntity, 'home_mode');
  assert(selectCommands.some(cmd => cmd === 'page popupInSel'), 'show_select_popup opens popupInSel');
  assert(selectCommands.some(cmd => cmd.startsWith('entityUpdateDetail2~home_mode~~') && cmd.includes('Kodin tila~Kotona~Kotona?Poissa?Nukkumassa?Loma')), 'show_select_popup renders detail payload');

  // 2. set_select_state action
  await cards.set_select_state_action({
    device: a,
    entity: 'home_mode',
    current: 'Poissa'
  });
  assert.equal(a.selectStates.get('home_mode')?.currentMode, 'Poissa');
  assert(selectCommands.some(cmd => cmd.includes('~Poissa~Kotona?Poissa?Nukkumassa?Loma')), 'set_select_state updates live popup');

  // 3. Nextion pageOpenDetail event for popupInSel
  selectCommands.length = 0;
  a.pages.modes_page = {
    type: 'entities',
    title: 'Kodin tilat',
    slots: {
      1: { id: 'home_mode', name: 'home_mode', type: 'input_sel', title: 'Kodin tila', value: 'Kotona', modes: 'Kotona?Poissa?Nukkumassa?Loma' }
    }
  };
  a.currentPageId = 'modes_page';
  await a.handleNextionEvent('event,pageOpenDetail,popupInSel,home_mode');
  assert.equal(a.popupActive, true);
  assert.equal(a.activeSelectEntity, 'home_mode');
  assert(selectCommands.some(cmd => cmd.startsWith('entityUpdateDetail2~home_mode~~')), 'pageOpenDetail sends entityUpdateDetail2');

  // 4. Nextion buttonPress2: mode selection
  let lastSelectAction: any = undefined;
  a.selectActionTrigger = {
    trigger: async (_dev: any, tokens: any) => { lastSelectAction = tokens; }
  };
  await a.handleNextionEvent('event,buttonPress2,home_mode,mode-Tila,2');
  assert.equal(a.selectStates.get('home_mode')?.currentMode, 'Nukkumassa');
  assert.equal(a.selectStates.get('home_mode')?.modeIndex, 2);
  assert.deepEqual(lastSelectAction, {
    entity: 'home_mode',
    option: 'Nukkumassa',
    index: 2
  });
  assert.equal(a.pages.modes_page.slots[1].value, 'Nukkumassa');

  // 5. Nextion buttonPress2: bExit (exit popupInSel)
  pageRendered = false;
  a.renderAndDisplayPage = async () => { pageRendered = true; };
  await a.handleNextionEvent('event,buttonPress2,popupInSel,bExit');
  assert.equal(a.popupActive, false);
  assert.equal(a.activeSelectEntity, undefined);
  assert.equal(pageRendered, true);

  // 6. Slot click on slot with type: 'input_sel' opens popupInSel
  selectCommands.length = 0;
  await a.handleNextionEvent('event,buttonPress2,home_mode,button');
  assert.equal(a.popupActive, true);
  assert(selectCommands.some(cmd => cmd === 'page popupInSel'));

  // 7. Test Timer popup and flow actions
  const timerCommands: any[] = [];
  a.sendCmnd = (_name: string, command: string) => timerCommands.push(command);

  // show_timer_popup action
  await cards.show_timer_popup_action({
    device: a,
    entity: 'kitchen_timer',
    minutes: 10,
    seconds: 0,
    color: 'yellow'
  });
  assert.equal(a.popupActive, true);
  assert.equal(a.activeTimerEntity, 'kitchen_timer');
  assert(timerCommands.some(cmd => cmd === 'page popupTimer'), 'show_timer_popup opens popupTimer');
  assert(timerCommands.some(cmd => cmd.startsWith('entityUpdateDetail~kitchen_timer~~') && cmd.includes('~10~0~1~')), 'show_timer_popup renders detail payload');

  // set_timer_action action (start)
  let lastTimerAction: any = undefined;
  a.timerActionTrigger = {
    trigger: async (_dev: any, tokens: any) => { lastTimerAction = tokens; }
  };
  let lastTimerFinished: any = undefined;
  a.timerFinishedTrigger = {
    trigger: async (_dev: any, tokens: any) => { lastTimerFinished = tokens; }
  };

  await cards.set_timer_action({
    device: a,
    entity: 'kitchen_timer',
    action: 'start',
    minutes: 5,
    seconds: 30
  });
  assert.equal(a.timerStates.get('kitchen_timer')?.status, 'running');
  assert.equal(a.timerStates.get('kitchen_timer')?.minutes, 5);
  assert.equal(a.timerStates.get('kitchen_timer')?.seconds, 30);
  assert.equal(lastTimerAction?.action, 'start');

  // Nextion buttonPress2: timer-pause
  await a.handleNextionEvent('event,buttonPress2,kitchen_timer,timer-pause');
  assert.equal(a.timerStates.get('kitchen_timer')?.status, 'paused');
  assert.equal(lastTimerAction?.action, 'pause');

  // Nextion buttonPress2: timer-start with time from local edit
  await a.handleNextionEvent('event,buttonPress2,kitchen_timer,timer-start,00:3:45');
  assert.equal(a.timerStates.get('kitchen_timer')?.status, 'running');
  assert.equal(a.timerStates.get('kitchen_timer')?.minutes, 3);
  assert.equal(a.timerStates.get('kitchen_timer')?.seconds, 45);

  // Timer finish triggers buzzer and timerFinishedTrigger
  let buzzerPlayed = false;
  a.playBuzzer = () => { buzzerPlayed = true; };
  await a.controlTimer('kitchen_timer', 'finish');
  assert.equal(buzzerPlayed, true, 'Buzzer must sound on timer finish');
  assert.equal(lastTimerFinished?.entity, 'kitchen_timer');

  // Nextion buttonPress2: bExit (exit popupTimer)
  pageRendered = false;
  a.renderAndDisplayPage = async () => { pageRendered = true; };
  await a.handleNextionEvent('event,buttonPress2,popupTimer,bExit');
  assert.equal(a.popupActive, false);
  assert.equal(a.activeTimerEntity, undefined);
  assert.equal(pageRendered, true);

  // Slot click on slot with type: 'timer' opens popupTimer
  timerCommands.length = 0;
  a.pages.timer_page = {
    type: 'entities',
    title: 'Ajastimet',
    slots: {
      1: { id: 'kitchen_timer', name: 'kitchen_timer', type: 'timer', title: 'Keittiö', value: '05:00' }
    }
  };
  a.currentPageId = 'timer_page';
  await a.handleNextionEvent('event,buttonPress2,kitchen_timer,button');
  assert.equal(a.popupActive, true);
  assert(timerCommands.some(cmd => cmd === 'page popupTimer'));

  // 8b. Test Light Popup (popupLight / popupLightNew) and flow actions
  const lightCommands: any[] = [];
  a.sendCmnd = (_name: string, command: string) => lightCommands.push(command);

  // 1. show_light_popup_action
  await cards.show_light_popup_action({
    device: a,
    entity: 'ceiling_light',
    onoff: 'on',
    brightness: 85,
    color_temp: 60,
    color: 'yellow'
  });
  assert.equal(a.popupActive, true);
  assert.equal(a.activeLightEntity, 'ceiling_light');
  assert(lightCommands.some(cmd => cmd === 'page popupLight'), 'show_light_popup opens popupLight');
  assert(lightCommands.some(cmd => cmd.startsWith('entityUpdateDetail~ceiling_light~~') && cmd.includes('~1~85~60~enable~Väri~Lämpötila~Kirkkaus~disable')), 'show_light_popup renders detail payload');

  // 2. set_light_state_action
  await cards.set_light_state_action({
    device: a,
    entity: 'ceiling_light',
    onoff: 'off',
    brightness: 40,
    color_temp: 30
  });
  assert.equal(a.lightStates.get('ceiling_light')?.onoff, false);
  assert.equal(a.lightStates.get('ceiling_light')?.brightness, 40);
  assert.equal(a.lightStates.get('ceiling_light')?.colorTemp, 30);
  assert(lightCommands.some(cmd => cmd.includes('~ceiling_light~~') && cmd.includes('~0~40~30~')), 'set_light_state updates live popup');

  // 3. Nextion pageOpenDetail event
  lightCommands.length = 0;
  a.pages.light_page = {
    type: 'grid',
    title: 'Valot',
    slots: {
      1: { id: 'ceiling_light', name: 'ceiling_light', type: 'light', val: '1', value: '85 %' }
    }
  };
  a.currentPageId = 'light_page';
  await a.handleNextionEvent('event,pageOpenDetail,popupLight,ceiling_light');
  assert.equal(a.popupActive, true);
  assert.equal(a.activeLightEntity, 'ceiling_light');
  assert(lightCommands.some(cmd => cmd.startsWith('entityUpdateDetail~ceiling_light~~')), 'pageOpenDetail sends entityUpdateDetail for popupLight');

  // 4. Nextion buttonPress2: OnOff
  let lastLightAction: any = undefined;
  a.lightActionTrigger = {
    trigger: async (_dev: any, tokens: any) => { lastLightAction = tokens; }
  };
  await a.handleNextionEvent('event,buttonPress2,ceiling_light,OnOff,1');
  assert.equal(a.lightStates.get('ceiling_light')?.onoff, true);
  assert.equal(lastLightAction?.action_type, 'onoff');
  assert.equal(lastLightAction?.onoff, true);
  assert.equal(a.pages.light_page.slots[1].val, '1');

  // 5. Nextion buttonPress2: brightnessSlider
  await a.handleNextionEvent('event,buttonPress2,ceiling_light,brightnessSlider,75');
  assert.equal(a.lightStates.get('ceiling_light')?.brightness, 75);
  assert.equal(lastLightAction?.action_type, 'brightness');
  assert.equal(lastLightAction?.brightness, 75);
  assert.equal(a.pages.light_page.slots[1].value, '75 %');

  // 6. Nextion buttonPress2: colorTempSlider
  await a.handleNextionEvent('event,buttonPress2,ceiling_light,colorTempSlider,45');
  assert.equal(a.lightStates.get('ceiling_light')?.colorTemp, 45);
  assert.equal(lastLightAction?.action_type, 'color_temp');
  assert.equal(lastLightAction?.color_temp, 45);

  // 7. Nextion buttonPress2: colorWheel
  await a.handleNextionEvent('event,buttonPress2,ceiling_light,colorWheel,180|100|200');
  assert.equal(lastLightAction?.action_type, 'color');
  assert(lastLightAction?.hue !== undefined);
  assert(lastLightAction?.saturation !== undefined);

  // 8. Nextion buttonPress2: bExit
  let lightPageRendered = false;
  a.renderAndDisplayPage = async () => { lightPageRendered = true; };
  await a.handleNextionEvent('event,buttonPress2,popupLight,bExit');
  assert.equal(a.popupActive, false);
  assert.equal(a.activeLightEntity, undefined);
  assert.equal(lightPageRendered, true);

  // 9. Slot click on slot with type: 'light' opens popupLight
  lightCommands.length = 0;
  await a.handleNextionEvent('event,buttonPress2,ceiling_light,button');
  assert.equal(a.popupActive, true);
  assert(lightCommands.some(cmd => cmd === 'page popupLight'));

  // 8c. Test Shutter Popup (popupShutter) and flow actions
  const shutterCommands: any[] = [];
  a.sendCmnd = (_name: string, command: string) => shutterCommands.push(command);

  // 1. show_shutter_popup_action
  await cards.show_shutter_popup_action({
    device: a,
    entity: 'living_blinds',
    position: 70,
    tilt: 40
  });
  assert.equal(a.popupActive, true);
  assert.equal(a.activeShutterEntity, 'living_blinds');
  assert(shutterCommands.some(cmd => cmd === 'page popupShutter'), 'show_shutter_popup opens popupShutter');
  assert(shutterCommands.some(cmd => cmd.startsWith('entityUpdateDetail~living_blinds~70~70 %~Asento~') && cmd.includes('~Säleet~')), 'show_shutter_popup renders detail payload');

  // 2. set_shutter_state_action
  await cards.set_shutter_state_action({
    device: a,
    entity: 'living_blinds',
    position: 30,
    tilt: 10
  });
  assert.equal(a.shutterStates.get('living_blinds')?.position, 30);
  assert.equal(a.shutterStates.get('living_blinds')?.tilt, 10);
  assert(shutterCommands.some(cmd => cmd.includes('~living_blinds~30~30 %~')), 'set_shutter_state updates live popup');

  // 3. Nextion pageOpenDetail event
  shutterCommands.length = 0;
  a.pages.shutter_page = {
    type: 'grid',
    title: 'Kaihtimet',
    slots: {
      1: { id: 'living_blinds', name: 'living_blinds', type: 'shutter', val: '50', value: '50 %' }
    }
  };
  a.currentPageId = 'shutter_page';
  await a.handleNextionEvent('event,pageOpenDetail,popupShutter,living_blinds');
  assert.equal(a.popupActive, true);
  assert.equal(a.activeShutterEntity, 'living_blinds');
  assert(shutterCommands.some(cmd => cmd.startsWith('entityUpdateDetail~living_blinds~')), 'pageOpenDetail sends entityUpdateDetail for popupShutter');

  // 4. Nextion buttonPress2: positionSlider
  let lastShutterAction: any = undefined;
  a.shutterActionTrigger = {
    trigger: async (_dev: any, tokens: any) => { lastShutterAction = tokens; }
  };
  await a.handleNextionEvent('event,buttonPress2,living_blinds,positionSlider,80');
  assert.equal(a.shutterStates.get('living_blinds')?.position, 80);
  assert.equal(lastShutterAction?.action_type, 'position');
  assert.equal(lastShutterAction?.position, 80);
  assert.equal(a.pages.shutter_page.slots[1].value, '80 %');

  // 5. Nextion buttonPress2: tiltSlider
  await a.handleNextionEvent('event,buttonPress2,living_blinds,tiltSlider,60');
  assert.equal(a.shutterStates.get('living_blinds')?.tilt, 60);
  assert.equal(lastShutterAction?.action_type, 'tilt');
  assert.equal(lastShutterAction?.tilt, 60);

  // 6. Nextion buttonPress2: up
  await a.handleNextionEvent('event,buttonPress2,living_blinds,up');
  assert.equal(a.shutterStates.get('living_blinds')?.position, 100);
  assert.equal(lastShutterAction?.action_type, 'up');
  assert.equal(lastShutterAction?.position, 100);

  // 7. Nextion buttonPress2: down
  await a.handleNextionEvent('event,buttonPress2,living_blinds,down');
  assert.equal(a.shutterStates.get('living_blinds')?.position, 0);
  assert.equal(lastShutterAction?.action_type, 'down');
  assert.equal(lastShutterAction?.position, 0);

  // 8. Nextion buttonPress2: stop
  await a.handleNextionEvent('event,buttonPress2,living_blinds,stop');
  assert.equal(lastShutterAction?.action_type, 'stop');

  // 9. Nextion buttonPress2: tiltOpen & tiltClose & tiltStop
  await a.handleNextionEvent('event,buttonPress2,living_blinds,tiltOpen');
  assert.equal(a.shutterStates.get('living_blinds')?.tilt, 100);
  assert.equal(lastShutterAction?.action_type, 'tilt_open');

  await a.handleNextionEvent('event,buttonPress2,living_blinds,tiltClose');
  assert.equal(a.shutterStates.get('living_blinds')?.tilt, 0);
  assert.equal(lastShutterAction?.action_type, 'tilt_close');

  await a.handleNextionEvent('event,buttonPress2,living_blinds,tiltStop');
  assert.equal(lastShutterAction?.action_type, 'tilt_stop');

  // 10. Nextion buttonPress2: bExit
  let shutterPageRendered = false;
  a.renderAndDisplayPage = async () => { shutterPageRendered = true; };
  await a.handleNextionEvent('event,buttonPress2,popupShutter,bExit');
  assert.equal(a.popupActive, false);
  assert.equal(a.activeShutterEntity, undefined);
  assert.equal(shutterPageRendered, true);

  // 11. Slot click on slot with type: 'shutter' opens popupShutter
  shutterCommands.length = 0;
  await a.handleNextionEvent('event,buttonPress2,living_blinds,button');
  assert.equal(a.popupActive, true);
  assert(shutterCommands.some(cmd => cmd === 'page popupShutter'));

  // 12. Inline buttons on cardEntities slot: up / stop / down
  a.popupActive = false;
  await a.handleNextionEvent('event,buttonPress2,living_blinds,up');
  assert.equal(a.shutterStates.get('living_blinds')?.position, 100);
  assert.equal(lastShutterAction?.action_type, 'up');

  // 9. MET 24h Hourly Forecast test
  const sampleMetHourly = {
    properties: {
      meta: { units: { air_temperature: 'celsius' }, updated_at: '2026-09-27T00:00:00Z' },
      timeseries: Array.from({ length: 28 }, (_, i) => ({
        time: new Date(Date.now() + i * 3600000).toISOString(),
        data: {
          instant: { details: { air_temperature: 15.0 + Math.sin(i / 3) * 5 } }
        }
      }))
    }
  };
  const hourlyPoints = (require('../lib/met-weather')).parseMet24hHourly(sampleMetHourly, 'Europe/Helsinki');
  assert.equal(hourlyPoints.length, 24, 'MET 24h hourly should return exactly 24 points');
  assert.ok(hourlyPoints[0].value > 50 && hourlyPoints[0].value < 250, 'Temperature should be scaled x10');
  assert.ok(hourlyPoints.some((p: any) => p.label !== undefined), 'Labels should be assigned to interval hours');

  // 10. Chart page with MET 24h weather forecast source
  const metChartCommands: any[] = [];
  a.sendCmnd = (_name: string, command: string) => metChartCommands.push(command);
  a.homey.app.metWeatherService = {
    getHourly24h: async () => ({
      points: hourlyPoints,
      nextAt: Date.now() + 3600000,
      stale: false
    })
  };
  const weatherChartPage = {
    type: Page.Type.chart,
    title: 'Lämpötilaennuste 24h',
    rawOptions: {
      chartSource: 'met',
      weatherForecast: true,
      chartType: 'line',
      unit: '°C'
    }
  };
  a.metHourly=hourlyPoints;
  a.pages.weather_chart = weatherChartPage;
  a.currentPageId = 'weather_chart';
  await Device.prototype.renderAndDisplayPage.call(a, weatherChartPage, false);
  assert(metChartCommands.some(cmd => cmd.startsWith('entityUpd~Lämpötilaennuste 24h~') && cmd.includes('°C')), 'MET 24h chart renders on panel');

  // 11. Homey Insights chart history binding
  const mockInsightsLogs = {
    'homey:device:temp-sensor-1:measure_temperature': {
      id: 'homey:device:temp-sensor-1:measure_temperature',
      ownerUri: 'homey:device:temp-sensor-1',
      name: 'measure_temperature'
    }
  };
  const mockInsightsEntries = {
    values: Array.from({ length: 24 }, (_, i) => ({
      t: Date.now() - (23 - i) * 3600000,
      v: 20.5 + (i % 3) * 0.5
    }))
  };
  const mockService: any = new BindingService(() => ({}));
  mockService.api = async () => ({
    insights: {
      getLogs: async () => mockInsightsLogs,
      getLogEntries: async () => mockInsightsEntries
    },
    devices: {
      getDevice: async () => ({
        available: true,
        capabilitiesObj: { measure_temperature: { value: 21.0, units: '°C' } }
      })
    }
  });
  const insightsHistory = await mockService.getInsightsHistory('temp-sensor-1', 'measure_temperature', 24);
  assert.equal(insightsHistory.length, 24, 'Insights history should return 24 entries');
  assert.equal(insightsHistory[0].value, 20.5);

  // Test rendering device with Insights
  a.bindingService = () => mockService;
  a.chartHistories.clear();
  const insightsChartCommands: any[] = [];
  a.sendCmnd = (_name: string, command: string) => insightsChartCommands.push(command);
  const insightsChartPage = {
    type: Page.Type.chart,
    title: 'Makuuhuone',
    rawOptions: {
      chartType: 'line',
      unit: '°C',
      binding: { source: 'homey', deviceId: 'temp-sensor-1', capabilityId: 'measure_temperature' }
    }
  };
  await Device.prototype.renderAndDisplayPage.call(a, insightsChartPage, false);
  assert(insightsChartCommands.some(cmd => cmd.startsWith('entityUpd~Makuuhuone~') && cmd.includes('°C')), 'Insights history loads and renders chart');
  assert.equal(a.chartHistories.get('temp-sensor-1:measure_temperature')?.length, 24, 'Insights history cached into chartHistories');

  // 12. Heimdall / Alarm system integration tests
  console.log('Testing Alarm / Heimdall integration...');
  let pinFailedTokens: any = undefined;
  a.alarmPinFailedTrigger = {
    trigger: async (_dev: any, tokens: any) => { pinFailedTokens = tokens; }
  };
  let alarmActionTokens: any = undefined;
  a.alarmActionTriggeredTrigger = {
    trigger: async (_dev: any, tokens: any) => { alarmActionTokens = tokens; }
  };
  const buzzerSounds: any[] = [];
  a.playBuzzer = (count: number, duration: number, pause: number) => {
    buzzerSounds.push({ count, duration, pause });
  };
  const homeyWrites: any[] = [];
  mockService.set = async (devId: string, capId: string, val: any) => {
    homeyWrites.push({ devId, capId, val });
  };
  a.getSetting = (key: string) => (['wake_to_alarm','disable_nav_when_armed'].includes(key) ? true : undefined as any);

  const alarmPage = {
    type: Page.Type.alarm,
    title: 'Kotihälytin',
    rawOptions: JSON.stringify({
      state: 'disarmed',
      pin: '1234',
      pin_required: true,
      language: 'fi',
      binding: { source: 'homey', deviceId: 'heimdall-1', capabilityId: 'homealarm_state' }
    })
  };
  a.pages.alarm_page = alarmPage;
  a.pages.other_page = { type: Page.Type.grid, title: 'Toinen sivu', slots: {} };

  // A. Flow card set_alarm_state_action sets state to armed_away
  await cards.set_alarm_state_action({ device: a, state: 'armed_away' });
  assert.equal(a.alarmState, 'armed_away', 'alarmState updated to armed_away');
  assert.equal(a.currentPageId, 'alarm_page', 'Current page switched to alarm_page');

  // B. Navigation is locked when alarm is armed
  await a.navigateToPage('other_page');
  assert.equal(a.currentPageId, 'alarm_page', 'Navigation to other_page must be blocked while armed');
  await a.handleNextionEvent('event,buttonPress2,bNext,button');
  assert.equal(a.currentPageId, 'alarm_page', 'bNext navigation must be blocked while armed');

  a.getSetting=(key:string)=>key==='wake_to_alarm';
  await a.navigateToPage('other_page');
  assert.equal(a.currentPageId,'other_page','Unchecked alarm navigation lock must allow navigation');
  a.getSetting=(key:string)=>['wake_to_alarm','disable_nav_when_armed'].includes(key);
  a.currentPageId='alarm_page';

  // C. Disarm with wrong PIN fails, sounds buzzer, fires trigger, stays armed
  buzzerSounds.length = 0;
  pinFailedTokens = undefined;
  await a.handleAlarmAction('disarm', '9999');
  assert.equal(a.alarmState, 'armed_away', 'Disarm with wrong PIN must not change alarmState');
  assert.deepEqual(pinFailedTokens, { entered_pin: '9999' }, 'alarmPinFailedTrigger fired with entered pin');
  assert(buzzerSounds.length > 0, 'Error buzzer sounded on wrong PIN');

  // D. Disarm with correct PIN succeeds, updates Homey capability and unlocks navigation
  buzzerSounds.length = 0;
  homeyWrites.length = 0;
  await a.handleAlarmAction('disarm', '1234');
  assert.equal(a.alarmState, 'disarmed', 'alarmState becomes disarmed with correct PIN');
  assert.deepEqual(alarmActionTokens, { action: 'disarm', pin: '1234' }, 'alarmActionTriggeredTrigger fired');
  assert.deepEqual(homeyWrites, [{ devId: 'heimdall-1', capId: 'homealarm_state', val: 'disarmed' }], 'homealarm_state set to disarmed');

  // E. When disarmed, navigation to other pages is allowed
  await a.navigateToPage('other_page');
  assert.equal(a.currentPageId, 'other_page', 'Navigation to other_page allowed when disarmed');

  // F. Screensaver waking returns to alarm page
  a.screensaverActive = true;
  await a.exitScreensaver();
  assert.equal(a.currentPageId, 'alarm_page', 'Waking from screensaver returns to alarm page when wake_to_alarm is enabled');

  // G. Live capability sync from Homey/Heimdall
  await a.onAlarmCapabilityChanged('partially_armed');
  assert.equal(a.alarmState, 'armed_home', 'partially_armed mapped to armed_home');
  assert.equal(a.currentPageId, 'alarm_page', 'Switches to alarm page on arming capability change');

  // H. Arm from panel
  homeyWrites.length = 0;
  await a.handleAlarmAction('arm_away');
  assert.equal(a.alarmState, 'arm_away', 'alarmState updated to arm_away');
  assert.deepEqual(homeyWrites, [{ devId: 'heimdall-1', capId: 'homealarm_state', val: 'armed' }], 'homealarm_state set to armed for arm_away');

  // =========================================================================
  // PIN-koodisuojaus kriittisille toiminnoille (Slot & Page PIN)
  // =========================================================================
  console.log('Testing Slot and Page PIN unlock...');
  a.alarmState = 'disarmed';

  // 1. Slot PIN Protection
  a.switch1 = false;
  const slotPinPage = {
    type: Page.Type.grid,
    title: 'PIN-suojatut toiminnot',
    slots: {
      1: {
        title: 'Pääkytkin',
        type: 'switch',
        id: 'power1',
        require_pin: true,
        pin: '5678'
      }
    }
  };
  a.pages.pin_slot_page = slotPinPage;
  a.currentPageId = 'pin_slot_page';

  // A. Clicking protected slot prompts for PIN and does not toggle switch
  await a.handleNextionEvent('event,buttonPress2,slot_1,button');
  assert(a.pendingUnlock, 'pendingUnlock must be set for slot requiring PIN');
  assert.equal(a.pendingUnlock.type, 'slot');
  assert.equal(a.pendingUnlock.slotId, 1);
  assert.equal(a.pendingUnlock.pin, '5678');
  assert.equal(a.currentHmiScreen, 'cardUnlock', 'Current screen must transition to cardUnlock');
  assert.equal(a.switch1, false, 'Switch must NOT be toggled before PIN is entered');

  // B. Entering wrong PIN fails, sounds error buzzer, and does not execute action
  buzzerSounds.length = 0;
  pinFailedTokens = undefined;
  await a.handleNextionEvent('event,buttonPress2,slot_1,cardUnlock-unlock,0000');
  assert(a.pendingUnlock, 'pendingUnlock must remain active after failed PIN');
  assert.deepEqual(pinFailedTokens, { entered_pin: '0000' }, 'alarmPinFailedTrigger fired on wrong PIN');
  assert(buzzerSounds.length > 0, 'Error buzzer sounded on wrong PIN');
  assert.equal(a.switch1, false, 'Switch must NOT be toggled on wrong PIN');

  // C. Entering correct PIN verifies, plays success buzzer, and executes switch toggle
  buzzerSounds.length = 0;
  await a.handleNextionEvent('event,buttonPress2,slot_1,cardUnlock-unlock,5678');
  assert.equal(a.pendingUnlock, undefined, 'pendingUnlock cleared after successful unlock');
  assert.equal(a.currentHmiScreen, '', 'currentHmiScreen cleared');
  assert.equal(a.switch1, true, 'Switch toggled to true after correct PIN');
  assert.deepEqual(buzzerSounds, [{ count: 1, duration: 1, pause: 1 }], 'Success buzzer played');

  // D. Exit/Cancel on cardUnlock dismisses unlock and restores page
  await a.handleNextionEvent('event,buttonPress2,slot_1,button');
  assert(a.pendingUnlock, 'pendingUnlock set again for slot click');
  await a.handleNextionEvent('event,buttonPress2,slot_1,bExit');
  assert.equal(a.pendingUnlock, undefined, 'pendingUnlock cancelled on bExit');
  assert.equal(a.currentPageId, 'pin_slot_page', 'Returned to original page after exit');

  // 2. Page PIN Protection
  const protectedAdminPage = {
    type: Page.Type.grid,
    title: 'Ylläpito',
    require_pin: true,
    pin: '8888',
    slots: {}
  };
  a.pages.admin = protectedAdminPage;
  a.currentPageId = 'active';

  // E. Navigating to protected page prompts for PIN and stays on current page
  await a.navigateToPage('admin');
  assert(a.pendingUnlock, 'pendingUnlock must be set for page requiring PIN');
  assert.equal(a.pendingUnlock.type, 'page');
  assert.equal(a.pendingUnlock.targetPageId, 'admin');
  assert.equal(a.pendingUnlock.pin, '8888');
  assert.equal(a.currentPageId, 'active', 'Navigation must be held until unlocked');

  await a.navigateToPage('admin');
  assert.equal(a.currentPageId,'active','Repeated navigation must not bypass an outstanding PIN prompt');

  // F. Wrong PIN rejected for page unlock
  buzzerSounds.length = 0;
  await a.handleNextionEvent('event,buttonPress2,page_admin,cardUnlock-unlock,1234');
  assert.equal(a.currentPageId, 'active', 'Still on active page after wrong PIN');
  assert(buzzerSounds.length > 0, 'Error buzzer sounded on wrong PIN');

  // G. Correct PIN navigates to protected page
  await a.handleNextionEvent('event,buttonPress2,page_admin,cardUnlock-unlock,8888');
  assert.equal(a.pendingUnlock, undefined, 'pendingUnlock cleared after page unlock');
  assert.equal(a.currentPageId, 'admin', 'Successfully navigated to admin page');

  // Detail events must respect slot PIN, not only ordinary button presses.
  a.currentPageId='active';
  a.pages.active={type:Page.Type.grid,title:'Koti',slots:{}};
  a.pages.active.slots[2]={id:'protected_light',type:'light',require_pin:true,pin:'6789',title:'Valo'};
  let openedProtectedLight=0;
  const savedOpenLight=a.openLightPopup;
  a.openLightPopup=async()=>{openedProtectedLight++;};
  await a.handleNextionEvent('event,pageOpenDetail,popupLight,protected_light');
  assert.equal(openedProtectedLight,0,'Protected detail must wait for PIN');
  assert(a.pendingUnlock,'Detail event opens PIN prompt');
  await a.handleNextionEvent('event,buttonPress2,protected_light,cardUnlock-unlock,6789');
  assert.equal(openedProtectedLight,1,'Verified PIN opens detail once');
  a.openLightPopup=savedOpenLight;

  // =========================================================================
  // Yötila & kirkkauden ajastukset (Night Mode & Scheduled Brightness)
  // =========================================================================
  console.log('Testing Night Mode & Schedule...');

  let nightModeTriggeredTokens: any = undefined;
  a.nightModeChangedTrigger = {
    trigger: async (_dev: any, tokens: any) => { nightModeTriggeredTokens = tokens; }
  };

  const customSettings: any = {
    night_mode_enabled: true,
    night_mode_start: '22:00',
    night_mode_end: '07:00',
    night_brightness: 15,
    night_sleep_brightness: 5,
    night_sleep_timeout: 10,
    night_theme_black: true,
    night_follow_alarm: true,
    brightness: 100,
    sleep_brightness: 30
  };
  a.getSettings = () => customSettings;
  a.getSetting = (key: string) => customSettings[key];

  // A. Follow Alarm: armed_night triggers Night Mode immediately
  a.manualNightMode = undefined;
  await a.setAlarmState('armed_night');
  assert.equal(a.nightModeActive, true, 'Night mode must activate when alarm is armed_night');
  assert.deepEqual(nightModeTriggeredTokens, { active: true }, 'nightModeChangedTrigger fired with active: true');

  // Disarming alarm updates Night Mode based on scheduled window or manual state
  await a.setAlarmState('disarmed');

  // B. Flow card: set_night_mode action
  await cards.set_night_mode({ device: a, mode: 'on' });
  assert.equal(a.manualNightMode, true, 'manualNightMode is true after set_night_mode on');
  assert.equal(a.nightModeActive, true, 'nightModeActive is true after set_night_mode on');

  await cards.set_night_mode({ device: a, mode: 'off' });
  assert.equal(a.manualNightMode, false, 'manualNightMode is false after set_night_mode off');
  assert.equal(a.nightModeActive, false, 'nightModeActive is false after set_night_mode off');

  await cards.set_night_mode({ device: a, mode: 'auto' });
  assert.equal(a.manualNightMode, undefined, 'manualNightMode cleared after set_night_mode auto');

  // C. Condition helper and card check
  a.nightModeActive = true;
  assert.equal(a.isNightMode(), true, 'isNightMode helper returns true');
  a.nightModeActive = false;
  assert.equal(a.isNightMode(), false, 'isNightMode helper returns false');

  // D. Flow card: set_brightness action
  await cards.set_brightness({ device: a, brightness: 75, sleep_brightness: 10 });
  assert.equal(a.customBrightness, 75, 'customBrightness set by Flow action');
  assert.equal(a.customSleepBrightness, 10, 'customSleepBrightness set by Flow action');

  // E. Flow card: show_unlock_page action
  await cards.show_unlock_page({ device: a, title: 'Turvalukitus', destination: 'unlock_door' });
  assert(a.pendingUnlock, 'pendingUnlock set after show_unlock_page action');
  assert.equal(a.pendingUnlock.type, 'action');
  assert.equal(a.currentHmiScreen, 'cardUnlock');

  // --- popupThermo & Thermostat Mode Tests ---
  console.log('Testing popupThermo & Thermostat Mode Integration...');
  const thermoPopupCommands: string[] = [];
  a.sendCmnd = (_name: string, command: string) => thermoPopupCommands.push(command);

  // 1. show_thermo_popup_action flow card
  await cards.show_thermo_popup_action({
    device: a,
    entity: 'living_thermo',
    mode1: 'Lämmitys',
    modes1: 'Auto?Lämmitys?Viilennys?Pois',
    mode2: 'Koti',
    modes2: 'Koti?Säästö?Mukavuus?Tehostus',
    mode3: 'Auto',
    modes3: 'Auto?Matala?Keski?Korkea'
  });
  assert.equal(a.popupActive, true, 'popupActive true after show_thermo_popup_action');
  assert.equal(a.activeThermoEntity, 'living_thermo');
  assert(thermoPopupCommands.some(cmd => cmd === 'page popupThermo'), 'show_thermo_popup opens popupThermo');
  assert(thermoPopupCommands.some(cmd => cmd.startsWith('entityUpdateDetail~living_thermo~') && cmd.includes('Lämmitys~Auto?Lämmitys?Viilennys?Pois')), 'popup sends entityUpdateDetail');

  // 2. set_thermo_mode_action flow card
  await cards.set_thermo_mode_action({
    device: a,
    entity: 'living_thermo',
    mode_row: 'mode1',
    mode: 'Auto'
  });
  assert.equal(a.thermoStates.get('living_thermo')?.currentMode1, 'Auto');

  // 3. Nextion pageOpenDetail event from cardThermo
  thermoPopupCommands.length = 0;
  a.pages.thermo_page = {
    type: 'thermostat',
    title: 'Termostaatti',
    rawOptions: {
      heading1: 'Toimintatila',
      currentMode1: 'Lämmitys',
      modeList1: 'Auto?Lämmitys?Viilennys?Pois'
    }
  };
  a.currentPageId = 'thermo_page';
  a.currentPageType = Page.Type.thermostat;
  await a.handleNextionEvent('event,pageOpenDetail,popupThermo,living_thermo');
  assert.equal(a.popupActive, true);
  assert.equal(a.activeThermoEntity, 'living_thermo');
  assert(thermoPopupCommands.some(cmd => cmd.startsWith('entityUpdateDetail~living_thermo~')), 'pageOpenDetail sends entityUpdateDetail');

  // 4. Nextion buttonPress2: mode-operation_mode (Row 1 click)
  let lastThermoAction: any = undefined;
  a.thermostatModeChangedTrigger = {
    trigger: async (_dev: any, tokens: any) => { lastThermoAction = tokens; }
  };
  await a.handleNextionEvent('event,buttonPress2,living_thermo,mode-operation_mode,1');
  assert.equal(a.thermoStates.get('living_thermo')?.currentMode1, 'Lämmitys');
  assert.deepEqual(lastThermoAction, {
    entity: 'living_thermo',
    mode_type: 'operation_mode',
    mode: 'Lämmitys',
    mode_index: 1,
    row: 1
  });

  // 5. Nextion buttonPress2: mode-preset_mode (Row 2 click)
  await a.handleNextionEvent('event,buttonPress2,living_thermo,mode-preset_mode,2');
  assert.equal(a.thermoStates.get('living_thermo')?.currentMode2, 'Mukavuus');
  assert.deepEqual(lastThermoAction, {
    entity: 'living_thermo',
    mode_type: 'preset_mode',
    mode: 'Mukavuus',
    mode_index: 2,
    row: 2
  });

  // 6. Nextion buttonPress2: popupThermo bExit
  let pageRestored = false;
  a.renderAndDisplayPage = async () => { pageRestored = true; };
  await a.handleNextionEvent('event,buttonPress2,popupThermo,bExit');
  assert.equal(a.popupActive, false);
  assert.equal(a.activeThermoEntity, undefined);
  assert.equal(pageRestored, true);

  // 7. Slot click on slot with type: 'thermostat' opens popupThermo
  thermoPopupCommands.length = 0;
  a.pages.active = {
    type: 'grid',
    title: 'Koti',
    slots: {
      1: { id: 'thermo_slot', name: 'thermo_slot', type: 'thermostat', val: '21.5' }
    }
  };
  a.currentPageId = 'active';
  a.currentPageType = Page.Type.grid;
  await a.handleNextionEvent('event,buttonPress2,thermo_slot,button');
  assert.equal(a.popupActive, true);
  assert(thermoPopupCommands.some(cmd => cmd === 'page popupThermo'), 'Slot click opens popupThermo');

  console.log('Binding, Flow routing, relay isolation, settings, weather, thermo, media, power, chart, fan, insights, MET 24h, Alarm, PIN Protection, Night Mode, and popupThermo tests passed');
}

run().catch(e=>{console.error(e);process.exitCode=1;});
