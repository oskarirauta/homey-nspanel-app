import { InteractionQueue } from '../lib/panel/interaction-queue';
import { captureMapEntries, captureSlotValues } from '../lib/panel/display-snapshot';
import assert from 'assert';
import { BindingService } from '../lib/bindings';
const Module=require('module'),load=Module._load;
Module._load=function(id:string,...args:any[]){if(id==='homey')return {Device:class{}};return load.call(this,id,...args);};
const Device=require('../drivers/nspanel/device');
async function run(){
  // Pure modules can be tested without constructing a Homey device.
  let display=0,failures=0,refreshes=0;
  const queue=new InteractionQueue({
    canRun:()=>true,
    capture:()=>{const previous=display;return()=>{display=previous;};},
    onFailure:()=>{failures++;},
    afterCommand:()=>{refreshes++;},
  });
  const failed=queue.run(async()=>{display=1;await queue.command(async()=>{throw new Error('offline');});});
  const staleInteraction=queue.run(async()=>{display=2;});
  await Promise.all([failed,staleInteraction]);
  assert.equal(display,0);assert.equal(failures,1);assert.equal(refreshes,1);assert.equal(queue.active,false);
  await queue.run(async()=>{display=3;});assert.equal(display,3);
  await assert.rejects(queue.run(async()=>{throw new TypeError('programming error');}),TypeError);
  assert.equal(failures,1,'Unexpected errors must not be disguised as device failures');
  await queue.run(async()=>{display=4;});assert.equal(display,4,'Unexpected errors must not poison the queue');
  const maps=new Map([['selected',{value:1}],['other',{value:2}]]);
  const slots={1:{id:'selected',value:'old',title:'Before'},2:{id:'other',value:'untouched'}};
  const ids=new Set(['selected','new']);
  const restoreMap=captureMapEntries(maps,ids),restoreSlots=captureSlotValues(slots,ids);
  maps.set('selected',{value:9});maps.set('other',{value:8});maps.set('new',{value:7});
  slots[1].value='changed';slots[1].title='New title';slots[2].value='external update';
  restoreMap();restoreSlots();
  assert.equal(maps.get('selected')!.value,1);assert.equal(maps.get('other')!.value,8);assert(!maps.has('new'));
  assert.equal(slots[1].value,'old');assert.equal(slots[1].title,'New title');assert.equal(slots[2].value,'external update');

  // Recovery completes within the same capability queue before the next command.
  const binding:any={source:'homey',deviceId:'device',capabilityId:'dim'};
  let calls=0;const target:any={id:'device',available:true,capabilitiesObj:{dim:{value:0.2,type:'number',setable:true}},makeCapabilityInstance:()=>({destroy(){}}),setCapabilityValue:async({value}:any)=>{calls++;if(calls===1)throw new Error('offline');target.capabilitiesObj.dim.value=value;}};
  const service:any=new BindingService(()=>({}));service.api=async()=>({devices:{getDevice:async()=>target}});
  await service.watch(binding,()=>{});
  const results=await Promise.allSettled([service.set('device','dim',0.7),service.set('device','dim',0.8)]);
  assert.equal(results[0].status,'rejected');assert.equal(results[1].status,'fulfilled');assert.equal(service.value(binding),0.8,'Recovery cannot overwrite the next success');

  const d=new Device();let triggerCount=0,notificationTriggers=0;const sent:string[]=[];const writes:any[]=[];
  let fail=true,release:(()=>void)|undefined;
  const caps:any={onoff:{value:false,setable:true},dim:{value:0.2,setable:true}};
  d.homey={app:{bindingService:{capability:(_b:any,id:string)=>caps[id],value:(b:any)=>caps[b.capabilityId]?.value,set:async(_id:string,cap:string,value:any)=>{writes.push([cap,value]);if(release)await new Promise<void>(resolve=>release=resolve);if(fail&&cap==='onoff')throw new Error('offline');caps[cap].value=value;}}},setTimeout:()=>0,clearTimeout:()=>{},i18n:{getLanguage:()=> 'fi'}};
  d.log=d.error=d.updateSleepTimer=d.scheduleBindingRender=()=>{};d.getSetting=()=>false;d.setPage=async()=>{};
  d.sendCmnd=(_name:string,cmd:string)=>sent.push(cmd);d.screensaverActive=false;d.currentPageId='active';d.currentPageType='grid';
  d.pages={active:{type:'grid',slots:{1:{id:'lamp',type:'light',val:'0',value:'20 %',binding:{source:'homey',deviceId:'lamp',capabilityId:'onoff'}}}}};
  d.lightActionTrigger={trigger:async()=>{triggerCount++;}};d.notificationButtonClickedTrigger={trigger:async()=>{notificationTriggers++;}};
  await d.openLightPopup('lamp',undefined,false);
  const before={...d.lightStates.get('lamp')};sent.length=0;
  // Two low-level commands: dim succeeds, on/off fails. No compensating write is sent.
  await d.handleNextionEvent('event,buttonPress2,lamp,brightnessSlider,70');
  assert.deepEqual(writes,[['dim',0.7],['onoff',true]]);assert.equal(caps.dim.value,0.7);
  assert.equal(d.lightStates.get('lamp').brightness,before.brightness,'Optimistic popup value rolled back');
  assert.equal(d.pages.active.slots[1].value,'20 %');assert.equal(triggerCount,0,'Failure must not emit a successful light action');
  assert(sent.some(cmd=>cmd.includes('Ohjaus epäonnistui')));assert.equal(d.activeLightEntity,undefined);
  assert.equal(d.commandNotification,true);
  await d.handleNextionEvent('event,buttonPress2,lamp,brightnessSlider,90');assert.equal(writes.length,2,'Stale popup commands blocked while error is displayed');
  await d.handleNextionEvent('event,buttonPress2,popupNotify,notifyAction,no');assert.equal(notificationTriggers,0);assert.equal(d.commandNotification,false);
  await d.openLightPopup('lamp',undefined,false);assert.equal(d.lightStates.get('lamp').brightness,70,'Reopening uses confirmed partial success');

  // A failed in-flight command invalidates already queued presses; a fresh attempt works.
  writes.length=0;release=()=>{};
  const first=d.handleNextionEvent('event,buttonPress2,lamp,OnOff,1');
  const stale=d.handleNextionEvent('event,buttonPress2,lamp,OnOff,0');
  for(let i=0;i<10&&writes.length===0;i++)await Promise.resolve();
  assert.equal(writes.length,1);const unblock=release!;release=undefined;unblock();
  await Promise.all([first,stale]);assert.equal(writes.length,1);
  await d.handleNextionEvent('event,buttonPress2,popupNotify,notifyAction,no');
  fail=false;await d.openLightPopup('lamp',undefined,false);await d.handleNextionEvent('event,buttonPress2,lamp,OnOff,1');
  assert.equal(caps.onoff.value,true);assert.equal(triggerCount,1,'Queue recovers after a rejected command');
  // Alarm failure must not claim a successful disarm or emit its success trigger.
  let alarmTriggers=0;
  d.clearPopupEntities();d.popupActive=false;d.currentPageId='alarm';d.currentPageType='alarm';d.alarmState='armed';d.playBuzzer=()=>{};
  d.pages.alarm={type:'alarm',slots:{},rawOptions:{pin_required:false,state:'armed',binding:{source:'homey',deviceId:'alarm',capabilityId:'homealarm_state'}}};
  d.alarmActionTriggeredTrigger={trigger:async()=>{alarmTriggers++;}};
  d.homey.app.bindingService.set=async()=>{throw new Error('unavailable');};
  await d.handleNextionEvent('event,buttonPress2,alarm,disarm,');
  assert.equal(d.alarmState,'armed');assert.equal(d.pages.alarm.rawOptions.state,'armed');assert.equal(alarmTriggers,0);assert.equal(d.commandNotification,true);
  await d.handleNextionEvent('event,buttonPress2,popupNotify,notifyAction,no');

  // Physical-button direct control shares the failure path and queue.
  d.homey.app.bindingService.control=async()=>{throw new Error('unavailable');};
  await d.runPanelInteraction(()=>d.controlBoundValue({source:'homey',deviceId:'switch',capabilityId:'onoff',action:'toggle'}));
  assert.equal(d.commandNotification,true);

  console.log('Commands: queued failure recovery, partial success, rollback, stale presses and notification isolation passed');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
