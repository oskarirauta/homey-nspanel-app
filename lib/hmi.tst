import { Icon } from './icon';
import { Color } from './color';

namespace HMI {

  enum WeatherType {
    windy, partly_cloudy, clear_night, windy_variant, cloudy, exceptional, fog, hail, snowy, lightning_rainy, pouring, rainy, snowy_rainy, sunny
  }

  interface DayWeather {
    day: string | undefined;
    type: WeatherType | undefined;
    temperature: number | undefined;
  }

  interface Weather {
    day0: DayWeather | undefined; // this day
    day1: DayWeather | undefined; // next day
    day2: DayWeather | undefined; // day after that
    day3: DayWeather | undefined; // and day after that
  }

  interface StatusIcon {
    icon: string;
    color: string | number | undefined;
  }

  export const type_toString = (weather: WeatherType): string | undefined => {
    switch (weather) {
      case WeatherType.windy: return 'windy';
      case WeatherType.partly_cloudy: return 'partlycloudy';
      case WeatherType.clear_night: return 'clear-night';
      case WeatherType.windy_variant: return 'windy-variant';
      case WeatherType.cloudy: return 'cloudy';
      case WeatherType.exceptional: return 'exceptional';
      case WeatherType.fog: return 'fog';
      case WeatherType.hail: return 'hail';
      case WeatherType.snowy: return 'snowy';
      case WeatherType.lightning_rainy: return 'lightning-rainy';
      case WeatherType.pouring: return 'pouring';
      case WeatherType.rainy: return 'rainy';
      case WeatherType.snowy_rainy: return 'snowy-rainy';
      case WeatherType.sunny: return 'sunny';
    }
    return undefined;
  }

  export const string_toType = (weather: string): WeatherType | undefined => {
    switch (weather) {
      case 'windy': return WeatherType.windy;
      case 'partlycloudy':
      case 'partly_cloudy':
      case 'partly-cloudy': return WeatherType.partly_cloudy;
      case 'clearnight':
      case 'clear_night':
      case 'clear-night': return WeatherType.clear_night;
      case 'windyvariant':
      case 'windy_variant':
      case 'windy-variant': return WeatherType.windy_variant;
      case 'cloudy': return WeatherType.cloudy;
      case 'exceptional': return WeatherType.exceptional;
      case 'fog': return WeatherType.fog;
      case 'hail': return WeatherType.hail;
      case 'snow':
      case 'snowy': return WeatherType.snowy;
      case 'lightningrainy':
      case 'lightning_rainy':
      case 'lightning-rainy': return WeatherType.lightning_rainy;
      case 'pouring': return WeatherType.pouring;
      case 'rainy': return WeatherType.rainy;
      case 'snowyrainy':
      case 'snowy_rainy':
      case 'snowy-rainy': return WeatherType.snowy_rainy;
      case 'sunny': return WeatherType.sunny;
    }
    return undefined;
  }

  function weatherEntityToday(weather: DayWeather | undefined, unit: string | undefined): string {
    const type: WeatherType | undefined = type_toString(weather!.type);
    return Icon.get(type === undefined ? '' : ('weather_' + type!))! + '~' + Color.get(type === undefined ? '': ('weather_' + type!))! + '~~' +
      (weather.temperature === undefined ? '-' : (weather.temperature.toString() + (unit === undefined ? '°C' : unit!))) + '~~~';  
  }

  function weatherEntity(weather: DayWeather | undefined, unit: string | undefined): string {
    const type = type_toString(weather.type!);
    return Icon.get(type === undefined ? '' : ('weather_' + type!))! + '~' + Color.get(type === undefined ? '': ('weather_' + type!))! + '~' +
      (weather.day === undefined ? '???' : weather.day!) + '~' + (weather.temperature === undefined ? '-' : (weather.temperature.toString() + (unit === undefined ? '°C' : unit!))) + '~~~';
  }

  export const weatherUpdate = (weather: Weather, indoorTemp: number | undefined, unit: string | undefined, separateToday: boolean = false): string => {

    let val = 'weatherUpdate~~~' + Icon.get('home') + '~' + Color.get('default') + '~~' + (indoorTemp !== undefined ? indoorTemp! : '?') + (unit !== undefined ? unit! : '°C') + '~~~';
    if (separateToday) {
      val += weatherEntity(weather.day1, unit);
      val += weatherEntity(weather.day2, unit);
      val += weatherEntity(weather.day3, unit);
      val += weatherEntity(weather.day0, unit);
      val += weatherEntityToday(weather.day0, unit);
    } else {
      val += weatherEntity(weather.day0, unit);
      val += weatherEntity(weather.day1, unit);
      val += weatherEntity(weather.day2, unit);
      val += weatherEntity(weather.day3, unit);
    }

    return val;
  }
   
}
