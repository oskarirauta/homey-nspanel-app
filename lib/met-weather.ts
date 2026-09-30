import * as https from 'https';
import * as zlib from 'zlib';
import { Weather } from './weather';
const { DateTime } = require('luxon');
export type WeatherInterval = 1 | 2 | 3 | 6 | 12;
export const WEATHER_INTERVALS: readonly WeatherInterval[] = [1, 2, 3, 6, 12];
export interface WeatherSource { source: 'flow' | 'met' | 'none'; location?: 'homey' | 'custom'; latitude?: number; longitude?: number; interval?: WeatherInterval; }
export interface MetForecast { current: Weather.Day; days: Weather.Day[]; updatedAt: string; }
export function metSymbol(code?: string): Weather.Type | undefined {
  if (!code) return undefined;
  if (code.includes('thunder')) return Weather.Type.lightning_rainy;
  if (code.includes('sleet')) return Weather.Type.snowy_rainy;
  if (code.includes('snow')) return Weather.Type.snowy;
  if (code.includes('heavyrain')) return Weather.Type.pouring;
  if (code.includes('rain')) return Weather.Type.rainy;
  if (code.startsWith('clearsky')) return code.endsWith('_night') ? Weather.Type.clear_night : Weather.Type.sunny;
  if (code.startsWith('fair') || code.startsWith('partlycloudy')) return Weather.Type.partly_cloudy;
  if (code.startsWith('cloudy')) return Weather.Type.cloudy;
  if (code.startsWith('fog')) return Weather.Type.fog;
  return undefined;
}
export function parseMet(data: any, timezone: string, nowMillis=Date.now(), locale='en'): MetForecast {
  if (data?.properties?.meta?.units?.air_temperature !== 'celsius') throw new Error('Unsupported MET temperature unit');
  const rows=data.properties.timeseries;
  if (!Array.isArray(rows) || !rows.length) throw new Error('Empty MET forecast');
  const now=DateTime.fromMillis(nowMillis).setZone(timezone).setLocale(locale);
  if (!now.isValid) throw new Error('Invalid forecast timezone');
  const valid=rows.filter((r: any)=>Number.isFinite(Date.parse(r.time)) && typeof r.data?.instant?.details?.air_temperature === 'number' && Number.isFinite(r.data.instant.details.air_temperature));
  const nearest=valid.filter((r:any)=>Date.parse(r.time)>=nowMillis-3600000).sort((a:any,b:any)=>Math.abs(Date.parse(a.time)-nowMillis)-Math.abs(Date.parse(b.time)-nowMillis))[0];
  if (!nearest || Math.abs(Date.parse(nearest.time)-nowMillis)>3*3600000) throw new Error('MET forecast is out of date');
  const day=(row:any,current=false):Weather.Day=>{
    const periods=current?['next_1_hours','next_6_hours','next_12_hours']:['next_6_hours','next_12_hours','next_1_hours'];
    const symbol=periods.map(key=>row.data[key]?.summary?.symbol_code).find(Boolean);
    const details=row.data?.instant?.details||{};
    const windSpeed=typeof details.wind_speed==='number'?Math.round(details.wind_speed*10)/10:undefined;
    const uvIndex=typeof details.ultraviolet_index_clear_sky==='number'?Math.round(details.ultraviolet_index_clear_sky):undefined;
    return { day:DateTime.fromISO(row.time).setZone(timezone).setLocale(locale).weekdayShort, temperature:Math.round(details.air_temperature*10)/10, type:metSymbol(symbol), windSpeed, uvIndex };
  };
  const days:Weather.Day[]=[];
  for(let offset=1;offset<=5;offset++) {
    const date=now.plus({days:offset});
    const isoDate=date.toISODate();
    const dayRows=valid.filter((r:any)=>DateTime.fromISO(r.time).setZone(timezone).toISODate()===isoDate);
    const noon=date.set({hour:12,minute:0,second:0,millisecond:0}).toMillis();
    const row=dayRows.sort((a:any,b:any)=>Math.abs(Date.parse(a.time)-noon)-Math.abs(Date.parse(b.time)-noon))[0];
    if(row) {
      const temps=dayRows.map((r:any)=>r.data.instant.details.air_temperature).filter((t:number)=>Number.isFinite(t));
      const d=day(row);
      if(temps.length) { d.tempMin=Math.round(Math.min(...temps)*10)/10; d.tempMax=Math.round(Math.max(...temps)*10)/10; }
      days.push(d);
    } else {
      days.push({day:date.weekdayShort,type:undefined,temperature:undefined});
    }
  }
  return {current:day(nearest,true),days,updatedAt:data.properties.meta.updated_at};
}

