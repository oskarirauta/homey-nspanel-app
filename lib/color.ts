export namespace Color {

  export interface RGB {
    red: number;
    green: number;
    blue: number;
  }

  export const rgb_to_565 = (r: number, g: number, b: number): number => {
    //return ((r & 248) << 8) | ((g & 252) << 3) | b >> 3;
    return (((r >> 3) << 11) | ((g >> 2) << 5) | ((b >> 3)));
  }

  export const Default: number = rgb_to_565(68, 115, 158);

  export const Names: Map<string, number> = new Map([

    [ 'default', rgb_to_565(68, 115, 158) ],
    [ 'background_dark', 6371 ],
    [ 'background_black', 0 ],
    [ 'not_found', 17299 ],

    [ 'white', 65535 ],

    [ 'state_on', rgb_to_565(253, 216, 53) ],
    [ 'state_enabled', rgb_to_565(253, 216, 53) ],
    [ 'state_unlocked', rgb_to_565(253, 216, 53) ],
    [ 'state_home', rgb_to_565(253, 216, 53) ],
    [ 'state_active', rgb_to_565(253, 216, 53) ],

    [ 'state_off', rgb_to_565(68, 115, 158) ],
    [ 'state_disabled', rgb_to_565(68, 115, 158) ],
    [ 'state_locked', rgb_to_565(68, 115, 158) ],
    [ 'state_away', rgb_to_565(68, 115, 158) ],
    [ 'state_inactive', rgb_to_565(68, 115, 158) ],

    [ 'alarm_disarmed', rgb_to_565(13, 160, 53) ],
    [ 'alarm_arming', rgb_to_565(244, 180, 0) ],
    [ 'alarm_armed_home', rgb_to_565(223, 76, 32) ],
    [ 'alarm_armed_away', rgb_to_565(223, 76, 32) ],
    [ 'alarm_armed_night', rgb_to_565(223, 76, 32) ],
    [ 'alarm_armed_vacation', rgb_to_565(223, 76, 32) ],
    [ 'alarm_armed_pending', rgb_to_565(223, 76, 32) ],
    [ 'alarm_armed_triggered', rgb_to_565(223, 76, 32) ],

    [ 'weather_home', rgb_to_565(220, 220, 220) ], 
    [ 'weather_windy', 38066 ],
    [ 'weather_partlycloudy', 38066 ],
    [ 'weather_clear-night', 38060 ],
    [ 'weather_windy-variant', 64495 ],
    [ 'weather_cloudy', 31728 ],
    [ 'weather_exceptional', 63878 ],
    [ 'weather_fog', 38066 ],
    [ 'weather_hail', 65535 ],
    [ 'weather_snowy', 65535 ],
    [ 'weather_lightning', 65120 ],
    [ 'weather_lightning-rainy', 50400 ],
    [ 'weather_pouring', 12703 ],
    [ 'weather_rainy', 25375 ],
    [ 'weather_snowy-rainy', 38079 ],
    [ 'weather_sunny', 65504 ],

    [ 'music_cover', rgb_to_565(180, 180, 200) ],

    [ 'climate_auto', 1024 ],
    [ 'climate_heat_cool', 1024 ],
    [ 'climate_heat', 64512 ],
    [ 'climate_off', 35921 ],
    [ 'climate_cool', 11487 ],
    [ 'climate_dry', 60897 ],
    [ 'climate_fan_only', 35921 ],

    [ 'screensaver_background', 0 ],
    [ 'screensaver_time', 65535 ],
    [ 'screensaver_timeAMPM', 65535 ],
    [ 'screensaver_date', 65535 ],
    [ 'screensaver_maintext', 65535 ],
    [ 'screensaver_forecast1', 65535 ],
    [ 'screensaver_forecast2', 65535 ],
    [ 'screensaver_forecast3', 65535 ],
    [ 'screensaver_forecast4', 65535 ],
    [ 'screensaver_forecast1val', 65535 ],
    [ 'screensaver_forecast2val', 65535 ],
    [ 'screensaver_forecast3val', 65535 ],
    [ 'screensaver_forecast4val', 65535 ],
    [ 'screensaver_bar', 65535 ],
    [ 'screensaver_timeAdd', 65535 ],
  ]);

  export const get = (value: number | string | RGB, defaultValue: number | string | RGB | undefined = undefined): number | undefined => {

    if (typeof value === 'number') {
      return value;
    } else if (typeof value === 'string') {
      if (Names.has(value as string)) {
        return Names.get(value as string);
      } else {
        if ((defaultValue === undefined) || (typeof defaultValue === 'number')) {
          return defaultValue;
        } else if (typeof defaultValue === 'string') {
          return Names.has(defaultValue as string) ? Names.get(defaultValue as string) : undefined;
        } else {
          return rgb_to_565(((value as unknown) as RGB).red, ((value as unknown) as RGB).green, ((value as unknown) as RGB).blue);
        }
      }
      return undefined;
    }

    return rgb_to_565(value.red, value.green, value.blue);
  }

}
