import { Icon } from './icon';
import { Color } from './color';
const { DateTime } = require('luxon');

export namespace Weather {

  export enum Type {
    windy, partly_cloudy, clear_night, windy_variant, cloudy, exceptional, fog, hail, snowy, lightning_rainy, pouring, rainy, snowy_rainy, sunny
  }

  export interface Day {
    day: string | undefined;
    type: Type | undefined;
    temperature: number | undefined;
    tempMin?: number;
    tempMax?: number;
    windSpeed?: number; // m/s
    uvIndex?: number;
  }

  export interface Forecast {
    day4?: Day;
    day5?: Day;
    day0: Day | undefined; // this day
    day1: Day | undefined; // next day
    day2: Day | undefined; // day after that
    day3: Day | undefined; // and day after that
  }

  function parseFloatValue(value: number | string | boolean | undefined) : number | undefined {

    let result: number | undefined = undefined;

    if (typeof value === 'number') {
      result = Math.round(value * 10) * 0.1;
    } else if (typeof value === 'string') {
      const n = parseFloat(value);
      if (!isNaN(n))
        result = Math.round(n * 10) * 0.1;
    } else if (typeof value === 'boolean')
      result = value === true ? 1 : 0;

    return result;
  }

  export const parse = (json: string, timezone: string | undefined): Forecast | undefined => {

    let now = DateTime.now();
    if (timezone !== undefined)
      now = now.setZone(timezone);

    try {

      const data = JSON.parse(json);
      let forecast: Forecast = { day0: undefined, day1: undefined, day2: undefined, day3: undefined };

      if (!Array.isArray(data.weather) || !data.weather.length) return undefined;
      if (data['weather'] !== undefined) {
        for (let i=0; i < Math.min(data['weather'].length, 6); i++) {

          const day: Day = {
            day: now.weekdayShort,
            type: data['weather'][i]['icon'] !== undefined ? string_toType(data['weather'][i]['icon']) : undefined,
            temperature: data['weather'][i]['temp'] !== undefined ? parseFloatValue(data['weather'][i]['temp']) : undefined
          };

          if (day.temperature !== undefined)
            day.temperature = Math.round(day.temperature * 10) * 0.1;

          if (day.type === undefined && day.temperature === undefined)
            break;

          switch (i) {
            case 0: forecast.day0 = day; break;
            case 1: forecast.day1 = day; break;
            case 2: forecast.day2 = day; break;
            case 3: forecast.day3 = day; break;
            case 4: forecast.day4 = day; break;
            case 5: forecast.day5 = day; break;
          }

          now = now.plus({days: 1});
        }
      }

      return forecast;

    } catch {
      return undefined;
    }
  }

  export const parse_owm = (json:string, timezone: string | undefined) : Forecast | undefined => {

    let now = DateTime.now();
    if (timezone !== undefined)
      now = now.setZone(timezone);

    try {

      const data = JSON.parse(json);
      let forecast: Forecast = { day0: undefined, day1: undefined, day2: undefined, day3: undefined };

      if (data['current'] !== undefined) {

        const day: Day = {
          day: now.weekdayShort,
          type: data['current']['weather'] !== undefined && data['current']['weather'].length > 0 && data['current']['weather'][0]['icon'] !== undefined ? string_toType(data['current']['weather'][0]['icon']) : undefined,
          temperature: parseFloatValue(data['current']['temp'])
        }

        if (day.temperature !== undefined)
          day.temperature = Math.round(day.temperature * 10) * 0.1;

        forecast.day0 = day;
      } else {
        const day: Day = {
          day: now.weekdayShort,
          type: undefined,
          temperature: undefined
        }

        forecast.day0 = day;
      }

      if (!Array.isArray(data.daily)) return undefined;
      const future = data.daily.filter((d: any) => Number.isFinite(d.dt) && DateTime.fromSeconds(d.dt).setZone(timezone || now.zoneName).startOf('day') > now.startOf('day'));
      data.daily = future;
      for (let i=0; i < Math.min(data['daily'].length, 5); i++) {

        if (data['daily'].length < i || data['daily'][i] === undefined)
          break;

        const day: Day = {
          day: DateTime.fromSeconds(data.daily[i].dt).setZone(timezone || now.zoneName).weekdayShort,
          type: data['daily'][i]['weather'] !== undefined && data['daily'][i]['weather'].length > 0 && data['daily'][i]['weather'][0]['icon'] !== undefined ? string_toType(data['daily'][i]['weather'][0]['icon']) : undefined,
          temperature: parseFloatValue(data['daily'][i]['temp']['day'])
        }

        if (day.temperature !== undefined)
          day.temperature = Math.round(day.temperature * 10) * 0.1;

        switch (i) {
          case 0: forecast.day1 = day; break;
          case 1: forecast.day2 = day; break;
          case 2: forecast.day3 = day; break;
          case 3: forecast.day4 = day; break;
          case 4: forecast.day5 = day; break;
        }

        now = now.plus({days: 1});
      }

      return forecast;
      
    } catch {
      return undefined;
    }
  }

