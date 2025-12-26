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
  }

  export interface Forecast {
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
      now.setZone(timezone);

    try {

      const data = JSON.parse(json);
      let forecast: Forecast = { day0: undefined, day1: undefined, day2: undefined, day3: undefined };

      if (data['weather'] !== undefined) {
        for (let i=0; i < Math.min(data['weather'].length, 4); i++) {

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
      now.setZone(timezone);

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

      now = now.plus({days: 1});

      for (let i=0; i < Math.min(data['daily'].length, 3); i++) {

        if (data['daily'].length < i || data['daily'][i] === undefined)
          break;

        const day: Day = {
          day: now.weekdayShort,
          type: data['daily'][i]['weather'] !== undefined && data['daily'][i]['weather'].length > 0 && data['daily'][i]['weather'][0]['icon'] !== undefined ? string_toType(data['daily'][i]['weather'][0]['icon']) : undefined,
          temperature: parseFloatValue(data['daily'][i]['temp']['day'])
        }

        if (day.temperature !== undefined)
          day.temperature = Math.round(day.temperature * 10) * 0.1;

        switch (i) {
          case 0: forecast.day1 = day; break;
          case 1: forecast.day2 = day; break;
          case 2: forecast.day3 = day; break;
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
      case Type.partly_cloudy: return 'cloudy';
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
    return (type === undefined ? '' : Icon.get('weather-' + type!, 'close-box-outline')!) + '~' +
      Color.get(type === undefined ? 'not_found': ('weather_' + type!))! + '~~' +   
      (weather !== undefined && weather!.temperature !== undefined ? (weather!.temperature!.toFixed(1) + (unit === undefined ? '°C' : unit!)) : '') + '~~~';
  }

  function weatherEntity(weather: Day | undefined, unit: string | undefined): string {
    const type = weather === undefined ? undefined : type_toString(weather!.type);
    return (type === undefined ? '' : Icon.get('weather-' + type!, 'close-box-outline')!) +
      '~' + Color.get(type === undefined ? 'not_found': ('weather_' + type!))! + '~' +
      (weather !== undefined && weather!.day !== undefined ? weather!.day! : '' ) + '~' +
      (weather !== undefined && weather!.temperature !== undefined ? (weather!.temperature!.toFixed(1) + (unit === undefined ? '°C' : unit!)) : '') + '~~~';
  }

  export const update = (weather: Forecast | undefined, indoorTemp: number | undefined, unit: string | undefined, separateToday: boolean = false): string | undefined => {

    let val = 'weatherUpdate~~~' + Icon.get('home') + '~' +
      Color.get('weather_home') + '~~' + (indoorTemp !== undefined ? indoorTemp! : '') +
      (indoorTemp !== undefined ? (unit !== undefined ? unit! : '°C') : '') + '~~~';

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
