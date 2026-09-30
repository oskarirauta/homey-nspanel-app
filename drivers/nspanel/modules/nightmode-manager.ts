import type NSPanelDevice from '../device';
const { DateTime } = require('luxon');
import { Color } from '../../../lib/color';

export class NightModeManager {
  private device: NSPanelDevice;

  constructor(device: NSPanelDevice) {
    this.device = device;
  }

  private dev(): any {
    return this.device as any;
  }

  public updateNightMode(): void {
    const dev = this.dev();
    const settings = dev.getSettings();
    const enabled = settings['night_mode_enabled'] === true;
    const followAlarm = settings['night_follow_alarm'] !== false;

    let shouldBeNight = false;

    // 1. Follow Alarm state if enabled
    if (followAlarm && (dev.alarmState === 'armed_night' || dev.alarmState === 'partially_armed')) {
      shouldBeNight = true;
    }

    // 2. Scheduled time window
    if (enabled && !shouldBeNight) {
      const startStr = (settings['night_mode_start'] as string) || '22:00';
      const endStr = (settings['night_mode_end'] as string) || '07:00';
      const now = DateTime.now().setZone(dev.homey.clock.getTimezone());
      const curMins = now.hour * 60 + now.minute;

      const [sH, sM] = startStr.split(':').map(Number);
      const [eH, eM] = endStr.split(':').map(Number);
      const startMins = (isNaN(sH) ? 22 : sH) * 60 + (isNaN(sM) ? 0 : sM);
      const endMins = (isNaN(eH) ? 7 : eH) * 60 + (isNaN(eM) ? 0 : eM);

      if (startMins <= endMins) {
        shouldBeNight = curMins >= startMins && curMins < endMins;
      } else {
        shouldBeNight = curMins >= startMins || curMins < endMins;
      }
    }

    // 3. Manual override from Flow (takes priority if specified)
    if (dev.manualNightMode !== undefined) {
      shouldBeNight = dev.manualNightMode;
    }

    if (dev.nightModeActive !== shouldBeNight) {
      dev.nightModeActive = shouldBeNight;
      dev.log(`[Night Mode] State changed to ${dev.nightModeActive ? 'ACTIVE' : 'INACTIVE'}`);
      this.updateBrightness(dev.dimmed);
      dev.nightModeChangedTrigger?.trigger(dev, { active: dev.nightModeActive }, {}).catch(dev.error);
    }
  }

  public checkNightMode(): void {
    this.updateNightMode();
  }

  public isNightMode(): boolean {
    return this.dev().nightModeActive;
  }

  public updateBrightness(dim: boolean = false): void {
    const dev = this.dev();
    const settings = dev.getSettings();
    const isNight = dev.nightModeActive;

    const defaultBg = settings['background_color'] === 'black' ? 'background_black' : 'background_dark';
    const nightBg = settings['night_theme_black'] !== false ? 'background_black' : defaultBg;
    const bgKey = isNight ? nightBg : defaultBg;
    const backgroundColor = Color.get(bgKey)!;

    let brightness = dev.customBrightness ?? (settings['brightness'] > 0 ? settings['brightness'] : 100);
    let dimBrightness = dev.customSleepBrightness ?? (settings['sleep_brightness'] !== undefined ? settings['sleep_brightness'] : 20);

    if (isNight) {
      if (settings['night_brightness'] !== undefined && settings['night_brightness'] !== null && !isNaN(Number(settings['night_brightness']))) {
        brightness = Math.max(1, Math.min(100, Number(settings['night_brightness'])));
      } else {
        brightness = 30;
      }
      if (settings['night_sleep_brightness'] !== undefined && settings['night_sleep_brightness'] !== null && !isNaN(Number(settings['night_sleep_brightness']))) {
        dimBrightness = Math.max(0, Math.min(100, Number(settings['night_sleep_brightness'])));
      } else {
        dimBrightness = 2;
      }
    }

    if (!dim) {
      dev.sendCmnd('CustomSend', `dimmode~${brightness}~${brightness}~${backgroundColor}~~`);
    } else {
      let i = brightness;
      while (true) {
        i -= 7;
        if (i > dimBrightness) {
          dev.sendCmnd('CustomSend', `dimmode~${i}~${i}~${backgroundColor}~~`);
        } else {
          break;
        }
      }
      dev.sendCmnd('CustomSend', `dimmode~${dimBrightness}~${dimBrightness}~${backgroundColor}~~`);
    }

    dev.dimmed = dim;
    dev.sleeping = false;
  }
}
