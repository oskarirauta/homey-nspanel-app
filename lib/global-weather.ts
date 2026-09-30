import { MetWeatherService, MetForecast, MetHourlyPoint, WeatherSource, WeatherInterval, WEATHER_INTERVALS, coordinateKey } from './met-weather';
export interface GlobalWeatherConfig { location: 'homey' | 'custom'; latitude?: number; longitude?: number; interval: WeatherInterval; }
export interface WeatherSnapshot { forecast?: MetForecast; hourly?: MetHourlyPoint[]; state: 'loading' | 'ready' | 'cached' | 'error'; updatedAt?: string; error?: string; }
export function validateWeatherConfig(value: any): GlobalWeatherConfig {
  if (!value || !['homey','custom'].includes(value.location) || !WEATHER_INTERVALS.includes(value.interval)) throw new Error('Invalid global weather configuration');
  if(value.location==='custom')coordinateKey(value.latitude,value.longitude);
  return value.location==='custom' ? {location:'custom',latitude:value.latitude,longitude:value.longitude,interval:value.interval} : {location:'homey',interval:value.interval};
}
/** One scheduler and one snapshot for every panel, including forecast charts. */
export class GlobalWeather {
  private consumers=new Map<object,(snapshot:WeatherSnapshot)=>void>();
  private timer?: NodeJS.Timeout;
  private generation=0;
  private pending?: Promise<void>;
  private snapshot:WeatherSnapshot={state:'loading'};
  constructor(private homey:()=>any,private met:MetWeatherService) {}
  getConfig():GlobalWeatherConfig { return this.homey().settings.get('global_weather') || {location:'homey',interval:1}; }
  setConfig(value:any):GlobalWeatherConfig {
    const config=validateWeatherConfig(value);
    this.homey().settings.set('global_weather',config);
    ++this.generation;this.pending=undefined;this.clearTimer();this.snapshot={state:'loading'};this.publish();
    if(this.consumers.size)void this.refresh();
    return config;
  }
  subscribe(owner:object,listener:(snapshot:WeatherSnapshot)=>void,legacy?:WeatherSource):()=>void {
    // First existing MET user provides a one-time migration; subsequent panels share it.
    if(!this.homey().settings.get('global_weather')) {
      try { this.homey().settings.set('global_weather',validateWeatherConfig({location:legacy?.source==='met'?(legacy.location||'homey'):'homey',latitude:legacy?.latitude,longitude:legacy?.longitude,interval:legacy?.interval||1})); } catch { this.homey().settings.set('global_weather',{location:'homey',interval:1}); }
    }
    this.consumers.set(owner,listener);listener(this.snapshot);
    if(!this.pending && !this.timer)void this.refresh();
    return ()=>{this.consumers.delete(owner);if(!this.consumers.size){this.clearTimer();++this.generation;this.pending=undefined;this.snapshot={state:'loading'};}};
  }
  private clearTimer(){if(this.timer)this.homey().clearTimeout(this.timer);this.timer=undefined;}
  private publish(){for(const listener of this.consumers.values())listener(this.snapshot);}
  async refresh():Promise<void> {
    if(this.pending)return this.pending;
    this.clearTimer();
    const generation=this.generation;
    const run=async()=>{
      let nextAt=Date.now()+3600000;
      try {
        const config=this.getConfig(),homey=this.homey();
        const lat=config.location==='custom'?config.latitude!:homey.geolocation.getLatitude();
        const lon=config.location==='custom'?config.longitude!:homey.geolocation.getLongitude();
        const timezone=homey.clock.getTimezone();
        const result=await this.met.get(lat,lon,timezone,homey.i18n.getLanguage(),config.interval);
        const hourly=await this.met.getHourly24h(lat,lon,timezone,config.interval);
        if(generation!==this.generation)return;
        this.snapshot={forecast:result.forecast,hourly:hourly.points,state:result.stale?'cached':'ready',updatedAt:result.forecast.updatedAt};nextAt=result.nextAt;
      } catch(error:any) {
        if(generation!==this.generation)return;
        this.snapshot={state:'error',error:error.message};
      }
      this.publish();
      // Re-evaluate cached time steps hourly even when internet refresh is slower.
      if(this.consumers.size)this.timer=this.homey().setTimeout(()=>{this.timer=undefined;void this.refresh();},Math.max(60000,Math.min(3600000,nextAt-Date.now())));
    };
    const pending=run();this.pending=pending;
    try{await pending;}finally{if(this.pending===pending)this.pending=undefined;}
  }
  dispose(){++this.generation;this.clearTimer();this.consumers.clear();}
}
