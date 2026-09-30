import assert from 'assert';
import { GlobalWeather, validateWeatherConfig } from '../lib/global-weather';
import { MetWeatherService } from '../lib/met-weather';
const Module=require('module'),original=Module._load;
Module._load=function(id:string,...args:any[]){if(id==='homey')return{Device:class{},App:class{}};return original.call(this,id,...args);};
const Device=require('../drivers/nspanel/device'),API=require('../api');
async function run(){
  const notificationDevice=new Device();const notificationTimers=new Map<number,()=>Promise<void>>();let notificationId=0,dismissals=0;
  const notificationCommands:string[]=[];
  Object.assign(notificationDevice,{homey:{setTimeout:(fn:()=>Promise<void>)=>{notificationTimers.set(++notificationId,fn);return notificationId;},clearTimeout:(id:number)=>notificationTimers.delete(id)},
    clearPopupEntities:()=>{},updateBrightness:()=>{},updateSleepTimer:()=>{},log:()=>{},
    sendCmnd:(_topic:string,command:string)=>notificationCommands.push(command),
    dismissNotification:async()=>{dismissals++;},screensaverActive:true,currentPageId:'active'});
  await notificationDevice.showFlowNotification({heading:'First',message:'Test',timeout:1});
  assert.equal(notificationDevice.returnPageAfterPopup,'screensaver');assert(notificationCommands.includes('pageType~popupNotify'));
  assert(notificationCommands.some(command=>command.includes('First')));
  const oldNotificationTimer=[...notificationTimers.values()][0];
  await notificationDevice.showFlowNotification({heading:'Second',timeout:0});
  assert.equal(notificationDevice.returnPageAfterPopup,'screensaver','Replacement preserves original return destination');
  await oldNotificationTimer();assert.equal(dismissals,0);assert.equal(notificationTimers.size,0);
  await notificationDevice.showFlowNotification({heading:'Third',timeout:1});
  await [...notificationTimers.values()][0]();assert.equal(dismissals,1);

  const {PageManager}=require('../drivers/nspanel/modules/page-manager');
  const returnTimers:Array<()=>void>=[];let returnRenders=0;
  const returnDevice:any={pages:{active:{type:'grid',slots:{}}},currentPageId:'missing',returnPageAfterPopup:'missing',
    log:()=>{},error:()=>{},homey:{setTimeout:(fn:()=>void)=>returnTimers.push(fn)},
    setPage:async()=>{returnManager.clearPopupEntities();}};
  const returnManager=new PageManager(returnDevice);returnManager.renderAndDisplayPage=async()=>{returnRenders++;};
  await returnManager.dismissNotification();assert.equal(returnDevice.currentPageId,'active');
  returnManager.clearPopupEntities();returnDevice.popupActive=true;
  returnTimers.splice(0).forEach(fn=>fn());assert.equal(returnRenders,0);
  returnDevice.popupActive=false;await returnManager.dismissNotification();
  returnTimers.splice(0).forEach(fn=>fn());assert.equal(returnRenders,1);

  const timedDevice=new Device();
  const deviceTimers=new Map<number,()=>void>();let deviceTimerId=0;
  const connections:string[]=[];
  Object.assign(timedDevice,{log:()=>{},error:()=>{},
    homey:{setTimeout:(fn:()=>void)=>{const id=++deviceTimerId;deviceTimers.set(id,()=>{deviceTimers.delete(id);fn();});return id;},clearTimeout:(id:number)=>deviceTimers.delete(id),clearInterval:()=>{}},
    unsubscribe:()=>{},unsubscribeDirectMqtt:()=>{},getAvailable:()=>false,
    getSettings:()=>({}),setupMqttConnection:(settings:any)=>connections.push(settings.mqtt_topic),
  });
  const change=(topic:string)=>({oldSettings:{mqtt_mode:'scanno',mqtt_path:'%prefix%/%topic%/',mqtt_topic:'old'},newSettings:{mqtt_mode:'scanno',mqtt_path:'%prefix%/%topic%/',mqtt_topic:topic},changedKeys:['mqtt_topic']});
  await timedDevice.onSettings(change('first'));const obsolete=[...deviceTimers.values()];
  await timedDevice.onSettings(change('latest'));obsolete.forEach(fn=>fn());assert.deepEqual(connections,[]);
  [...deviceTimers.values()].forEach(fn=>fn());assert.deepEqual(connections,['latest']);
  let startupCalls=0;
  timedDevice.scheduleDeviceTimer('startup-time',()=>{startupCalls++;},1000);
  const offlineTimers=[...deviceTimers.values()];timedDevice.setOffline();offlineTimers.forEach(fn=>fn());assert.equal(startupCalls,0);
  await timedDevice.onSettings(change('after-stop'));const shutdownTimers=[...deviceTimers.values()];
  timedDevice.getBindingManager=()=>({stopBindings:()=>{}});
  await timedDevice.onUninit();shutdownTimers.forEach(fn=>fn());assert.deepEqual(connections,['latest']);assert.equal(deviceTimers.size,0);
  await timedDevice.onSettings(change('ignored'));assert.equal(deviceTimers.size,0);

  const {MqttHandler}=require('../drivers/nspanel/modules/mqtt-handler');
  const mqttTimers=new Map<number,()=>void>();let mqttTimerId=0,initializations=0;
  const mqttStates:boolean[]=[];
  const mqttDevice:any={getSettings:()=>({}),log:()=>{},error:()=>{},
    homey:{setTimeout:(fn:()=>void)=>{const id=++mqttTimerId;mqttTimers.set(id,()=>{mqttTimers.delete(id);fn();});return id;},clearTimeout:(id:number)=>mqttTimers.delete(id)},
    setAvailable:async()=>{},setUnavailable:async()=>{},setOnline:()=>{},setOffline:()=>{},
    updateBrightness:()=>{initializations++;},setPage:async()=>{initializations++;},
    onlineStatusChangedTrigger:{trigger:async(_d:any,tokens:any)=>{mqttStates.push(tokens.state);}}
  };
  const mqttHandler=new MqttHandler(mqttDevice);mqttHandler.sendCmnd=()=>{initializations++;};
  await mqttHandler.onMessage('panel','tele/LWT','Online');
  const staleTimers=[...mqttTimers.values()];assert.equal(mqttTimers.size,3);
  await mqttHandler.onMessage('panel','tele/LWT','Offline');assert.equal(mqttTimers.size,0);
  staleTimers.forEach(fn=>fn());await new Promise(resolve=>setImmediate(resolve));
  assert.equal(initializations,0);assert.deepEqual(mqttStates,[false]);
  await mqttHandler.onMessage('panel','tele/LWT','Online');
  const currentTimers=[...mqttTimers.values()];mqttTimers.clear();currentTimers.forEach(fn=>fn());
  await new Promise(resolve=>setImmediate(resolve));assert.equal(initializations,4);
  [...mqttTimers.values()].forEach(fn=>fn());await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(mqttStates,[false,true]);
  await mqttHandler.onMessage('panel','tele/LWT','Online');mqttHandler.stop();assert.equal(mqttTimers.size,0);

  // Exercise the real Device -> PageManager screensaver path without inventing
  // updateScreensaver in the mock (that missing method caused a runtime crash).
  const screen = Object.create(Device.prototype);
  const screenCommands: string[] = [], screenTimers: Array<{fn:()=>void,ms:number}> = [];
  let weatherUpdates=0,statusUpdates=0,screenEntered=0;
  Object.assign(screen, {
    log:()=>{}, screensaverActive:false, popupActive:true,
    homey:{setTimeout:(fn:()=>void,ms:number)=>{screenTimers.push({fn,ms});}},
    clearPopupEntities:()=>{}, sendCmnd:(_topic:string,command:string)=>screenCommands.push(command),
    updateBrightness:()=>{},updateSleepTimer:()=>{},
    weatherUpdate:()=>{weatherUpdates++;},sendStatusUpdate:()=>{statusUpdates++;},
    statusIcon1:{icon:'home'},statusIcon2:{icon:''},
    enterScreensaverTrigger:{trigger:()=>{screenEntered++;return Promise.resolve();}},
  });
  screen.showScreensaver();
  assert(screen.screensaverActive);assert.equal(screen.popupActive,false);
  assert.equal(screen.currentPageType,'screensaver');assert.equal(screen.currentHmiScreen,'screensaver');
  assert.equal(screenCommands[0],'pageType~screensaver');
  screenTimers.splice(0).forEach(t=>t.fn());
  assert.equal(weatherUpdates,1);assert.equal(statusUpdates,1);assert.equal(screenEntered,1);
  screen.showScreensaver();screenTimers.splice(0).forEach(t=>t.fn());assert.equal(screenEntered,1);
  screen.showScreensaver();screen.screensaverActive=false;
  screenTimers.splice(0).forEach(t=>t.fn());assert.equal(weatherUpdates,2);assert.equal(statusUpdates,2);
  await screen.setPage('screensaver',true);
  screenTimers.splice(0).forEach(t=>t.fn());assert.equal(weatherUpdates,3);

  // Run the actual initialization tail with MQTT connecting before bindings finish.
  const initSource=Device.prototype.onInit.toString();
  const initTail=initSource.slice(initSource.indexOf('// Start unavailable before connecting:')).replace(/}\s*$/, '');
  assert(initTail.includes('this.setupMqttConnection(settings)'));
  const runInitTail=new Function('settings', 'return (async () => {'+initTail+'})();');
  let available=false;const availability:boolean[]=[];
  const initDevice={
    setUnavailable:async()=>{available=false;availability.push(false);},
    setupMqttConnection:()=>{available=true;availability.push(true);},
    refreshBindings:async()=>{await new Promise(resolve=>setImmediate(resolve));},
    refreshWeatherSource:async()=>{},error:()=>{},
  };
  await runInitTail.call(initDevice,{});
  assert.equal(available,true,'Initialization must not overwrite a connection that is already online');
  assert.deepEqual(availability,[false,true]);

  const deleteDevice:any={pages:{active:{title:'Home'},other:{title:'Other'}},currentPageId:'other',getData:()=>({id:'delete-test'}),savePages:async()=>{throw new Error('storage failure');},renderAndDisplayPage:async()=>{}};
  const deleteArgs={homey:{drivers:{getDriver:()=>({getDevices:()=>[deleteDevice]})}},params:{id:'delete-test',pageId:'other'}};
  await assert.rejects(API.deleteDevicePage(deleteArgs),/storage failure/);
  assert(deleteDevice.pages.other,'Failed persistence restores deleted page');assert.equal(deleteDevice.currentPageId,'other');
  deleteDevice.savePages=async()=>{};
  await API.deleteDevicePage(deleteArgs);assert(!deleteDevice.pages.other);assert.equal(deleteDevice.currentPageId,'active');
  await API.deleteDevicePage(deleteArgs); // Retry after a lost successful response.
  await assert.rejects(API.deleteDevicePage({...deleteArgs,params:{id:'delete-test',pageId:'active'}}),/last page/);

  let now=Date.now(),requests=0,lastUrl='';const start=now;
  const data={properties:{meta:{units:{air_temperature:'celsius'},updated_at:new Date(now).toISOString()},timeseries:Array.from({length:180},(_,i)=>({time:new Date(now+i*3600000).toISOString(),data:{instant:{details:{air_temperature:10}},next_1_hours:{summary:{symbol_code:'cloudy'}}}}))}};
  const settings:any={},timers=new Map<any,any>();let timerId=0;
  const homey:any={manifest:{id:'test',version:'1',author:{email:'test@example.com'}},settings:{get:(k:string)=>settings[k],set:(k:string,v:any)=>settings[k]=v},geolocation:{getLatitude:()=>10,getLongitude:()=>20},clock:{getTimezone:()=> 'UTC'},i18n:{getLanguage:()=> 'en'},setTimeout:(fn:any)=>{const id=++timerId;timers.set(id,fn);return id;},clearTimeout:(id:any)=>timers.delete(id)};
  let fail=false;
  const met=new MetWeatherService(()=>homey,async(url)=>{requests++;lastUrl=url;return fail?{status:503,headers:{}}:{status:200,headers:{expires:new Date(now+3*3600000).toUTCString()},body:data}},()=>now,()=>0);
  const global=new GlobalWeather(()=>homey,met);const owners=Array.from({length:5},()=>({}));const updates:any[][]=owners.map(()=>[]);
  const disposers=owners.map((owner,i)=>global.subscribe(owner,snapshot=>updates[i].push(snapshot),{source:'met',location:'custom',latitude:60,longitude:25,interval:1}));
  await global.refresh();assert.equal(requests,1,'Five panels must use one internet fetch');assert.equal(timers.size,1,'Exactly one weather scheduler');
  assert(updates.every(list=>list.at(-1).forecast && list.at(-1).hourly.length===24));
  now=start+3600000;await met.get(60,25,'UTC');assert.equal(requests,1,'Expires must take precedence over shorter refresh interval');
  global.setConfig({location:'homey',latitude:60,longitude:25,interval:6});await global.refresh();assert.equal(requests,2);assert(lastUrl.includes('lat=10&lon=20'),'Homey location must ignore old custom coordinates');
  assert.deepEqual(global.getConfig(),{location:'homey',interval:6});
  assert.throws(()=>global.setConfig({location:'custom',latitude:NaN,longitude:20,interval:1}));assert.throws(()=>validateWeatherConfig({location:'homey',interval:5}));
  fail=true;global.setConfig({location:'custom',latitude:50,longitude:30,interval:1});await global.refresh();assert(updates.every(list=>list.at(-1).state==='error'&&!list.at(-1).forecast&&!list.at(-1).hourly));
  disposers.forEach(dispose=>dispose());assert.equal(timers.size,0);const count=requests;global.setConfig({location:'homey',interval:1});await Promise.resolve();assert.equal(requests,count,'No users means no background requests');

  const d=new Device();d.getData=()=>({id:'panel'});d.pages={active:{type:'grid',slots:{1:{id:'first',type:'timer',val:'05:00',durationSeconds:300},2:{id:'second',type:'timer',val:'30:00',durationSeconds:1800}}}};
  d.currentPageId='active';d.screensaverActive=false;d.homey={setTimeout:()=>0,setInterval:()=>1,clearInterval:()=>{}};d.sendCmnd=()=>{};d.log=d.error=()=>{};d.scheduleBindingRender=()=>{};d.playBuzzer=()=>{};
  await d.openTimerPopup('second');assert.equal(d.timerStates.get('second').minutes,30);
  d.updateTimerSlotDisplay('second',{minutes:29,seconds:59});assert.equal(d.pages.active.slots[1].val,'05:00');assert.equal(d.pages.active.slots[2].val,'29:59');
  let finished=0;d.timerFinishedTrigger={trigger:async()=>{finished++;return Promise.resolve();}};
  d.enterScreensaverTrigger={trigger:()=>Promise.resolve()};
  d.exitScreensaverTrigger={trigger:()=>Promise.resolve()};
  await d.controlTimer('second','start');const state=d.timerStates.get('second');state.endsAt=Date.now()-1000;d.tickTimer();assert.equal(finished,1,'Timer catches up to real elapsed time');d.tickTimer();assert.equal(finished,1,'Completion only once');
  d.savePages=async()=>{};d.renderAndDisplayPage=async()=>{};
  const apiHomey={drivers:{getDriver:()=>({getDevices:()=>[d]})}};
  for(const source of ['met','flow','fixed','spot'])await API.setDevicePage({homey:apiHomey,params:{id:'panel'},body:{id:'chart',type:'chart',showNow:false,slots:{},rawOptions:{binding:{source},values:[]}}});
  assert.equal(d.pages.chart.rawOptions.binding.source,'flow','Legacy Spot becomes explicit Flow');
  await assert.rejects(API.setDevicePage({homey:apiHomey,params:{id:'panel'},body:{id:'chart',type:'chart',rawOptions:{binding:{source:'unknown'}}}}));
  // Page security and order survive the API; renaming updates stored links and is retryable.
  await API.setDevicePage({homey:apiHomey,params:{id:'panel'},body:{id:'private',type:'grid',slots:{},order:2,require_pin:true,pin:'6789',showNow:false}});
  assert.equal(d.pages.private.pin,'6789');assert.equal(d.pages.private.require_pin,true);assert.equal(d.pages.private.order,2);
  d.pages.active.navigation={leading:{target:'private'}};
  const rename={id:'renamed',renameFrom:'private',type:'grid',slots:{},order:1,showNow:false};
  await API.setDevicePage({homey:apiHomey,params:{id:'panel'},body:rename});
  assert(!d.pages.private);assert.equal(d.pages.active.navigation.leading.target,'renamed');assert.equal(d.pages.renamed.pin,undefined);
  await API.setDevicePage({homey:apiHomey,params:{id:'panel'},body:rename});
  await assert.rejects(API.setDevicePage({homey:apiHomey,params:{id:'panel'},body:{...rename,renameFrom:'renamed',id:'active'}}));

  // Basic, dimmable and colour lights expose only real supported controls.
  const caps:any={onoff:{setable:true,value:true}};const writes:any[]=[];const sent:string[]=[];
  d.pages.active.slots={1:{id:'lamp',type:'light',binding:{source:'homey',deviceId:'lamp-device',capabilityId:'onoff'}}};
  d.currentPageId='active';d.getSetting=()=>false;d.updateSleepTimer=()=>{};
  d.homey.app={bindingService:{capability:(_b:any,id:string)=>caps[id],value:(b:any)=>caps[b.capabilityId]?.value,set:async(...args:any[])=>{writes.push(args);}}};
  d.sendCmnd=(_name:string,cmd:string)=>sent.push(cmd);
  await d.openLightPopup('lamp',undefined,false);
  assert(sent.at(-1)?.includes('~disable~disable~disable~'),'Switch-only lamp hides all sliders and colour wheel');
  await d.handleNextionEvent('event,buttonPress2,lamp,brightnessSlider,40');assert.equal(writes.length,0,'Unsupported commands must not reach Homey');
  caps.dim={setable:true,value:0.4};await d.openLightPopup('lamp',undefined,false);
  assert(sent.at(-1)?.includes('~40~disable~disable~'));
  caps.light_hue={setable:true,value:0.5};caps.light_saturation={setable:true,value:0.5};
  await d.openLightPopup('lamp',undefined,false);assert(sent.at(-1)?.includes('~40~disable~enable~'));
  await d.handleNextionEvent('event,buttonPress2,lamp,colorWheel,NaN|2|100');assert.equal(writes.length,0);

  const beforeFlow={...d.lightStates.get('lamp')};
  await d.setLightState('lamp',{onoff:false,brightness:5,color:'red'});
  assert.equal(d.lightStates.get('lamp').onoff,beforeFlow.onoff,'Flow must not override bound on/off state');
  assert.equal(d.lightStates.get('lamp').brightness,beforeFlow.brightness,'Flow must not briefly replace bound brightness');
  assert.equal(d.lightStates.get('lamp').color,'red','Flow may still enrich presentation');
  d.pages.active.slots[1].binding={source:'flow'};
  await d.setLightState('lamp',{onoff:false,brightness:5});
  assert.equal(d.lightStates.get('lamp').brightness,5);assert.equal(d.lightStates.get('lamp').onoff,false);
  d.pages.active.slots[2]={id:'mode',type:'input_sel',binding:{source:'flow'}};
  await d.openSelectPopup('mode');assert.equal(d.activeLightEntity,undefined,'Opening select clears prior light identity');
  const popupCommands=sent.length;d.weatherUpdate();d.thermoUpdate();
  assert.equal(sent.length,popupCommands,'Background value updates must not overwrite the active popup');

  const watched:string[]=[];
  d.pages.thermo={type:'thermostat',slots:{},rawOptions:{binding:{source:'homey',deviceId:'thermostat',capabilityId:'target_temperature'}}};
  d.homey.app.bindingService.capabilities=async()=>({thermostat_mode:{type:'enum'}});
  d.homey.app.bindingService.watch=async(b:any)=>{watched.push(b.capabilityId);return()=>{};};
  await d.refreshBindings();assert(watched.includes('thermostat_mode'),'Thermostat mode must be subscribed for live primary values');
  d.currentPageId='thermo';d.homey.app.bindingService.capability=(_b:any,id:string)=>id==='thermostat_mode'?{}:undefined;
  assert.equal(d.flowPopupState('thermo','thermo',{mode_row:'mode1',mode:'heat'}).mode,undefined);
  assert.equal(d.flowPopupState('thermo','thermo',{mode_row:'mode2',mode:'boost'}).mode,'boost','Secondary Flow mode remains editable');

  // Capability-specific shutter/fan controls and enum labels use real Homey metadata.
  d.currentPageId='active';d.currentPageType='grid';d.homey.i18n={getLanguage:()=> 'fi'};
  for(const id of Object.keys(caps))delete caps[id];
  d.homey.app.bindingService.capability=(_b:any,id:string)=>caps[id];
  d.pages.active.slots={1:{id:'blind',type:'shutter',binding:{source:'homey',deviceId:'blind-device',capabilityId:'windowcoverings_set'}}};
  caps.windowcoverings_set={setable:true,value:0.4};
  await d.openShutterPopup('blind',undefined,false);
  let parts=sent.at(-1)!.split('~');
  assert.equal(parts[2],'40');assert.equal(parts[10],'disable','Position-only shutter cannot stop');
  assert.equal(parts[19],'disable','No phantom tilt slider');
  writes.length=0;
  for(const [action,value] of [['positionSlider','NaN'],['positionSlider',''],['tiltSlider','30'],['stop','']])await d.handleNextionEvent(`event,buttonPress2,blind,${action},${value}`);
  assert.equal(writes.length,0,'Invalid or unsupported shutter commands are ignored');
  await d.handleNextionEvent('event,buttonPress2,blind,up,');
  assert.deepEqual(writes.pop(),['blind-device','windowcoverings_set',1],'Position-only shutter uses its supported command immediately');
  caps.windowcoverings_state={setable:true,value:'idle'};delete caps.windowcoverings_set;
  await d.openShutterPopup('blind',undefined,false);parts=sent.at(-1)!.split('~');
  assert.equal(parts[2],'disable');assert.equal(parts[10],'enable');
  await d.handleNextionEvent('event,buttonPress2,blind,stop,');assert.deepEqual(writes.pop(),['blind-device','windowcoverings_state','idle']);
  caps.windowcoverings_tilt_set={setable:true,value:0.25};
  await d.openShutterPopup('blind',undefined,false);parts=sent.at(-1)!.split('~');
  assert.equal(parts[19],'25');assert.equal(parts[17],'disable','No unsupported Homey tilt stop');
  d.pages.active.slots[1].binding={source:'flow'};
  await d.openShutterPopup('blind',undefined,false);assert.equal(sent.at(-1)!.split('~')[17],'enable','Flow retains all shutter actions');

  d.pages.active.slots={1:{id:'fan',type:'fan',binding:{source:'homey',deviceId:'fan-device',capabilityId:'onoff'}}};
  caps.onoff={setable:true,value:true};await d.openFanPopup('fan');d.sendBoundFanUpdate('fan');
  assert.equal(sent.at(-1)!.split('~')[5],'disable');
  writes.length=0;await d.handleNextionEvent('event,buttonPress2,fan,number-set,2');assert.equal(writes.length,0);
  caps.dim={setable:true,value:0.5};d.sendBoundFanUpdate('fan');assert.equal(sent.at(-1)!.split('~')[5],'2');
  await d.handleNextionEvent('event,buttonPress2,fan,number-set,NaN');assert.equal(writes.length,0);
  await d.handleNextionEvent('event,buttonPress2,fan,number-set,3');assert.deepEqual(writes.pop(),['fan-device','dim',0.75]);

  caps.operating_mode={setable:true,type:'enum',value:'away',values:[{id:'home',title:{fi:'Kotona',en:'Home'}},{id:'away',title:{fi:'Poissa',en:'Away'}}]};
  d.pages.active.slots={1:{id:'mode',type:'input_sel',binding:{source:'homey',deviceId:'mode-device',capabilityId:'operating_mode'}}};
  await d.openSelectPopup('mode');d.sendBoundSelectUpdate('mode');assert(sent.at(-1)!.endsWith('~Poissa~Kotona?Poissa'));
  writes.length=0;await d.handleNextionEvent('event,buttonPress2,mode,mode-input_sel,0');assert.deepEqual(writes.pop(),['mode-device','operating_mode','home']);
  for(const value of ['-1','2','1x','1.5',''])await d.handleNextionEvent(`event,buttonPress2,mode,mode-input_sel,${value}`);
  assert.equal(writes.length,0,'Invalid enum indices never reach Homey');
  caps.operating_mode.values=['one','two'];assert.deepEqual(d.selectOptions('mode'),[{id:'one',label:'one'},{id:'two',label:'two'}]);

  caps.thermostat_mode={setable:true,type:'enum',value:'HeatMode',values:[{id:'HeatMode',title:{fi:'Lämmitys'}},{id:'OffMode',title:{fi:'Pois'}}]};
  d.currentPageId='thermo';d.currentPageType='thermostat';await d.openThermoPopup('thermo',undefined,false);
  assert(sent.at(-1)!.includes('Lämmitys?Pois'));
  await d.handleNextionEvent('event,buttonPress2,thermo,mode-operation_mode,1');
  assert.deepEqual(writes.pop(),['thermostat','thermostat_mode','OffMode'],'Localized thermostat selection sends the exact enum ID');

  // PageManager.showNotification delayed content send must respect viewRevision.
  const {PageManager:NotifyPageManager}=require('../drivers/nspanel/modules/page-manager');
  const notifyDevice:any={pages:{active:{type:'grid',slots:{}}},currentPageId:'active',
    log:()=>{},error:()=>{},homey:{setTimeout:(fn:()=>void)=>{notifyTimers.push(fn);return notifyTimers.length;}},
    sendCmnd:(_t:string,c:string)=>notifyCommands.push(c),updateSleepTimer:()=>{},clearPopupEntities:()=>{}};
  const notifyManager=new NotifyPageManager(notifyDevice);
  const notifyCommands:string[]=[],notifyTimers:Array<()=>void>=[];
  await notifyManager.showNotification('ent','Otsikko','Teksti','OK',0,'','');
  assert(notifyCommands.includes('page popupNotify'));
  const beforeDelayed=notifyCommands.length;
  notifyManager.clearPopupEntities(); // bumps viewRevision
  notifyTimers.splice(0).forEach(fn=>fn());
  assert.equal(notifyCommands.length,beforeDelayed,'Stale notification content must not render after view change');
  await notifyManager.showNotification('ent','Toinen','Teksti','OK',0,'','');
  notifyTimers.splice(0).forEach(fn=>fn());
  assert(notifyCommands.some(cmd=>cmd.includes('Toinen')),'Current notification content still renders when revision matches');
  console.log('Stabilization: five panels/one fetch, shared settings, Expires, error isolation, no users, timer identity/duration/deadline, chart API, notification delayed-send guard and homepage management passed');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
