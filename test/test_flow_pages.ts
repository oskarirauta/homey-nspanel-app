import assert from 'assert';
import { FlowManager } from '../drivers/nspanel/modules/flow-manager';
import { Page } from '../lib/page';
async function run() {
  const cards:any={}, renders:any[]=[], commands:any[]=[];
  const d:any={pages:{active:{type:Page.Type.grid,slots:{}}},currentPageId:'active',currentPageType:Page.Type.grid,
    homey:{flow:{getActionCard:(id:string)=>({registerRunListener:(fn:any)=>cards[id]=fn})}},
    getOrCreatePage(id:string,type:any){return this.pages[id]||(this.pages[id]={type,slots:{}});},
    renderAndDisplayPage:async(p:any)=>{renders.push(p);},sendCmnd:(...args:any[])=>commands.push(args),
    getSetting:(key:string)=>key==='global_pin'?'4321':key==='disable_nav_when_armed'?true:undefined,
    setPage:async()=>{},showUnlockScreen:async()=>{},setAlarmState:async(state:string)=>{d.alarmState=state;}
  };
  new FlowManager(d).registerActions();
  const call=(name:string,args:any={})=>cards[name]({device:d,...args});
  await call('set_grid_slot_action',{slot:1,action_type:'navigate',entity_id:'room',title:'Room',value:0});
  assert.equal(d.pages.active.slots[1].target,'room');assert.equal(d.pages.active.slots[1].name,'room');assert.equal(d.pages.active.slots[1].title,'Room');assert.equal(d.pages.active.slots[1].value,0);
  d.screensaverActive=true;const before=renders.length;await call('set_grid_slot_action',{slot:2,action_type:'switch',value:false});assert.equal(renders.length,before);
  d.screensaverActive=false;d.currentPageType=Page.Type.entities;
  await call('set_entity_slot_action',{slot:1,entity_type:'text',entity_id:'sensor',title:'Temperature',value:0});
  assert.equal(d.pages.active.slots[1].type,Page.EntityType.text);assert.equal(d.pages.active.slots[1].name,'sensor');
  d.pages.other={type:Page.Type.grid,slots:{1:{val:'old'}}};
  const previous=renders.length;await call('update_slot_value_action',{page:'other',slot:1,value:0});
  assert.equal(d.pages.other.slots[1].value,0);assert(!('val' in d.pages.other.slots[1]));assert.equal(renders.length,previous);
  const active=d.pages.active;
  await call('show_alarm_page_action',{state:'armed_away',pin_required:'no',prev_target:'room'});
  assert.equal(d.alarmState,'armed_away');assert.equal(d.currentOptions,Page.GenerateAlarm(JSON.stringify({title:'Alarm',navigation:{},state:'armed_away',pin_required:false})));
  assert.strictEqual(d.pages.active,active);
  await call('show_unlock_page',{destination:'unlock_action'});
  assert.deepEqual(d.pendingUnlock,{type:'action',entityId:'unlock_action',pin:'4321',returnPageId:'active'});
  await call('set_alarm_state_action');assert.equal(d.alarmState,'armed_away');
  d.homey.i18n={getUnits:()=> 'metric'};
  await call('show_thermostat_page_action',{current_temp:0,target_temp:0,min_temp:0,max_temp:30,temp_step:0.5});
  assert.equal(d.temp_current,0);assert.equal(d.temp_setpoint,0);
  assert.equal(d.currentOptions,Page.GenerateThermo(JSON.stringify({title:'Thermostat',navigation:{}}),0,0,0,30,0.5,true));
  await call('show_media_page_action',{card_title:'Music',artist:'Artist',title:'Track',volume:0,state:'paused',shuffle:'off'});
  assert.equal(d.currentOptions,Page.GenerateMedia(JSON.stringify({title:'Music',navigation:{},media:{author:'Artist',title:'Track'},volume:0,paused:true,onoff:true,shuffle:false})));
  await call('show_qr_page_action',{qrcode:'WIFI:S:Guest;;',line1_title:'SSID',line1_val:'Guest'});
  assert.equal(d.currentOptions,Page.GenerateQRCode(JSON.stringify({title:'QR Code',qrcode:'WIFI:S:Guest;;',navigation:{},entities:[{type:'text',title:'SSID',value:'Guest',icon:'wifi'}]})));
  assert.strictEqual(d.pages.active,active,'Temporary Flow cards must not replace the saved active page');
  const source={source:'homey',deviceId:'meter',capabilityId:'measure_power'};
  d.pages.power={type:Page.Type.power,slots:{},rawOptions:{home:{binding:source},nodes:[{binding:source}]}};
  await call('show_power_page_action',{home_power:'0 W'});
  assert.strictEqual(d.pages.power.rawOptions.home.binding,source);assert.equal(d.pages.power.rawOptions.home.consumption,'0 W');
  d.popupActive=true;const beforePower=renders.length;
  await call('update_power_node_action',{page:'power',node:'node1',power_text:'-2.5 kW',speed:0});
  const node=d.pages.power.rawOptions.nodes[0];assert.equal(node.speed,-25);assert.equal(node.autoSpeed,true);assert.strictEqual(node.binding,source);assert.equal(renders.length,beforePower);
  await call('update_power_node_action',{page:'power',node:'node1',power_text:'1 kW',speed:77});assert.equal(node.speed,77);assert.equal(node.autoSpeed,false);
  d.pages.chart={type:Page.Type.chart,slots:{},rawOptions:{binding:source,chartType:'bar',values:[1,2,3]}};
  await call('update_chart_data_action',{page:'chart',data:'1^A~2^B',unit:'W',ticks:'0:10'});
  assert.equal(d.pages.chart.rawOptions.values,'1^A~2^B');assert.equal(d.pages.chart.rawOptions.yAxisLabel,'W');assert.equal(d.pages.chart.rawOptions.yAxisTicks,'0:10');assert.strictEqual(d.pages.chart.rawOptions.binding,source);
  d.pages.chart.rawOptions.values=[1,2,3];
  await call('push_chart_value_action',{page:'chart',value:4,scale:10});
  assert.deepEqual(d.pages.chart.rawOptions.values,Page.shiftChartValues([1,2,3],4,{scale:10,isBarChart:true}));
  const buzzes:any[]=[];d.playBuzzer=(...args:any[])=>buzzes.push(args);
  for(const sound_type of ['beep','double_beep','triple_beep','warning','alarm'])await call('play_buzzer_action',{sound_type});
  assert.deepEqual(buzzes,[[1,2,2],[2,2,3],[3,2,2],[5,1,1],[10,2,2]]);
  let notification:any;d.showFlowNotification=async(args:any)=>{notification=args;};
  await call('show_notification_action',{heading:'Hello',message:'World',beep:false});assert.equal(notification.heading,'Hello');
  for(const kind of ['light','shutter','fan','select','timer','thermo']){
    const name='open'+kind[0].toUpperCase()+kind.slice(1)+'Popup';let target='';
    d[name]=async(entity:string)=>{target=entity;};
    await call('show_'+kind+'_popup_action',{entity:'  room  '});assert.equal(target,'room');
    await call('show_'+kind+'_popup_action',{entity:'  '});assert.equal(target,kind);
  }
  d.activeThermoEntity='climate';let thermoTarget='';d.setThermoState=async(entity:string)=>{thermoTarget=entity;};
  await call('set_thermo_mode_action',{});assert.equal(thermoTarget,'climate');
  console.log('Flow pages: slot arguments, background updates, alarm and PIN action routing passed');
}
run().catch(error=>{console.error(error);process.exit(1);});