export interface MetHourlyPoint {
  value: number; // in Nextion x10 scale (e.g. 14.8 -> 148)
  rawTemp: number; // 14.8
  time: string; // ISO
  hour: number;
  label?: string; // e.g. "14:00" on selected intervals
}

export function parseMet24hHourly(data: any, timezone: string, nowMillis = Date.now()): MetHourlyPoint[] {
  if (data?.properties?.meta?.units?.air_temperature !== 'celsius') throw new Error('Unsupported MET temperature unit');
  const rows = data.properties.timeseries;
  if (!Array.isArray(rows) || !rows.length) throw new Error('Empty MET forecast');

  const now = DateTime.fromMillis(nowMillis).setZone(timezone);
  if (!now.isValid) throw new Error('Invalid forecast timezone');

  const startMillis = nowMillis - 1800000;
  const endMillis = nowMillis + 24 * 3600000;

  const validRows = rows.filter((r: any) => {
    const t = Date.parse(r.time);
    return Number.isFinite(t) && t >= startMillis && t <= endMillis &&
      typeof r.data?.instant?.details?.air_temperature === 'number' &&
      Number.isFinite(r.data.instant.details.air_temperature);
  });

  const points: MetHourlyPoint[] = [];
  const seenHours = new Set<string>();

  for (const r of validRows) {
    const dt = DateTime.fromISO(r.time).setZone(timezone);
    const hourKey = dt.toFormat('yyyy-MM-dd-HH');
    if (seenHours.has(hourKey)) continue;
    seenHours.add(hourKey);

    const temp = r.data.instant.details.air_temperature;
    const hour = dt.hour;
    const isFirstOrLast = points.length === 0 || points.length === 23;
    const label = (isFirstOrLast || hour % 4 === 0) ? `${hour < 10 ? '0' : ''}${hour}:00` : undefined;

    points.push({
      value: Math.round(temp * 10),
      rawTemp: Math.round(temp * 10) / 10,
      time: r.time,
      hour,
      label
    });

    if (points.length >= 24) break;
  }

  return points;
}