  export const type_toString = (weather: Type | undefined): string | undefined => {

    if (weather === undefined)
      return undefined;

    switch (weather) {
      case Type.windy: return 'windy';
      case Type.partly_cloudy: return 'partly-cloudy';
      case Type.clear_night: return 'clear-night';
      case Type.windy_variant: return 'windy-variant';
      case Type.cloudy: return 'cloudy';
      case Type.exceptional: return 'exceptional';
      case Type.fog: return 'fog';
      case Type.hail: return 'hail';
      case Type.snowy: return 'snowy';
      case Type.lightning_rainy: return 'lightning-rainy';
      case Type.pouring: return 'pouring';
      case Type.rainy: return 'rainy';
      case Type.snowy_rainy: return 'snowy-rainy';
      case Type.sunny: return 'sunny';
    }
    return undefined;
  }

  // Condition names are not always MDI icon names (e.g. clear-night).
  export const iconName = (weather: Type | undefined): string => {
    if (weather === Type.clear_night) return 'weather-night';
    if (weather === Type.exceptional) return 'alert-circle-outline';
    const name = 'weather-' + type_toString(weather);
    return Icon.exists(name) ? name : 'help-circle-outline';
  };

  export const string_toType = (weather: string | undefined): Type | undefined => {

    if (weather === undefined)
      return undefined;

    switch (weather) {
      case 'windy': return Type.windy;
      case '02d':
      case '02n':
      case '04d':
      case '04n':
      case 'partlycloudy':
      case 'partly_cloudy':
      case 'partly-cloudy': return Type.partly_cloudy;
      case '01n':
      case 'clearnight':
      case 'clear_night':
      case 'clear-night': return Type.clear_night;
      case 'windyvariant':
      case 'windy_variant':
      case 'windy-variant': return Type.windy_variant;
      case '03d':
      case '03n':
      case 'cloudy': return Type.cloudy;
      case 'exceptional': return Type.exceptional;
      case '50d':
      case '50n':
      case 'foggy':
      case 'fog': return Type.fog;
      case 'hail': return Type.hail;
      case '13d':
      case '13n':
      case 'snow':
      case 'snowy': return Type.snowy;
      case '11d':
      case '11n':
      case 'lightningrainy':
      case 'lightning_rainy':
      case 'lightning-rainy': return Type.lightning_rainy;
      case '09d':
      case '09n':
      case 'pouring': return Type.pouring;
      case '10d':
      case '10n':
      case 'rain':
      case 'rainy': return Type.rainy;
      case 'snowyrainy':
      case 'snowy_rainy':
      case 'snowy-rainy': return Type.snowy_rainy;
      case '01d':
      case 'sunny': return Type.sunny;
    }
    return undefined;
  }

  function weatherEntityToday(weather: Day | undefined, unit: string | undefined): string {
    const type = weather === undefined ? undefined : type_toString(weather!.type);
    const tempStr = (weather !== undefined && weather!.temperature !== undefined)
      ? (Number(weather!.temperature).toFixed(1) + (unit === undefined ? '°C' : unit!))
      : '';
    return (type === undefined ? '' : Icon.get(iconName(weather!.type))!) + '~' +
      Color.get(type === undefined ? 'not_found': ('weather_' + type!), 'not_found')! + '~~' +   
      tempStr + '~~~';
  }

  function weatherEntity(weather: Day | undefined, unit: string | undefined): string {
    const type = weather === undefined ? undefined : type_toString(weather!.type);
    const tempStr = (weather !== undefined && weather!.temperature !== undefined)
      ? (Number(weather!.temperature).toFixed(1) + (unit === undefined ? '°C' : unit!))
      : '';
    return (type === undefined ? '' : Icon.get(iconName(weather!.type))!) +
      '~' + Color.get(type === undefined ? 'not_found': ('weather_' + type!), 'not_found')! + '~' +
      (weather !== undefined && weather!.day !== undefined ? weather!.day! : '' ) + '~' +
      tempStr + '~~~';
  }

  export const update = (weather: Forecast | undefined, indoorTemp: number | undefined, unit: string | undefined, separateToday: boolean = false): string | undefined => {
    let indoorStr = '';
    if (indoorTemp !== undefined && indoorTemp !== null) {
      const num = typeof indoorTemp === 'number' ? indoorTemp : parseFloat(String(indoorTemp));
      indoorStr = (!isNaN(num) ? num.toFixed(1) : String(indoorTemp)) + (unit !== undefined ? unit! : '°C');
    }

    let val = 'weatherUpdate~~~' + Icon.get('home') + '~' +
      Color.get('weather_home') + '~~' + indoorStr + '~~~';

    if (separateToday) {
      val += weatherEntity(weather === undefined ? undefined : weather.day1, unit);
      val += weatherEntity(weather === undefined ? undefined : weather.day2, unit);
      val += weatherEntity(weather === undefined ? undefined : weather.day3, unit);
      val += weatherEntity(weather === undefined ? undefined : weather.day0, unit);
      val += weatherEntityToday(weather === undefined ? undefined : weather.day0, unit);
    } else {
      val += weatherEntity(weather === undefined ? undefined : weather.day0, unit);
      val += weatherEntity(weather === undefined ? undefined : weather.day1, unit);
      val += weatherEntity(weather === undefined ? undefined : weather.day2, unit);
      val += weatherEntity(weather === undefined ? undefined : weather.day3, unit);
    }

    return val;
  }
   
}
