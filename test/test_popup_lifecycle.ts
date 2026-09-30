import assert from 'assert';
import { PopupPresenter } from '../lib/panel/popup-presenter';
const Module=require('module'),load=Module._load;
Module._load=function(id:string,...args:any[]){if(id==='homey')return {Device:class{}};return load.call(this,id,...args);};
const Device=require('../drivers/nspanel/device');

function device() {
  const panel=new Device(), sent:string[]=[], delayed:Array<()=>void>=[];
  panel.homey={setTimeout:(fn:()=>void)=>{delayed.push(fn);return delayed.length;},clearTimeout:()=>{},app:{bindingService:{value:()=>undefined,capability:()=>undefined}}};
  panel.log=panel.error=panel.updateSleepTimer=panel.scheduleBindingRender=()=>{};
  panel.getSetting=()=>false;panel.screensaverActive=false;panel.currentPageId='active';panel.currentPageType='grid';
  panel.sendCmnd=(_name:string,command:string)=>sent.push(command);
  panel.pages={active:{type:'grid',slots:{1:{id:'entity',title:'Oma otsikko',val:'12:34',binding:{source:'flow'}}}}};
  return {panel,sent,delayed};
}
async function run() {
  for(const [kind,method] of [['popupFan','openFanPopup'],['popupInSel','openSelectPopup'],['popupTimer','openTimerPopup'],['popupLight','openLightPopup'],['popupShutter','openShutterPopup'],['popupThermo','openThermoPopup']]) {
    const direct=device(),fromPanel=device();
    await direct.panel[method]('entity');direct.delayed.splice(0).forEach(fn=>fn());
    await fromPanel.panel.handleNextionEvent(`event,pageOpenDetail,${kind},entity`);
    assert.equal(fromPanel.sent.at(-1),direct.sent.at(-1),`${kind}: paneeli ja Flow käyttävät samaa tietosisältöä`);
    assert(!fromPanel.sent.some(command=>command.startsWith('page ')),`${kind}: jo avoinna olevaa ikkunaa ei avata uudelleen`);
  }
  const firstFlow=device();
  firstFlow.panel.pages.active.slots[1].binding={source:'homey',deviceId:'light',capabilityId:'onoff'};
  firstFlow.panel.homey.app.bindingService.value=(binding:any)=>binding.capabilityId==='onoff'?true:binding.capabilityId==='dim'?0.75:undefined;
  await firstFlow.panel.setLightState('entity',{brightness:5,color:'red'});
  assert.equal(firstFlow.panel.lightStates.get('entity').brightness,75,'First Flow metadata update already uses the bound Homey value');
  assert.equal(firstFlow.panel.lightStates.get('entity').onoff,true);assert.equal(firstFlow.panel.lightStates.get('entity').color,'red');
  const race=device();
  await race.panel.openFanPopup('entity');
  await race.panel.openSelectPopup('entity');
  race.sent.length=0;race.delayed.splice(0).forEach(fn=>fn());
  assert.equal(race.sent.length,1);assert(race.sent[0].startsWith('entityUpdateDetail2~'),'Old fan update must not overwrite selector');
  await race.panel.openLightPopup('entity');race.panel.popupActive=false;
  race.sent.length=0;race.delayed.splice(0).forEach(fn=>fn());assert.equal(race.sent.length,0,'Closed popup ignores delayed updates');

  // Even reopening the same entity invalidates the earlier delayed callback.
  const jobs:Array<()=>void>=[],rendered:string[]=[];
  const presenter=new PopupPresenter({sendPage:()=>{},schedule:fn=>jobs.push(fn),isCurrent:()=>true});
  presenter.show('popupFan','same',true,()=>rendered.push('old'));
  presenter.show('popupFan','same',true,()=>rendered.push('new'));
  jobs.splice(0).forEach(fn=>fn());assert.deepEqual(rendered,['new']);
  presenter.show('popupFan','same',true,()=>rendered.push('invalidated'));presenter.invalidate();
  jobs.splice(0).forEach(fn=>fn());assert.deepEqual(rendered,['new']);
  console.log('Popup lifecycle: six shared entry paths, delayed switch/close, same-entity reopening and invalidation passed');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
