import assert from 'assert';
import { EventEmitter } from 'events';
import { BindingService } from '../lib/bindings';
import { Page } from '../lib/page';
import { PageManager } from '../drivers/nspanel/modules/page-manager';
const Module=require('module'),original=Module._load;
Module._load=function(id:string,...args:any[]){if(id==='homey')return{Device:class{},App:class{}};return original.call(this,id,...args);};
const Device=require('../drivers/nspanel/device');
async function run(){
  // A failed command replaces listeners while preserving live capability updates.
  const devices:any[]=[];let fail=true;
  const makeDevice=()=>{
    const device:any=new EventEmitter();devices.push(device);
    Object.assign(device,{id:'light',available:true,capabilitiesObj:{onoff:{value:false,setable:true}},callback:undefined,
      makeCapabilityInstance(_id:string,callback:any){device.callback=callback;return{destroy(){device.callback=undefined;}};},
      async setCapabilityValue(){if(fail)throw new Error('offline');}});
    return device;
  };
  const first=makeDevice(),second=makeDevice();let current=first,changes=0;
  const service:any=new BindingService(()=>({}));service.api=async()=>({devices:{getDevice:async()=>current}});
  const binding:any={source:'homey',deviceId:'light',capabilityId:'onoff'};
  const dispose=await service.watch(binding,()=>changes++);
  const oldCallback=first.callback;current=second;
  await assert.rejects(service.set('light','onoff',true),/offline/);
  assert.equal(first.listenerCount('update'),0);assert.equal(first.callback,undefined);
  assert.equal(second.listenerCount('update'),1);assert.equal(typeof second.callback,'function');
  second.callback(true);assert.equal(service.value(binding),true);
  oldCallback(false); // Original watch must no longer publish after replacement.
  assert.equal(service.value(binding),true);
  fail=false;await service.set('light','onoff',false);second.callback(true);assert.equal(service.value(binding),true);
  assert(changes>=3);dispose();assert.equal(second.listenerCount('update'),0);assert.equal(second.callback,undefined);

  // Exercise actual Device -> PageManager notification methods, including stale callbacks.
  const dev:any=new Device();const timers:any[]=[];const sent:string[]=[];
  Object.assign(dev,{pages:{active:{type:Page.Type.grid,slots:{}}},currentPageId:'active',screensaverActive:true,
    homey:{setTimeout(fn:any,ms:number){const timer={fn,ms};timers.push(timer);return timer;},clearTimeout(){}},
    log(){},error(){},updateBrightness(){},updateSleepTimer(){},sendCmnd(_topic:string,cmd:string){sent.push(cmd);}});
  await dev.showNotification('first','First','Body','OK',2);
  assert.equal(dev.screensaverActive,false);assert.equal(dev.returnPageAfterPopup,'screensaver');
  timers.find(t=>t.ms===120).fn();assert(sent.some(c=>c.includes('Body')));
  const oldTimeout=timers.find(t=>t.ms===2000);
  await dev.showNotification('replacement','Second','Replacement','OK',0);
  let dismissed=0;dev.dismissNotification=async()=>{dismissed++;};
  // PageManager calls its own dismiss method; intercept that method on its actual instance.
  const manager=(dev as any).getPageManager();manager.dismissNotification=async()=>{dismissed++;};
  await oldTimeout.fn();assert.equal(dismissed,0);
  await dev.showNotification('timed','Timed','Body','OK',2);
  const timeout=timers.at(-1);dev.clearPopupEntities();dev.popupActive=true;dev.currentHmiScreen='popupLight';
  await timeout.fn();assert.equal(dismissed,0);
  await dev.showNotification('normal','Normal','Body','OK',2);await timers.at(-1).fn();assert.equal(dismissed,1);

  // Navigation must select cardLChart from the destination, then select cardChart on return.
  const navigationDevice:any=new Device();const navigationCommands:string[]=[];
  Object.assign(navigationDevice,{pages:{active:{type:Page.Type.grid,slots:{}},line:{type:Page.Type.chart,slots:{},rawOptions:{chartType:'line'}},bar:{type:Page.Type.chart,slots:{},rawOptions:{chartType:'bar'}}},currentPageId:'active',
    getSetting(){return false;},log(){},updateSleepTimer(){},notifyPageChange(){},sendCmnd(_t:string,c:string){navigationCommands.push(c);}});
  const navigation=new PageManager(navigationDevice);
  navigation.renderAndDisplayPage=async(page:any)=>{navigationDevice.switchPage(page.type);};
  await navigation.navigateToPage('line',true);assert(navigationCommands.includes('pageType~cardLChart'));
  navigationCommands.length=0;await navigation.navigateToPage('bar',true);assert(navigationCommands.includes('pageType~cardChart'));
  let renders=0;navigation.renderAndDisplayPage=async()=>{renders++;};
  await navigation.navigateToPage('missing-id',true);assert.equal(renders,1);
  navigation.renderAndDisplayPage=async()=>{throw new Error('render failure');};
  await assert.rejects(navigation.navigateToPage('line',true));assert.equal(navigationDevice.currentPageId,'active');

  const forecast:any={day0:{temperature:20},day1:{tempMin:10,tempMax:25,windSpeed:2}};
  const fahrenheit=Page.GenerateWeather(JSON.stringify({title:'Weather'}),forecast,68,'°F')!;
  assert(fahrenheit.includes('68.0°F'));assert(fahrenheit.includes('50…77°F'));assert(fahrenheit.includes('4 mph'));
  const celsius=Page.GenerateWeather(JSON.stringify({title:'Weather'}),forecast,20,'°C')!;
  assert(celsius.includes('20.0°C'));assert(celsius.includes('10…25°C'));
  console.log('Review regressions: binding recovery, notification lifecycle, chart navigation and Fahrenheit passed');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