export function coordinateKey(latitude:number, longitude:number): string {
  if (!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180) throw new Error('Invalid weather coordinates');
  return `${Math.trunc(latitude*10000)/10000},${Math.trunc(longitude*10000)/10000}`;
}
export interface MetResponse { status:number; headers:Record<string,any>; body?:any; }
export async function requestMet(url:string,headers:Record<string,string>,redirects=0):Promise<MetResponse> {
  return new Promise((resolve,reject)=>{
    const request=https.get(url,{headers},response=>{
      const status=response.statusCode||0;
      if ([301,302,307,308].includes(status) && response.headers.location) {
        response.resume();const next=new URL(response.headers.location,url);
        if(redirects>=3||next.protocol!=='https:'||next.hostname!=='api.met.no'){reject(new Error('Unexpected MET redirect'));return;}
        requestMet(next.toString(),headers,redirects+1).then(resolve,reject);return;
      }
      if(status===304 || status<200 || status>=300){response.resume();resolve({status,headers:response.headers});return;}
      const encoding=response.headers['content-encoding'];
      const stream=encoding==='gzip'?response.pipe(zlib.createGunzip()):encoding==='deflate'?response.pipe(zlib.createInflate()):response;
      const chunks:Buffer[]=[];let size=0;
      stream.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>2*1024*1024){request.destroy(new Error('MET response too large'));stream.destroy();return;}chunks.push(chunk);});
      stream.on('error',reject);response.on('error',reject);
      stream.on('end',()=>{try{resolve({status,headers:response.headers,body:JSON.parse(Buffer.concat(chunks).toString('utf8'))});}catch{reject(new Error('Invalid MET response'));}});
    });
    request.setTimeout(10000,()=>request.destroy(new Error('MET request timed out')));request.on('error',reject);
  });
}
interface Cache { data?:any; lastModified?:string; fetchedAt?:number; nextAt:number; error?:string; }
export class MetWeatherService {
  private inflight=new Map<string,Promise<Cache>>();
  private cache:Record<string,Cache>;
  constructor(private homey:()=>any,private request:typeof requestMet=requestMet,private now:()=>number=Date.now,private random:()=>number=Math.random) {
    this.cache=this.homey().settings.get('met_forecast_cache')||{};
  }
  async get(latitude:number,longitude:number,timezone:string,locale='en',intervalHours=1):Promise<{forecast:MetForecast;nextAt:number;stale:boolean}> {
    const key=coordinateKey(latitude,longitude);
    const intervalMs=Math.max(1,intervalHours)*3600000;
    let entry=this.cache[key];
    const isExpired = !entry || (entry.error ? this.now() >= entry.nextAt : this.now() >= Math.max(entry.nextAt, (entry.fetchedAt || 0) + intervalMs));
    if(isExpired) {
      let pending=this.inflight.get(key);
      if(!pending) {pending=this.fetch(key,intervalHours);this.inflight.set(key,pending);}
      try{entry=await pending;}finally{this.inflight.delete(key);}
    }
    if(!entry.data)throw new Error(entry.error||'Weather unavailable');
    const deviceNextAt = entry.error ? entry.nextAt : Math.max(entry.nextAt, (entry.fetchedAt || this.now()) + intervalMs);
    return {forecast:parseMet(entry.data,timezone,this.now(),locale),nextAt:deviceNextAt,stale:!!entry.error};
  }
  async getHourly24h(latitude: number, longitude: number, timezone: string, intervalHours = 1): Promise<{ points: MetHourlyPoint[]; nextAt: number; stale: boolean }> {
    const key = coordinateKey(latitude, longitude);
    const intervalMs = Math.max(1, intervalHours) * 3600000;
    let entry = this.cache[key];
    const isExpired = !entry || (entry.error ? this.now() >= entry.nextAt : this.now() >= Math.max(entry.nextAt, (entry.fetchedAt || 0) + intervalMs));
    if (isExpired) {
      let pending = this.inflight.get(key);
      if (!pending) { pending = this.fetch(key, intervalHours); this.inflight.set(key, pending); }
      try { entry = await pending; } finally { this.inflight.delete(key); }
    }
    if (!entry.data) throw new Error(entry.error || 'Weather unavailable');
    const deviceNextAt = entry.error ? entry.nextAt : Math.max(entry.nextAt, (entry.fetchedAt || this.now()) + intervalMs);
    return { points: parseMet24hHourly(entry.data, timezone, this.now()), nextAt: deviceNextAt, stale: !!entry.error };
  }
  private async fetch(key:string,intervalHours=1):Promise<Cache> {
    const old=this.cache[key];let entry:Cache;
    const intervalMs=Math.max(1,intervalHours)*3600000;
    try {
      const [lat,lon]=key.split(',');const manifest=this.homey().manifest;
      const contact=manifest.author?.email || manifest.homepage;
      if(!contact)throw new Error('MET requires an application contact in the manifest');
      const headers:Record<string,string>={'User-Agent':`${manifest.id}/${manifest.version} (${contact})`,'Accept':'application/json','Accept-Encoding':'gzip, deflate'};
      if(old?.lastModified)headers['If-Modified-Since']=old.lastModified;
      const response=await this.request(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`,headers);
      const expires=Date.parse(response.headers.expires||'');
      const retry=Number(response.headers['retry-after']);
      const retryDate=Number.isFinite(retry)?NaN:Date.parse(response.headers['retry-after']||'');
      const nextAt=Math.max(this.now()+3600000,Number.isFinite(expires)?expires:0)+Math.round(this.random()*120000);
      if(response.status===304 && old?.data)entry={...old,fetchedAt:this.now(),nextAt,error:undefined};
      else if(response.status===200 || response.status===203) {
        parseMet(response.body,'UTC',this.now()); // Never replace a usable cache with malformed data.
        entry={data:response.body,lastModified:response.headers['last-modified'],fetchedAt:this.now(),nextAt};
      } else {
        const waitUntil=Math.max(nextAt,Number.isFinite(retry)?this.now()+retry*1000:0,Number.isFinite(retryDate)?retryDate:0);
        entry={...old,nextAt:waitUntil,error:`MET HTTP ${response.status}`};
      }
    } catch(error:any) {entry={...old,nextAt:this.now()+intervalMs+Math.round(this.random()*120000),error:error.message};}
    this.cache[key]=entry;
    // Keep a bounded persistent cache; shared across all panels at a location.
    const keys=Object.keys(this.cache);while(keys.length>8)delete this.cache[keys.shift()!];
    this.homey().settings.set('met_forecast_cache',this.cache);
    return entry;
  }
}
