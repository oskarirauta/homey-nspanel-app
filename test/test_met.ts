import assert from 'assert';
import { MetWeatherService, MetResponse, coordinateKey, metSymbol, parseMet, WEATHER_INTERVALS } from '../lib/met-weather';
import { Weather } from '../lib/weather';
import { Icon } from '../lib/icon';
import { Color } from '../lib/color';
const {DateTime}=require('luxon');
function fixture(now:number) {
  const start=Math.floor(now/3600000)*3600000;
  return {properties:{meta:{units:{air_temperature:'celsius'},updated_at:new Date(start).toISOString()},timeseries:Array.from({length:170},(_,i)=>({time:new Date(start+i*3600000).toISOString(),data:{instant:{details:{air_temperature:i/10}},next_1_hours:{summary:{symbol_code:'clearsky_day'}},next_6_hours:{summary:{symbol_code:'rain'}}}}))}};
}
async function run() {
  // Verify the complete wire representation, not just MET -> enum conversion.
  for(const type of Object.values(Weather.Type).filter(v=>typeof v==='number') as Weather.Type[]) {
    assert(Icon.exists(Weather.iconName(type)), `Missing panel icon for ${Weather.type_toString(type)}`);
    const day={day:'ma',type,temperature:12};
    const command=Weather.update({day0:day,day1:day,day2:day,day3:day},20,'°C');
    assert(command && !command.includes('undefined'), `Invalid weather payload for ${Weather.type_toString(type)}`);
  }
  assert.equal(Weather.iconName(Weather.Type.clear_night),'weather-night');
  const partly={day:'ma',type:metSymbol('partlycloudy_day'),temperature:12};
  const partlyCommand=Weather.update({day0:partly,day1:partly,day2:partly,day3:partly},20,'°C');
  assert(partlyCommand?.includes(`${Icon.get('weather-partly-cloudy')}~${Color.get('weather_partly-cloudy')}~ma`));

  let now=Date.parse('2026-10-24T22:30:00Z'); // Sunday in Helsinki, just before DST changes.
  const data=fixture(now),forecast=parseMet(data,'Europe/Helsinki',now,'fi');
  assert.equal(forecast.current.type,Weather.Type.sunny);
  assert.equal(forecast.days.length,5);assert.equal(forecast.days[0].day,'ma');
  assert.equal(forecast.days[0].type,Weather.Type.rainy);
  // Tomorrow's noon is 36 hours from the first fixture row across DST.
  const expected=DateTime.fromISO('2026-10-26T12:00:00',{zone:'Europe/Helsinki'}).toMillis();
  assert.equal(forecast.days[0].temperature,(expected-Math.floor(now/3600000)*3600000)/3600000/10);
  assert.equal(metSymbol('clearsky_night'),Weather.Type.clear_night);
  assert.equal(metSymbol('sleetshowersandthunder_day'),Weather.Type.lightning_rainy);
  assert.equal(metSymbol('snowshowers_day'),Weather.Type.snowy);
  assert.equal(metSymbol('sleet'),Weather.Type.snowy_rainy);
  assert.equal(metSymbol('unknown'),undefined);
  assert.equal(coordinateKey(-12.345678,25.123456),'-12.3456,25.1234');
  assert.throws(()=>coordinateKey(NaN,20));assert.throws(()=>coordinateKey(91,0));
  assert.throws(()=>parseMet(data,'UTC',now+200*3600000));
  const noSymbols=fixture(now);delete (noSymbols.properties.timeseries[0].data as any).next_1_hours;delete (noSymbols.properties.timeseries[0].data as any).next_6_hours;
  assert.equal(parseMet(noSymbols,'UTC',Math.floor(now/3600000)*3600000).current.type,undefined);
  const store:any={};const homey=()=>({manifest:{id:'test.nspanel',version:'1.0',author:{email:'test@example.com'}},settings:{get:(k:string)=>store[k],set:(k:string,v:any)=>store[k]=v}});
  let calls=0;let response:MetResponse={status:200,headers:{expires:new Date(now+2*3600000).toUTCString(),'last-modified':new Date(now).toUTCString()},body:data};let headers:any;
  const request=async(url:string,h:Record<string,string>)=>{calls++;headers=h;assert(url.endsWith('lat=60.1234&lon=24.1234'));await Promise.resolve();return response;};
  const service=new MetWeatherService(homey,request,()=>now,()=>0);
  await Promise.all([service.get(60.123456,24.123456,'Europe/Helsinki'),service.get(60.123456,24.123456,'UTC')]);
  assert.equal(calls,1,'Panels share one request');assert(headers['User-Agent'].includes('test@example.com'));
  const first=await service.get(60.123456,24.123456,'UTC');assert.equal(calls,1);assert.equal(first.stale,false);
  now=first.nextAt;response={status:304,headers:{}};
  await service.get(60.123456,24.123456,'UTC');assert.equal(calls,2);assert(headers['If-Modified-Since']);
  now+=3600000;response={status:429,headers:{'retry-after':'7200'}};
  const limited=await service.get(60.123456,24.123456,'UTC');assert.equal(limited.stale,true);assert.equal(limited.nextAt,now+7200000);
  await service.get(60.123456,24.123456,'UTC');assert.equal(calls,3,'Retry-After is honored');
  now=limited.nextAt;response={status:200,headers:{},body:{properties:{timeseries:[{}]}}};
  const malformed=await service.get(60.123456,24.123456,'UTC');assert.equal(malformed.stale,true);assert.equal(malformed.forecast.days.length,5,'Invalid response must not destroy cache');
  const restored=new MetWeatherService(homey,request,()=>now,()=>0);await restored.get(60.123456,24.123456,'UTC');assert.equal(calls,4,'Persisted cache avoids refetch after restart');
  now=malformed.nextAt;
  const offline=new MetWeatherService(homey,async()=>{throw new Error('offline');},()=>now,()=>0);
  assert.equal((await offline.get(60.123456,24.123456,'UTC')).stale,true);
  assert.deepEqual(WEATHER_INTERVALS, [1, 2, 3, 6, 12]);
  const intervalStore: any = {};
  const intervalHomey = () => ({ manifest: { id: 'test.nspanel', version: '1.0', author: { email: 'test@example.com' } }, settings: { get: (k: string) => intervalStore[k], set: (k: string, v: any) => intervalStore[k] = v } });
  let intervalCalls = 0;
  const intervalRequest = async () => { intervalCalls++; return { status: 200, headers: {}, body: fixture(now) }; };
  const intervalService = new MetWeatherService(intervalHomey, intervalRequest, () => now, () => 0);
  const threeHourForecast = await intervalService.get(61.1234, 25.1234, 'UTC', 'en', 3);
  assert.equal(intervalCalls, 1);
  assert.equal(threeHourForecast.nextAt, now + 3 * 3600000);
  // Calling with 6h interval extends nextAt for that device without making a second request
  const sixHourForecast = await intervalService.get(61.1234, 25.1234, 'UTC', 'en', 6);
  assert.equal(intervalCalls, 1);
  assert.equal(sixHourForecast.nextAt, now + 6 * 3600000);

  console.log('MET: symbols, five days, DST, coordinates, cache, intervals, shared requests, 304, 429, malformed data and offline passed');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
