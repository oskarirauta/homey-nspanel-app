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
    [ 'weather_partly-cloudy', 38066 ],
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
      if (Names.has(value)) {
        return Names.get(value);
      }
      // Check if it's a numeric string like "65535" or "46521"
      if (/^\d+$/.test(value)) {
        const parsedNum = parseInt(value, 10);
        if (!isNaN(parsedNum)) return parsedNum;
      }
      // Check if it's a hex string like "#FF5500" or "FF5500"
      const hexMatch = value.replace('#', '').trim();
      if (/^[0-9A-Fa-f]{6}$/.test(hexMatch)) {
        const r = parseInt(hexMatch.substring(0, 2), 16);
        const g = parseInt(hexMatch.substring(2, 4), 16);
        const b = parseInt(hexMatch.substring(4, 6), 16);
        return rgb_to_565(r, g, b);
      }

      if ((defaultValue === undefined) || (typeof defaultValue === 'number')) {
        return defaultValue;
      } else if (typeof defaultValue === 'string') {
        return Names.has(defaultValue) ? Names.get(defaultValue) : undefined;
      } else if (typeof defaultValue === 'object') {
        return rgb_to_565(defaultValue.red, defaultValue.green, defaultValue.blue);
      }
      return undefined;
    }

    return rgb_to_565(value.red, value.green, value.blue);
  }

  export const hsv_to_rgb = (h: number, s: number, v: number): RGB => {
    const hue = (h > 1 ? (h % 360) / 360 : Math.max(0, Math.min(1, h))) * 6;
    const sat = Math.max(0, Math.min(1, s));
    const val = Math.max(0, Math.min(1, v));

    const i = Math.floor(hue);
    const f = hue - i;
    const p = val * (1 - sat);
    const q = val * (1 - sat * f);
    const t = val * (1 - sat * (1 - f));

    let r = 0, g = 0, b = 0;
    switch (i % 6) {
      case 0: r = val; g = t; b = p; break;
      case 1: r = q; g = val; b = p; break;
      case 2: r = p; g = val; b = t; break;
      case 3: r = p; g = q; b = val; break;
      case 4: r = t; g = p; b = val; break;
      case 5: r = val; g = p; b = q; break;
    }
    return {
      red: Math.round(r * 255),
      green: Math.round(g * 255),
      blue: Math.round(b * 255)
    };
  };

  export const hsv_to_565 = (h: number, s: number, v: number): number => {
    const rgb = hsv_to_rgb(h, s, v);
    return rgb_to_565(rgb.red, rgb.green, rgb.blue);
  };

  export const pos_to_hsv = (x: number, y: number, wh: number): { hue: number; saturation: number } => {
    const r = (wh && wh > 0) ? wh / 2 : 80;
    const dx = (x - r) / r;
    const dy = (r - y) / r;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const saturation = Math.min(1, Math.max(0, dist));
    const angleDeg = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    const hue = angleDeg / 360;
    return { hue, saturation };
  };

  export const kelvin_fraction_to_565 = (fraction: number): number => {
    const f = Math.max(0, Math.min(1, fraction));
    const r = Math.round(200 + f * 55);
    const g = Math.round(230 - f * 60);
    const b = Math.round(255 - f * 195);
    return rgb_to_565(r, g, b);
  };

}
