import * as Popups from './panel/popups';
import { Color } from './color';
import { Icon } from './icon';
import { Weather } from './weather';

export namespace Page {

  export let logthis = ((...args: any[]): void => {});

  export enum Type {
    screensaver = 'screensaver',
    entities = 'entities',
    grid = 'grid',
    grid2 = 'grid2',
    qrcode = 'qrcode',
    media = 'media',
    power = 'power',
    thermostat = 'thermostat',
    alarm = 'alarm',
    unlock = 'unlock',
    notification = 'notification',
    chart = 'chart',
    weather = 'weather'
  }

  export enum EntityType {
    light = 'light',
    switch = 'switch',
    text = 'text',
    button = 'button',
    number = 'number',
    navigate = 'navigate',
    fan = 'fan',
    input_sel = 'input_sel',
    timer = 'timer',
    shutter = 'shutter',
    cover = 'cover',
    thermo = 'thermo',
    thermostat = 'thermostat',
    delete = 'delete'
  }

  export interface Config {
    page: Type;
    options?: string;
  }

  export interface NavigationItem {
    target?: string;
    icon?: string;
    color?: number | string | Color.RGB;
    name?: string;
  }

  export interface Navigation {
    leading?: NavigationItem;
    trailing?: NavigationItem;
  }

  export interface Entity {
    type?: EntityType | string;
    name?: string;
    id?: string;
    icon?: string;
    color?: number | string | Color.RGB;
    title?: string;
    value?: boolean | number | string;
    target?: string;
  }

  export interface PowerEntity {
    name?: string;
    title?: string;
    icon?: string; 
    color?: string | number;
    consumption?: string;
    speed?: number;
  }

  export interface PageDefinition {
    id: string;
    type: Type;
    title: string;
    navigation?: Navigation;
    entities?: Entity[];
    devices?: PowerEntity[];
    qrcode?: string;
    media?: {
      author?: string;
      authorcolor?: string | number;
      title?: string;
      titlecolor?: string | number;
      icon?: string;
      iconcolor?: string | number;
    };
    volume?: number;
    paused?: boolean;
    onoff?: boolean;
    shuffle?: boolean;
    alarm?: {
      state?: string;
      pinRequired?: boolean;
      modes?: string[];
      labels?: Record<string, string>;
      language?: 'fi' | 'en';
    };
    notify?: {
      heading: string;
      message: string;
      button1?: string;
      button2?: string;
      color1?: string | number;
      color2?: string | number;
      timeout?: number;
    };
    chart?: {
      yAxisLabel?: string;
      yAxisTicks?: number[] | string;
      color?: string | number;
      values?: (number | string | { value: number; label?: string })[];
      chartType?: 'bar' | 'line';
      xAxisTicks?: string[] | string;
    };
  }

  export function stringToPageType(type: string | undefined): Type | undefined {
    if (!type) return undefined;
    const t = type.toLowerCase().trim();
    switch (t) {
      case 'screensaver': return Type.screensaver;
      case 'entities':
      case 'cardentities': return Type.entities;
      case 'grid':
      case 'cardgrid': return Type.grid;
      case 'grid2':
      case 'cardgrid2': return Type.grid2;
      case 'qr':
      case 'qrcode':
      case 'cardqr': return Type.qrcode;
      case 'media':
      case 'cardmedia': return Type.media;
      case 'power':
      case 'cardpower': return Type.power;
      case 'thermo':
      case 'thermostat':
      case 'cardthermo': return Type.thermostat;
      case 'alarm':
      case 'cardalarm': return Type.alarm;
      case 'unlock':
      case 'cardunlock': return Type.unlock;
      case 'notification':
      case 'notify':
      case 'popupnotify': return Type.notification;
      case 'chart':
      case 'cardchart':
      case 'cardlchart':
      case 'linechart': return Type.chart;
    }
    return undefined;
  }

  export function pageTypeToHmiCommand(page: Type): string {
    switch (page) {
      case Type.screensaver: return 'pageType~screensaver';
      case Type.entities: return 'pageType~cardEntities';
      case Type.grid: return 'pageType~cardGrid';
      case Type.grid2: return 'pageType~cardGrid2';
      case Type.qrcode: return 'pageType~cardQR';
      case Type.media: return 'pageType~cardMedia';
      case Type.power: return 'pageType~cardPower';
      case Type.thermostat: return 'pageType~cardThermo';
      case Type.alarm:
      case Type.unlock: return 'pageType~cardAlarm';
      case Type.notification: return 'pageType~popupNotify';
      case Type.chart: return 'pageType~cardChart';
      case Type.weather: return 'pageType~cardEntities';
    }
    return 'pageType~screensaver';
  }

  export function stringToEntityType(type: string | undefined): EntityType {
    if (typeof type === 'string') {
      switch (type.toLowerCase().trim()) {
        case 'light': return EntityType.light;
        case 'switch': return EntityType.switch;
        case 'text': return EntityType.text;
        case 'button': return EntityType.button;
        case 'number': return EntityType.number;
        case 'navigate': return EntityType.navigate;
        case 'fan': return EntityType.fan;
        case 'input_sel':
        case 'select': return EntityType.input_sel;
        case 'timer': return EntityType.timer;
        case 'shutter':
        case 'cover':
        case 'curtain':
        case 'blind': return EntityType.shutter;
        case 'thermo':
        case 'thermostat': return EntityType.thermostat;
        case 'delete': return EntityType.delete;
      }
    }
    return EntityType.text;
  }

  export function EntityTypeToString(type: EntityType | string | undefined): string {
    if (!type) return 'text';
    if (typeof type === 'string') {
      const lower = type.toLowerCase().trim();
      if (lower === 'shutter' || lower === 'cover' || lower === 'curtain' || lower === 'blind') return 'shutter';
      if (lower === 'thermo' || lower === 'thermostat') return 'text';
      return type;
    }
    switch (type) {
      case EntityType.light: return 'light';
      case EntityType.switch: return 'switch';
      case EntityType.text: return 'text';
      case EntityType.button: return 'button';
      case EntityType.number: return 'number';
      case EntityType.navigate: return 'button';
      case EntityType.fan: return 'fan';
      case EntityType.input_sel: return 'input_sel';
      case EntityType.timer: return 'timer';
      case EntityType.shutter:
      case EntityType.cover: return 'shutter';
      case EntityType.thermo:
      case EntityType.thermostat: return 'text';
      case EntityType.delete: return 'delete';
    }
    return 'text';
  }

  export function parseBoolValue(value: string | boolean | number | undefined): boolean | undefined {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const v = value.toUpperCase().trim();
      if (['0', 'NO', 'FALSE', 'DISABLED', 'OFF'].includes(v)) return false;
      if (['1', 'YES', 'TRUE', 'ENABLED', 'ON'].includes(v)) return true;
    } else if (typeof value === 'number') {
      return value !== 0;
    }
    return undefined;
  }

  export function parseIntValue(value: string | boolean | number | undefined, min?: number, max?: number): number | undefined {
    let result: number | undefined = undefined;
    if (typeof value === 'boolean') {
      result = value ? 1 : 0;
    } else if (typeof value === 'number') {
      result = Math.round(value);
    } else if (typeof value === 'string' && value !== '') {
      const converted = parseInt(value, 10);
      if (!isNaN(converted)) result = converted;
    }

    if (result !== undefined && min !== undefined && result < min) result = min;
    else if (result !== undefined && max !== undefined && result > max) result = max;

    return result;
  }

  export function parseFloatValue(value: string | boolean | number | undefined, min?: number, max?: number): number | undefined {
    let result: number | undefined = undefined;
    if (typeof value === 'boolean') {
      result = value ? 1 : 0;
    } else if (typeof value === 'number') {
      result = value;
    } else if (typeof value === 'string' && value !== '') {
      const converted = parseFloat(value);
      if (!isNaN(converted)) result = converted;
    }

    if (result !== undefined && min !== undefined && result < min) result = min;
    else if (result !== undefined && max !== undefined && result > max) result = max;

    return result;
  }

  export function parseNavigationItems(options: string | Navigation | undefined): Navigation {
    const result: Navigation = { leading: undefined, trailing: undefined };
    if (!options) return result;

    if (typeof options === 'object') {
      return options;
    }

    try {
      const json = JSON.parse(options !== '' ? options : '{}');
      const nav = json['nav'] ?? json['navigation'];
      if (!nav) return result;

      const leading = nav['left'] ?? nav['leading'];
      if (leading && leading['target']) {
        result.leading = {
          target: leading['target'],
          icon: leading['icon'],
          color: leading['color'],
          name: leading['name']
        };
      }

      const trailing = nav['right'] ?? nav['trailing'];
      if (trailing && trailing['target']) {
        result.trailing = {
          target: trailing['target'],
          icon: trailing['icon'],
          color: trailing['color'],
          name: trailing['name']
        };
      }
    } catch {}

    return result;
  }

  export function parseEntities(options: string | Entity[] | undefined): Entity[] {
    const result: Entity[] = [];
    if (!options) return result;

    if (Array.isArray(options)) {
      return options;
    }

    try {
      const json = JSON.parse(options !== '' ? options : '{}');
      if (!json['entities'] || !Array.isArray(json['entities'])) return result;

      for (let i = 0; i < json['entities'].length; i++) {
        const item = json['entities'][i];
        const entity: Entity = {
          type: stringToEntityType(item['type']),
          name: item['name'],
          icon: item['icon'],
          color: item['color'],
          title: item['title'] ?? '',
          value: undefined,
          target: item['target']
        };

        if (!entity.name) {
          const entityTitle = entity.title ? entity.title : `entity${i}`;
          const entityType = EntityTypeToString(entity.type);
          entity.name = `i${entityType[0].toUpperCase() + entityType.substring(1)}.${entityTitle.toUpperCase()}`;
        }

        const value = item['value'];
        if (typeof value === 'string') entity.value = value;
        else if (typeof value === 'number') entity.value = value.toString();
        else if (typeof value === 'boolean') entity.value = value ? '1' : '0';

        result.push(entity);
      }
    } catch {}

    return result;
  }

  export function GenerateNavigation(navigation: Navigation | undefined): string {
    const leading = navigation?.leading;
    const trailing = navigation?.trailing;

    let leadingType = 'delete';
    let leadingIcon = '';
    let leadingColor = -1;
    let leadingTarget = '';
    let leadingName = '';
    let trailingType = 'delete';
    let trailingIcon = '';
    let trailingColor = -1;
    let trailingTarget = '';
    let trailingName = '';

    if (leading && leading.target) {
      leadingType = 'Nav.Button.prev';
      leadingIcon = leading.icon ? Icon.get(leading.icon, 'close-box-outline')! : Icon.get('arrow-left-bold')!;
      leadingColor = leading.color !== undefined ? Color.get(leading.color, 'white')! : Color.get('white')!;
      leadingTarget = leading.target;
      leadingName = leading.name ?? '';
    }

    if (trailing && trailing.target) {
      trailingType = 'Nav.Button.next';
      trailingIcon = trailing.icon ? Icon.get(trailing.icon, 'close-box-outline')! : Icon.get('arrow-right-bold')!;
      trailingColor = trailing.color !== undefined ? Color.get(trailing.color, 'white')! : Color.get('white')!;
      trailingTarget = trailing.target;
      trailingName = trailing.name ?? '';
    }

    return `${leadingType}~${leadingTarget}~${leadingIcon}~${leadingColor < 0 ? '' : leadingColor}~${leadingName}~~` +
           `${trailingType}~${trailingTarget}~${trailingIcon}~${trailingColor < 0 ? '' : trailingColor}~${trailingName}~`;
  }

  export function GenerateEntity(entity: Entity | undefined): string {
    if (!entity || entity.type === EntityType.delete) {
      return 'delete~~~~~';
    }

    const entityTypeStr = EntityTypeToString(entity.type);
    const entityColor = entity.color !== undefined ? Color.get(entity.color, 'white') : 65535;
    const iconStr = entity.icon ? Icon.get(entity.icon, 'close-box-outline')! : '';
    // Sanitize tilde characters that would corrupt the HMI protocol framing
    const sanitize = (s: string) => s.replace(/~/g, '-');
    const titleStr = sanitize(entity.title ?? '');
    let valueStr = '';

    if (entity.value !== undefined) {
      if (typeof entity.value === 'boolean') valueStr = entity.value ? '1' : '0';
      else valueStr = sanitize(entity.value.toString());
    }

    if (entityTypeStr === 'shutter') {
      if (!valueStr || !valueStr.includes('|')) {
        const upIcon = Icon.get('arrow-up') || '';
        const stopIcon = Icon.get('stop') || '';
        const downIcon = Icon.get('arrow-down') || '';
        valueStr = `${upIcon}|${stopIcon}|${downIcon}|enable|enable|enable`;
      }
    }

    // For navigate buttons, name holds target or id or entity name
    const nameStr = sanitize(entity.target ?? entity.id ?? entity.name ?? '');

    return `${entityTypeStr}~${nameStr}~${iconStr}~${entityColor}~${titleStr}~${valueStr}`;
  }

  /**
   * Generate cardEntities HMI command (up to 4 items in vertical list)
   */
  export function GenerateEntities(options: string | PageDefinition | undefined): string | undefined {
    try {
      let title = '';
      let navigation: Navigation = { leading: undefined, trailing: undefined };
      let entities: Entity[] = [];

      if (typeof options === 'string') {
        const json = JSON.parse(options !== '' ? options : '{}');
        title = json['title'] ?? '';
        navigation = parseNavigationItems(options);
        entities = parseEntities(options);
      } else if (options) {
        title = options.title ?? '';
        navigation = options.navigation ?? navigation;
        entities = options.entities ?? [];
      }

      let entityStr = '';
      for (let i = 0; i < 4; i++) {
        const item = i < entities.length ? entities[i] : undefined;
        entityStr += (i === 0 ? '' : '~') + GenerateEntity(item);
      }

      return `entityUpd~${title}~${GenerateNavigation(navigation)}~${entityStr}`;
    } catch (err) {
      logthis('failed to generate entities page', err);
      return undefined;
    }
  }

  /**
   * Generate cardGrid or cardGrid2 HMI command (6 or 8 items in a grid)
   */
  export function GenerateGrid(options: string | PageDefinition | undefined, isGrid2: boolean = false): string | undefined {
    try {
      let title = '';
      let navigation: Navigation = { leading: undefined, trailing: undefined };
      let entities: Entity[] = [];

      if (typeof options === 'string') {
        const json = JSON.parse(options !== '' ? options : '{}');
        title = json['title'] ?? '';
        navigation = parseNavigationItems(options);
        entities = parseEntities(options);
      } else if (options) {
        title = options.title ?? '';
        navigation = options.navigation ?? navigation;
        entities = options.entities ?? [];
      }

      const maxItems = isGrid2 ? 8 : 6;
      let entityStr = '';
      for (let i = 0; i < maxItems; i++) {
        const item = i < entities.length ? entities[i] : undefined;
        entityStr += (i === 0 ? '' : '~') + GenerateEntity(item);
      }

      return `entityUpd~${title}~${GenerateNavigation(navigation)}~${entityStr}`;
    } catch (err) {
      logthis('failed to generate grid page', err);
      return undefined;
    }
  }

  /**
   * Generate cardAlarm HMI command
   */
  export function GenerateAlarm(options: string | Partial<PageDefinition> | undefined): string | undefined {
    try {
      let title = 'Alarm';
      let navigation: Navigation = { leading: undefined, trailing: undefined };
      let state = 'disarmed';
      let pinRequired = true;
      let entityId = 'alarm_panel';
      let customModes: string[] | undefined;
      let labels: Record<string, string> = {};
      let language: 'fi' | 'en' = 'en';

      if (typeof options === 'string') {
        const json = JSON.parse(options !== '' ? options : '{}');
        title = json['title'] ?? 'Alarm';
        navigation = parseNavigationItems(options);
        state = json['state'] ?? 'disarmed';
        pinRequired = json['pin_required'] !== false;
        entityId = json['entity'] ?? 'alarm_panel';
        customModes = json['supported_modes'] || json['modes'];
        labels = json['labels'] || {};
        language = json['language'] || (json['lang'] === 'fi' ? 'fi' : 'en');
      } else if (options) {
        title = options.title ?? 'Alarm';
        navigation = options.navigation ?? navigation;
        if (options.alarm) {
          state = options.alarm.state ?? 'disarmed';
          pinRequired = options.alarm.pinRequired !== false;
          customModes = options.alarm.modes;
          labels = options.alarm.labels || {};
          language = options.alarm.language || 'en';
        }
      }

      // Normalize Homey capability values
      if (state === 'armed') state = 'armed_away';
      else if (state === 'partially_armed') state = 'armed_home';

      let color = Color.get('alarm_disarmed')!;
      let icon = Icon.get('shield-off')!;
      const supportedModes: string[] = [];
      let numpad = pinRequired ? 'enable' : 'disable';
      let flashing = 'disable';

      if (state === 'disarmed') {
        color = Color.get('alarm_disarmed')!;
        icon = Icon.get('shield-off')!;
        if (customModes && customModes.length > 0) {
          supportedModes.push(...customModes);
        } else {
          supportedModes.push('arm_home', 'arm_away', 'arm_night');
        }
      } else if (state === 'armed_home') {
        color = Color.get('alarm_armed_home')!;
        icon = Icon.get('shield-home')!;
        supportedModes.push('disarm');
      } else if (state === 'armed_away') {
        color = Color.get('alarm_armed_away')!;
        icon = Icon.get('shield-lock')!;
        supportedModes.push('disarm');
      } else if (state === 'armed_night') {
        color = Color.get('alarm_armed_night')!;
        icon = Icon.get('weather-night')!;
        supportedModes.push('disarm');
      } else if (state === 'arming' || state === 'pending') {
        color = Color.get('alarm_arming')!;
        icon = Icon.get('shield')!;
        flashing = 'enable';
        supportedModes.push('disarm');
      } else if (state === 'triggered') {
        color = Color.get('alarm_armed_triggered')!;
        icon = Icon.get('bell-ring')!;
        flashing = 'enable';
        supportedModes.push('disarm');
      }

      const isFi = language === 'fi';
      const defaultLabels: Record<string, string> = isFi ? {
        arm_home: 'Kotona',
        arm_away: 'Poissa',
        arm_night: 'Yö',
        disarm: 'Pois'
      } : {
        arm_home: 'Home',
        arm_away: 'Away',
        arm_night: 'Night',
        disarm: 'Disarm'
      };

      let armButtons = '';
      for (const m of supportedModes) {
        const label = labels[m] || defaultLabels[m] || (m === 'arm_home' ? 'Home' : m === 'arm_away' ? 'Away' : m === 'arm_night' ? 'Night' : m === 'disarm' ? 'Disarm' : m);
        armButtons += `~${label}~${m}`;
      }
      if (supportedModes.length < 4) {
        armButtons += '~'.repeat((4 - supportedModes.length) * 2);
      }

      return `entityUpd~${title}~${GenerateNavigation(navigation)}~${entityId}${armButtons}~${icon}~${color}~${numpad}~${flashing}~`;
    } catch (err) {
      logthis('failed to generate alarm page', err);
      return undefined;
    }
  }

  /**
   * Generate cardUnlock HMI command (PIN unlock)
   */
  export function GenerateUnlock(
    title: string,
    destination: string,
    pin?: string,
    navigation?: Navigation,
    language: 'fi' | 'en' = 'fi'
  ): string {
    const color = Color.get('alarm_arming')!;
    const icon = Icon.get('lock')!;
    const navStr = GenerateNavigation(navigation);
    const unlockLabel = language === 'en' ? 'Unlock' : 'Avaa';
    const armButtons = `~${unlockLabel}~cardUnlock-unlock~~~~~~`;
    return `entityUpd~${title}~${navStr}~${destination}${armButtons}~${icon}~${color}~enable~disable~`;
  }

  /**
   * Generate popupNotify HMI command (full-screen alert with 1-2 buttons)
   */
  export function GenerateNotification(
    heading: string,
    message: string,
    button1: string = 'OK',
    button2: string = '',
    color1: number | string = 'white',
    color2: number | string = 'white',
    timeout: number = 0,
    ident: string = 'notify'
  ): string {
    const c1 = Color.get(color1, 'white')!;
    const c2 = Color.get(color2, 'white')!;
    // Sanitize tilde characters that would corrupt the HMI protocol framing
    const sanitize = (s: string) => s.replace(/~/g, '-');
    return `entityUpdateDetail~${sanitize(ident)}~${sanitize(heading)}~65535~${sanitize(button1)}~${c1}~${sanitize(button2)}~${c2}~${sanitize(message)}~65535~${timeout}`;
  }

  export const GenerateQRCode = ((options: string | PageDefinition | undefined): string | undefined => {
    try {
      let title = '';
      let qrcode = '';
      let navigation: Navigation = { leading: undefined, trailing: undefined };
      let entities: Entity[] = [];

      if (typeof options === 'string') {
        const json = JSON.parse(options !== '' ? options : '{}');
        title = json['title'] ?? '';
        qrcode = json['qrcode'] ?? '';
        navigation = parseNavigationItems(options);
        entities = parseEntities(options);
      } else if (options) {
        title = options.title ?? '';
        qrcode = options.qrcode ?? '';
        navigation = options.navigation ?? navigation;
        entities = options.entities ?? [];
      }

      let entityStr = '';
      for (let i = 0; i < Math.min(entities.length, 2); i++) {
        entityStr += (i === 0 ? '' : '~') + GenerateEntity(entities[i]);
      }

      return `entityUpd~${title}~${GenerateNavigation(navigation)}~${qrcode}~${entityStr}`;
    } catch (err) {
      logthis('failed to parse qrcode page config', err);
      return undefined;
    }
  });

  export const GenerateMedia = ((options: string | PageDefinition | undefined): string | undefined => {
    try {
      let title = 'Media Player';
      let navigation: Navigation = { leading: undefined, trailing: undefined };
      let authorName = '';
      let authorColor = Color.get('white')!.toString();
      let songName = '';
      let songColor = Color.get('white')!.toString();
      let volume = '0';
      let paused = false;
      let onoff: boolean | undefined = undefined;
      let shuffle: boolean | undefined = undefined;
      let mediaIcon = 'music';
      let mediaIconColor = Color.get('music_cover')!.toString();
      let entities: Entity[] = [];

      if (typeof options === 'string') {
        const json = JSON.parse(options !== '' ? options : '{}');
        title = json['title'] ?? 'Media Player';
        navigation = parseNavigationItems(options);
        entities = parseEntities(options);

        if (json['media']) {
          authorName = json['media']['author'] ?? '';
          if (json['media']['authorcolor']) authorColor = Color.get(json['media']['authorcolor'], 'white')!.toString();
          songName = json['media']['title'] ?? '';
          if (json['media']['titlecolor']) songColor = Color.get(json['media']['titlecolor'], 'white')!.toString();
          if (json['media']['icon']) mediaIcon = json['media']['icon'];
          if (json['media']['iconcolor']) mediaIconColor = Color.get(json['media']['iconcolor'], 'music_cover')!.toString();
        }
        volume = (parseIntValue(json['volume'], 0, 100) ?? 0).toString();
        paused = parseBoolValue(json['paused']) ?? false;
        onoff = parseBoolValue(json['onoff']);
        shuffle = parseBoolValue(json['shuffle']);
      } else if (options) {
        title = options.title ?? 'Media Player';
        navigation = options.navigation ?? navigation;
        entities = options.entities ?? [];
        if (options.media) {
          authorName = options.media.author ?? '';
          if (options.media.authorcolor) authorColor = Color.get(options.media.authorcolor, 'white')!.toString();
          songName = options.media.title ?? '';
          if (options.media.titlecolor) songColor = Color.get(options.media.titlecolor, 'white')!.toString();
          if (options.media.icon) mediaIcon = options.media.icon;
          if (options.media.iconcolor) mediaIconColor = Color.get(options.media.iconcolor, 'music_cover')!.toString();
        }
        volume = (options.volume ?? 0).toString();
        paused = options.paused ?? false;
        onoff = options.onoff;
        shuffle = options.shuffle;
      }

      let entityStr = '';
      for (let i = 0; i < Math.min(entities.length, 5); i++) {
        entityStr += (i === 0 ? '' : '~') + GenerateEntity(entities[i]);
      }

      return `entityUpd~${title}~${GenerateNavigation(navigation)}~media~${authorName}~${authorColor}~${songName}~${songColor}~` +
             `${volume}~${Icon.get(paused ? 'pause' : 'play')}~` +
             `${onoff !== undefined ? Color.get(onoff ? { red: 255, green: 152, blue: 0 } : 1374) : 'disable'}~` +
             `${shuffle !== undefined ? Icon.get(shuffle ? 'shuffle' : 'shuffle-disabled')! : 'disable'}~` +
             `button.media.cover~media.music~${Icon.get(mediaIcon, 'close-box-outline')!}~${mediaIconColor}~~~` +
             entityStr;
    } catch (err) {
      logthis('failed to parse media page config,', err);
      return undefined;
    }
  });

  export const GeneratePower = ((options: any): string | undefined => {
    try {
      let title = 'Power Flow';
      let navigation: Navigation = { leading: undefined, trailing: undefined };
      let homeNode: PowerEntity = {
        title: 'Home',
        icon: 'home',
        color: 'white',
        consumption: ''
      };
      const nodes: PowerEntity[] = [];

      let rawObj: any = {};
      if (typeof options === 'string') {
        try {
          rawObj = JSON.parse(options !== '' ? options : '{}');
        } catch {
          rawObj = {};
        }
        navigation = parseNavigationItems(options);
      } else if (typeof options === 'object' && options !== null) {
        rawObj = options;
        if (options.navigation) navigation = options.navigation;
      }

      title = rawObj.title ?? title;

      // 1. Home node
      if (rawObj.home) {
        homeNode = {
          title: rawObj.home.title ?? 'Home',
          icon: rawObj.home.icon ?? 'home',
          color: rawObj.home.color ?? 'white',
          consumption: rawObj.home.consumption ?? rawObj.home.power ?? ''
        };
      } else if (rawObj.devices && Array.isArray(rawObj.devices) && rawObj.devices.length > 0) {
        const d0 = rawObj.devices[0];
        homeNode = {
          title: d0.title ?? 'Home',
          icon: d0.icon ?? 'home',
          color: d0.color ?? 'white',
          consumption: d0.consumption ?? d0.power ?? ''
        };
      }

      // 2. Outer nodes (6 nodes)
      const rawNodes = rawObj.nodes || (rawObj.devices && rawObj.devices.length > 1 ? rawObj.devices.slice(1) : undefined);
      if (Array.isArray(rawNodes)) {
        for (let i = 0; i < Math.min(rawNodes.length, 6); i++) {
          const d = rawNodes[i];
          if (d && (d.icon || d.title || d.consumption !== undefined || d.power !== undefined)) {
            nodes.push({
              name: d.name || `node${i + 1}`,
              title: d.title ?? '',
              icon: d.icon ? (Icon.exists(d.icon) ? Icon.get(d.icon, 'flash') : d.icon) : undefined,
              color: d.color ? Color.get(d.color, 'white') : Color.get('white'),
              consumption: d.consumption !== undefined ? String(d.consumption) : (d.power !== undefined ? String(d.power) : ''),
              speed: d.speed !== undefined ? parseIntValue(d.speed, -120, 120) : 0
            });
          } else {
            nodes.push({});
          }
        }
      } else if (rawObj.slots && typeof rawObj.slots === 'object') {
        for (let i = 1; i <= 6; i++) {
          const s = rawObj.slots[i];
          if (s && (s.icon || s.title || s.val !== undefined || s.value !== undefined)) {
            nodes.push({
              name: s.id || `node${i}`,
              title: s.title ?? '',
              icon: s.icon ? (Icon.exists(s.icon) ? Icon.get(s.icon, 'flash') : s.icon) : undefined,
              color: s.color ? Color.get(s.color, 'white') : Color.get('white'),
              consumption: s.val !== undefined ? String(s.val) : (s.value !== undefined ? String(s.value) : ''),
              speed: s.speed !== undefined ? parseIntValue(s.speed, -120, 120) : 0
            });
          } else {
            nodes.push({});
          }
        }
      }

      while (nodes.length < 6) {
        nodes.push({});
      }

      // Build exact Nextion HMI token array (70 tokens)
      const tokens: string[] = [];

      // Token 0: entityUpd
      tokens.push('entityUpd');
      // Token 1: heading / title
      tokens.push(title);

      // Navigation: 12 tokens (tokens 2 to 13)
      const leading = navigation?.leading;
      const trailing = navigation?.trailing;

      // Leading: 6 tokens (2 to 7)
      if (leading && leading.target) {
        const leadIcon = leading.icon ? Icon.get(leading.icon, 'arrow-left-bold')! : Icon.get('arrow-left-bold')!;
        const leadColor = leading.color !== undefined ? String(Color.get(leading.color, 'white')!) : '65535';
        tokens.push('button');          // 2: type
        tokens.push(leading.target);    // 3: target
        tokens.push(leadIcon);          // 4: icon
        tokens.push(leadColor);         // 5: color
        tokens.push(leading.name ?? '');// 6: name
        tokens.push('');                // 7: empty
      } else {
        tokens.push('delete'); // 2
        tokens.push('');       // 3
        tokens.push('');       // 4
        tokens.push('');       // 5
        tokens.push('');       // 6
        tokens.push('');       // 7
      }

      // Trailing: 6 tokens (8 to 13)
      if (trailing && trailing.target) {
        const trailIcon = trailing.icon ? Icon.get(trailing.icon, 'arrow-right-bold')! : Icon.get('arrow-right-bold')!;
        const trailColor = trailing.color !== undefined ? String(Color.get(trailing.color, 'white')!) : '65535';
        tokens.push('button');           // 8: type
        tokens.push(trailing.target);    // 9: target
        tokens.push(trailIcon);          // 10: icon
        tokens.push(trailColor);         // 11: color
        tokens.push(trailing.name ?? '');// 12: name
        tokens.push('');                 // 13: empty
      } else {
        tokens.push('delete'); // 8
        tokens.push('');       // 9
        tokens.push('');       // 10
        tokens.push('');       // 11
        tokens.push('');       // 12
        tokens.push('');       // 13
      }

      // Home Node: Center Icon & Lower Value (tokens 14 to 20)
      const homeIconStr = homeNode.icon ? Icon.get(homeNode.icon, 'home')! : Icon.get('home', 'home')!;
      const homeColorStr = homeNode.color !== undefined ? String(Color.get(homeNode.color, 'white')!) : '65535';
      const homeConsStr = homeNode.consumption !== undefined ? String(homeNode.consumption) : '';
      const homeTitleStr = homeNode.title !== undefined ? String(homeNode.title) : 'Home';

      tokens.push('');          // 14: type
      tokens.push('');          // 15: intNameEntity
      tokens.push(homeIconStr); // 16: icon (t1.txt in Nextion)
      tokens.push(homeColorStr);// 17: color (t1.pco in Nextion)
      tokens.push('');          // 18: display
      tokens.push(homeConsStr); // 19: optionalValue / lower text below icon (tHome.txt in Nextion)
      tokens.push('');          // 20: speed

      // Home Node: Value above Home Icon / Title (tokens 21 to 27)
      tokens.push('');          // 21: type
      tokens.push('');          // 22: intNameEntity
      tokens.push('');          // 23: icon
      tokens.push('');          // 24: color
      tokens.push('');          // 25: display
      tokens.push(homeTitleStr);// 26: optionalValue / upper title above icon (tHomeO.txt in Nextion)
      tokens.push('');          // 27: speed

      // 6 Outer Nodes: tokens 28 to 69 (6 nodes * 7 tokens = 42 tokens)
      for (let i = 0; i < 6; i++) {
        const n = nodes[i];
        if (n && (n.icon || n.title || (n.consumption !== undefined && n.consumption !== ''))) {
          const iconVal = n.icon ? (Icon.exists(n.icon) ? Icon.get(n.icon, 'flash')! : n.icon) : '';
          const colorVal = n.color !== undefined ? String(Color.get(n.color, 'white')!) : '65535';
          const titleVal = n.title ?? '';
          const consVal = n.consumption !== undefined ? String(n.consumption) : '';
          let speedVal = '0';
          if (n.speed !== undefined) {
            const raw = parseIntValue(n.speed, -120, 120) ?? 0;
            // Nextion hardware slider orientation:
            // Left nodes (0..2, h0..h2): negative speed flows INTO home, positive flows OUT of home.
            // Right nodes (3..5, h3..h5): positive speed flows INTO home, negative flows OUT of home.
            // Inverting left side ensures positive logical speed ALWAYS means 'flow towards home', negative means 'flow away from home'.
            speedVal = String(i < 3 ? -raw : raw);
          }

          tokens.push('');       // 28 + i*7: type
          tokens.push('');       // 29 + i*7: intNameEntity
          tokens.push(iconVal);  // 30 + i*7: icon (t{i}Icon.txt)
          tokens.push(colorVal); // 31 + i*7: color (t{i}Icon.pco)
          tokens.push(titleVal); // 32 + i*7: display / upper text (t{i}o.txt)
          tokens.push(consVal);  // 33 + i*7: optionalValue / lower text (t{i}u.txt)
          tokens.push(speedVal); // 34 + i*7: speed (t{i}Speed.val)
        } else {
          // Hidden / empty node: 7 empty tokens
          tokens.push('');
          tokens.push('');
          tokens.push('');
          tokens.push('');
          tokens.push('');
          tokens.push('');
          tokens.push('');
        }
      }

      return tokens.join('~');
    } catch (err) {
      logthis('failed to parse power page config,', err);
      return undefined;
    }
  });

  export const GenerateThermo = ((
    options: string | PageDefinition | undefined,
    temperature: number | undefined,
    setpoint: number | undefined,
    min: number | undefined,
    max: number | undefined,
    step: number | undefined,
    use_celcius: boolean
  ): string | undefined => {
    try {
      let title = 'Thermostat';
      let navigation: Navigation = { leading: undefined, trailing: undefined };
      let entityId = 'thermo';

      if (typeof options === 'string') {
        const json = JSON.parse(options !== '' ? options : '{}');
        title = json['title'] ?? 'Thermostat';
        navigation = parseNavigationItems(options);
        entityId = json['id'] ?? json['entityId'] ?? 'thermo';
      } else if (options) {
        title = options.title ?? 'Thermostat';
        navigation = options.navigation ?? navigation;
        entityId = (options as any).id ?? (options as any).entityId ?? 'thermo';
      }

      const temp_current = temperature ?? 0;
      const temp_setpoint = (setpoint ?? 0) * 10;
      const temp_min = (min ?? 15.0) * 10;
      const temp_max = (max ?? 32.0) * 10;
      const temp_step = (step ?? 0.5) * 10;

      let entityStr = `entityUpd~${title}~${GenerateNavigation(navigation)}~${entityId}~` +
                      `${temp_current.toFixed(1)} ${use_celcius ? '°C' : '°F'}~${temp_setpoint.toFixed(0)}~~` +
                      `${temp_min.toFixed(0)}~${temp_max.toFixed(0)}~${temp_step.toFixed(0)}~`;

      entityStr += `${Icon.get('fire')!}~${Color.get('climate_heat')!}~0~heating~`;
      entityStr += `${Icon.get('fan')!}~${Color.get('climate_cool')!}~0~cooling~`;
      entityStr += '~~~~';

      for (let i = 0; i < 5; i++) {
        entityStr += '~~~~';
      }

      entityStr += `~~~${Icon.get(use_celcius ? 'temperature-celsius' : 'temperature-fahrenheit')!}~~1`;

      return entityStr;
    } catch (err) {
      logthis('failed to parse thermo page config,', err);
      return undefined;
    }
  });

  export function appendNavigationTokens(tokens: string[], navigation?: Navigation): void {
    const leading = navigation?.leading;
    const trailing = navigation?.trailing;

    if (leading && leading.target) {
      const leadIcon = leading.icon ? Icon.get(leading.icon, 'arrow-left-bold')! : Icon.get('arrow-left-bold')!;
      const leadColor = leading.color !== undefined ? String(Color.get(leading.color, 'white')!) : '65535';
      tokens.push('button');
      tokens.push(leading.target);
      tokens.push(leadIcon);
      tokens.push(leadColor);
      tokens.push(leading.name ?? '');
      tokens.push('');
    } else {
      tokens.push('delete', '', '', '', '', '');
    }

    if (trailing && trailing.target) {
      const trailIcon = trailing.icon ? Icon.get(trailing.icon, 'arrow-right-bold')! : Icon.get('arrow-right-bold')!;
      const trailColor = trailing.color !== undefined ? String(Color.get(trailing.color, 'white')!) : '65535';
      tokens.push('button');
      tokens.push(trailing.target);
      tokens.push(trailIcon);
      tokens.push(trailColor);
      tokens.push(trailing.name ?? '');
      tokens.push('');
    } else {
      tokens.push('delete', '', '', '', '', '');
    }
  }

  /**
   * Smart calculation of clean, rounded Y-axis tick values for Nextion cardChart / cardLChart.
   * If unit is °C or c/kWh, Nextion scales values / 10, so ticks should match that magnitude.
   */
  export function calculateChartTicks(numericVals: number[], unit?: string): string {
    if (!numericVals || numericVals.length === 0) {
      return (unit === '°C' || unit === 'c/kWh') ? '0:50:100:150:200:250' : '0:20:40:60:80:100';
    }
    const minVal = Math.min(...numericVals);
    const maxVal = Math.max(...numericVals);

    if (minVal === maxVal) {
      const base = minVal;
      const step = base === 0 ? 10 : Math.max(1, Math.round(Math.abs(base) * 0.2));
      return `${base - step}:${base}:${base + step}`;
    }

    const span = maxVal - minVal;
    const rawStep = span / 4; // aim for 4-5 ticks
    
    // Find clean round step
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
    const residual = rawStep / (magnitude || 1);
    let cleanStep: number;
    if (residual <= 1.2) cleanStep = 1 * magnitude;
    else if (residual <= 2.5) cleanStep = 2 * magnitude;
    else if (residual <= 6) cleanStep = 5 * magnitude;
    else cleanStep = 10 * magnitude;

    cleanStep = Math.max(1, Math.round(cleanStep));

    let startTick: number;
    if (minVal >= 0 && (minVal < span || minVal - cleanStep < 0)) {
      startTick = 0;
    } else {
      startTick = Math.floor(minVal / cleanStep) * cleanStep;
    }

    const endTick = Math.ceil(maxVal / cleanStep) * cleanStep;
    const ticks: number[] = [];
    for (let t = startTick; t <= endTick + cleanStep * 0.1; t += cleanStep) {
      ticks.push(Math.round(t));
    }

    return ticks.join(':');
  }

  export interface ChartShiftOptions {
    label?: string;
    x?: number;
    scale?: number;
    isBarChart?: boolean;
  }

  /**
   * FIFO rolling buffer shift for chart datapoints (both bar and line charts).
   * - In line charts with explicit X coordinates:
   *   Removes the oldest point, shifts all remaining points to the previous X positions,
   *   and appends the new point at the rightmost X position (or custom options.x).
   * - In bar charts (cardChart) or sequential datasets without X:
   *   Simply drops the oldest bar, shifts remaining bars to the left, and appends the new value.
   *   Any passed X coordinate is ignored because bar charts use fixed sequential slots.
   */
  export function shiftChartValues(
    rawValues: any,
    newValue: number,
    options?: ChartShiftOptions
  ): any[] {
    const points: { x?: number; value: number; label?: string }[] = [];
    let isAllPlainNumbers = true;

    const parseItem = (item: any, idx: number) => {
      if (typeof item === 'object' && item !== null) {
        isAllPlainNumbers = false;
        const val = Number(item.value ?? item.y ?? 0);
        const xNum = item.x !== undefined ? Number(item.x) : undefined;
        const pt: { x?: number; value: number; label?: string } = {
          value: isNaN(val) ? 0 : val
        };
        if (xNum !== undefined && !isNaN(xNum)) pt.x = xNum;
        if (item.label !== undefined) pt.label = String(item.label);
        points.push(pt);
      } else if (typeof item === 'number') {
        points.push({ value: item });
      } else if (typeof item === 'string') {
        isAllPlainNumbers = false;
        const s = item.trim();
        let x: number | undefined = undefined;
        let y = 0;
        let label: string | undefined = undefined;

        let valPart = s;
        if (valPart.includes('^')) {
          const caretIdx = valPart.indexOf('^');
          label = valPart.substring(caretIdx + 1).trim();
          valPart = valPart.substring(0, caretIdx).trim();
        }

        if (valPart.includes(':')) {
          const colonIdx = valPart.indexOf(':');
          const xStr = valPart.substring(0, colonIdx).trim();
          const yStr = valPart.substring(colonIdx + 1).trim();
          const parsedX = Number(xStr);
          if (!isNaN(parsedX)) x = parsedX;
          const parsedY = Number(yStr);
          if (!isNaN(parsedY)) y = parsedY;
        } else {
          const parsedY = Number(valPart);
          if (!isNaN(parsedY)) y = parsedY;
        }
        const pt: { x?: number; value: number; label?: string } = {
          value: isNaN(y) ? 0 : y
        };
        if (x !== undefined) pt.x = x;
        if (label !== undefined) pt.label = label;
        points.push(pt);
      }
    };

    if (Array.isArray(rawValues)) {
      rawValues.forEach((item, idx) => parseItem(item, idx));
    } else if (typeof rawValues === 'string' && rawValues.trim() !== '') {
      isAllPlainNumbers = false;
      const trimmed = rawValues.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsed.forEach((item, idx) => parseItem(item, idx));
          }
        } catch {
          // fallback to separator
        }
      }
      if (points.length === 0) {
        const sep = trimmed.includes('~') ? '~' : ',';
        const parts = trimmed.split(sep).map(s => s.trim()).filter(Boolean);
        parts.forEach((item, idx) => parseItem(item, idx));
      }
    }

    const scale = (typeof options?.scale === 'number' && options.scale > 0) ? options.scale : 1;
    const finalVal = Math.round(newValue * scale);

    if (points.length === 0) {
      const pt: { x?: number; value: number; label?: string } = { value: finalVal };
      if (!options?.isBarChart && options?.x !== undefined && !isNaN(options.x)) pt.x = options.x;
      if (options?.label !== undefined) pt.label = options.label;
      return [pt];
    }

    const hasExplicitX = !options?.isBarChart && points.some(p => p.x !== undefined);

    if (hasExplicitX) {
      const originalX = points.map((p, idx) => (p.x !== undefined ? p.x : idx));
      points.shift(); // remove oldest
      for (let i = 0; i < points.length; i++) {
        points[i].x = originalX[i];
      }
      const newX = (options?.x !== undefined && !isNaN(options.x)) ? options.x : originalX[originalX.length - 1];
      const newPt: { x?: number; value: number; label?: string } = {
        x: newX,
        value: finalVal
      };
      if (options?.label !== undefined) newPt.label = options.label;
      points.push(newPt);
      return points;
    } else {
      points.shift(); // remove oldest
      const newPt: { value: number; label?: string } = { value: finalVal };
      if (options?.label !== undefined) newPt.label = options.label;
      points.push(newPt);

      if (isAllPlainNumbers && options?.label === undefined) {
        return points.map(p => p.value);
      }
      return points;
    }
  }

  export const GenerateChart = ((options: string | PageDefinition | any): string | undefined => {
    try {
      let title = 'Chart';
      let navigation: Navigation | undefined;
      let color: number | string = 65504; // default yellow
      let yAxisLabel = '';
      let yAxisTicks = '';
      let valuesList: string[] = [];
      let chartType: 'bar' | 'line' = 'bar';

      let rawObj: any = {};
      if (typeof options === 'string') {
        if (options.startsWith('entityUpd~')) return options;
        try {
          rawObj = JSON.parse(options !== '' ? options : '{}');
        } catch {
          rawObj = {};
        }
        navigation = parseNavigationItems(options);
      } else if (typeof options === 'object' && options !== null) {
        rawObj = options;
        if (options.navigation) navigation = options.navigation;
      }

      title = rawObj.title ?? rawObj.heading ?? title;
      if (rawObj.chart) {
        if (rawObj.chart.color !== undefined) color = Color.get(rawObj.chart.color, 65504) ?? 65504;
        if (rawObj.chart.yAxisLabel !== undefined) yAxisLabel = String(rawObj.chart.yAxisLabel);
        if (rawObj.chart.yAxisTicks !== undefined) rawObj.yAxisTicks = rawObj.chart.yAxisTicks;
        if (rawObj.chart.chartType !== undefined) chartType = rawObj.chart.chartType;
        if (rawObj.chart.values !== undefined) rawObj.values = rawObj.chart.values;
        if (rawObj.chart.data !== undefined) rawObj.data = rawObj.chart.data;
      }

      if (rawObj.color !== undefined) {
        color = Color.get(rawObj.color, 65504) ?? 65504;
      }
      if (rawObj.yAxisLabel !== undefined) {
        yAxisLabel = String(rawObj.yAxisLabel);
      } else if (rawObj.unit !== undefined) {
        yAxisLabel = String(rawObj.unit);
      }

      if (rawObj.chartType === 'line' || rawObj.type === 'line' || rawObj.type === 'cardLChart') {
        chartType = 'line';
      }

      const rawValues = rawObj.values ?? rawObj.data;
      const numericVals: number[] = [];
      const parsedPoints: { x: number; y: number; label?: string }[] = [];

      const parseItem = (item: any, idx: number) => {
        if (typeof item === 'object' && item !== null) {
          const yNum = Number(item.value ?? item.y ?? 0);
          const xNum = item.x !== undefined ? Number(item.x) : idx;
          if (!isNaN(yNum)) numericVals.push(yNum);
          parsedPoints.push({
            x: isNaN(xNum) ? idx : xNum,
            y: Math.round(yNum),
            label: item.label !== undefined ? String(item.label) : undefined
          });
        } else if (typeof item === 'number') {
          numericVals.push(item);
          parsedPoints.push({ x: idx, y: Math.round(item) });
        } else if (typeof item === 'string') {
          const s = item.trim();
          let x = idx;
          let y = 0;
          let label: string | undefined = undefined;

          let valPart = s;
          if (valPart.includes('^')) {
            const caretIdx = valPart.indexOf('^');
            label = valPart.substring(caretIdx + 1).trim();
            valPart = valPart.substring(0, caretIdx).trim();
          }

          if (valPart.includes(':')) {
            const colonIdx = valPart.indexOf(':');
            const xStr = valPart.substring(0, colonIdx).trim();
            const yStr = valPart.substring(colonIdx + 1).trim();
            const parsedX = Number(xStr);
            if (!isNaN(parsedX)) x = parsedX;
            const parsedY = Number(yStr);
            if (!isNaN(parsedY)) y = parsedY;
          } else {
            const parsedY = Number(valPart);
            if (!isNaN(parsedY)) y = parsedY;
          }

          numericVals.push(y);
          parsedPoints.push({ x, y: Math.round(y), label });
        }
      };

      if (Array.isArray(rawValues)) {
        rawValues.forEach((item, idx) => parseItem(item, idx));
      } else if (typeof rawValues === 'string' && rawValues !== '') {
        const sep = rawValues.includes('~') ? '~' : ',';
        const parts = rawValues.split(sep).map(s => s.trim()).filter(Boolean);
        parts.forEach((item, idx) => parseItem(item, idx));
      }

      // Ticks calculation
      if (rawObj.yAxisTicks && rawObj.yAxisTicks !== 'auto') {
        if (Array.isArray(rawObj.yAxisTicks)) {
          yAxisTicks = rawObj.yAxisTicks.join(':');
        } else {
          yAxisTicks = String(rawObj.yAxisTicks);
        }
      } else if (rawObj.ticks && rawObj.ticks !== 'auto') {
        if (Array.isArray(rawObj.ticks)) {
          yAxisTicks = rawObj.ticks.join(':');
        } else {
          yAxisTicks = String(rawObj.ticks);
        }
      } else if (numericVals.length > 0) {
        yAxisTicks = calculateChartTicks(numericVals, yAxisLabel);
      } else {
        yAxisTicks = (yAxisLabel === '°C' || yAxisLabel === 'c/kWh') ? '0:50:100:150:200:250' : '0:20:40:60:80:100';
      }

      const tokens: string[] = ['entityUpd', title];
      appendNavigationTokens(tokens, navigation);
      tokens.push(String(color));
      tokens.push(yAxisLabel);
      tokens.push(yAxisTicks);

      if (chartType === 'line') {
        let xAxisTicks = '';
        if (rawObj.xAxisTicks || rawObj.xTicks) {
          const rawXTicks = rawObj.xAxisTicks ?? rawObj.xTicks;
          if (Array.isArray(rawXTicks)) {
            xAxisTicks = rawXTicks.join('+');
          } else {
            let str = String(rawXTicks);
            if (!str.includes('+') && (str.includes(',') || str.includes(':'))) {
              str = str.replace(/[,:]/g, '+');
            }
            xAxisTicks = str;
          }
        } else {
          const labeled = parsedPoints.filter(p => p.label !== undefined);
          if (labeled.length > 0) {
            const list = labeled.map(p => `${p.x}^${p.label}`);
            const minX = parsedPoints.length > 0 ? parsedPoints[0].x : 0;
            if (!list.some(t => t.startsWith(`${minX}^`) || t === `${minX}`)) {
              list.unshift(`${minX}`);
            }
            xAxisTicks = list.join('+');
          } else if (parsedPoints.length > 1) {
            const minX = parsedPoints[0].x;
            const maxX = parsedPoints[parsedPoints.length - 1].x;
            const step = Math.max(Math.round((maxX - minX) / 4), 1);
            const list: string[] = [];
            for (let x = minX; x <= maxX; x += step) {
              list.push(`${x}`);
            }
            xAxisTicks = list.join('+');
          } else {
            xAxisTicks = '0';
          }
        }

        tokens.push(xAxisTicks);

        for (const pt of parsedPoints) {
          tokens.push(`${pt.x}:${pt.y}`);
        }
      } else {
        for (const pt of parsedPoints) {
          const lbl = pt.label ? `^${pt.label}` : '';
          tokens.push(`${pt.y}${lbl}`);
        }
      }

      const result = tokens.join('~');
      // Nextion HMI buffer limit is typically 1024 bytes; truncate safely at field boundary
      if (result.length > 1020) {
        logthis(`chart command truncated (${result.length} chars), reducing data points`);
        // Remove data points from the end until within limit, keeping header and axis ticks
        while (tokens.length > 3 && tokens.join('~').length > 1020) {
          tokens.pop();
        }
        return tokens.join('~');
      }
      return result;
    } catch (err) {
      logthis('failed to generate chart page:', err);
      return undefined;
    }
  });

  // Compatibility facade: popup protocol implementations live in panel/popups.
  export type FanPopupOptions = Popups.FanPopupOptions;
  export const GenerateFanPopup = Popups.GenerateFanPopup;
  export type InputSelectPopupOptions = Popups.InputSelectPopupOptions;
  export const GenerateInputSelectPopup = Popups.GenerateInputSelectPopup;
  export type TimerPopupOptions = Popups.TimerPopupOptions;
  export const GenerateTimerPopup = Popups.GenerateTimerPopup;
  export type LightPopupOptions = Popups.LightPopupOptions;
  export const GenerateLightPopup = Popups.GenerateLightPopup;
  export type ShutterPopupOptions = Popups.ShutterPopupOptions;
  export const GenerateShutterPopup = Popups.GenerateShutterPopup;
  export type ThermoPopupMode = Popups.ThermoPopupMode;
  export type ThermoPopupOptions = Popups.ThermoPopupOptions;
  export const GenerateThermoPopup = Popups.GenerateThermoPopup;

  /**
   * Generate weather page HMI command (cardEntities layout with forecast slots).
   * Uses the same entityUpd protocol as cardEntities but populates slots with
   * current indoor temperature and up to 4 forecast days from Weather.Forecast.
   */
  export function GenerateWeather(
    options: string | PageDefinition | undefined,
    weather: Weather.Forecast | undefined,
    indoorTemp: number | undefined,
    unit: string | undefined,
    navigation?: Navigation
  ): string | undefined {
    try {
      let title = '';
      let nav = navigation ?? { leading: undefined, trailing: undefined };

      if (typeof options === 'string') {
        const json = JSON.parse(options !== '' ? options : '{}');
        title = json['title'] ?? '';
        nav = parseNavigationItems(options) ?? nav;
      } else if (options) {
        title = options.title ?? '';
        nav = options.navigation ?? nav;
      }

      // Build 4 entity slots: indoor temp + 3 forecast days (or 4 days if no indoor)
      const entities: Entity[] = [];
      const metric = unit !== '°F';
      const displayUnit = unit ?? (metric ? '°C' : '°F');
      const forecastTemperature = (value: number) => metric ? Number(value) : Number(value) * 1.8 + 32;

      // Slot 1: Indoor temperature
      if (indoorTemp !== undefined && indoorTemp !== null) {
        const num = typeof indoorTemp === 'number' ? indoorTemp : parseFloat(String(indoorTemp));
        const tempVal = !isNaN(num) ? num.toFixed(1) + displayUnit : String(indoorTemp);
        entities.push({
          type: EntityType.text,
          name: 'indoor_temp',
          icon: 'home-thermometer',
          color: 'white',
          title: 'Indoor',
          value: tempVal
        });
      }

      // Slots 2-4: Forecast days (day0 = today, day1 = tomorrow, day2 = day after)
      const forecastDays = [weather?.day0, weather?.day1, weather?.day2, weather?.day3];
      for (let i = 0; i < 4 && entities.length < 4; i++) {
        const day = forecastDays[i];
        if (!day) continue;
        const typeStr = day.type ? Weather.type_toString(day.type) : undefined;
        const iconName = day.type ? Weather.iconName(day.type) : 'weather-cloudy';
        // Build detailed value string with min/max and wind if available
        let tempStr = '';
        if (day.tempMin !== undefined && day.tempMax !== undefined) {
          tempStr = `${forecastTemperature(day.tempMin).toFixed(0)}…${forecastTemperature(day.tempMax).toFixed(0)}${displayUnit}`;
        } else if (day.temperature !== undefined) {
          tempStr = forecastTemperature(day.temperature).toFixed(1) + displayUnit;
        }
        if (day.windSpeed !== undefined && day.windSpeed > 0) {
          const windVal = metric ? `${Math.round(day.windSpeed)} m/s` : `${Math.round(day.windSpeed * 2.237)} mph`;
          tempStr += ` 💨${windVal}`;
        }
        const dayLabel = day.day ?? (i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `Day ${i}`);
        entities.push({
          type: EntityType.text,
          name: `forecast_day${i}`,
          icon: iconName,
          color: typeStr ? `weather_${typeStr}` : 'white',
          title: dayLabel,
          value: tempStr
        });
      }

      // Pad to 4 slots
      while (entities.length < 4) {
        entities.push({ type: EntityType.delete, name: '', icon: '', title: '', value: '' });
      }

      let entityStr = '';
      for (let i = 0; i < 4; i++) {
        entityStr += (i === 0 ? '' : '~') + GenerateEntity(entities[i]);
      }

      return `entityUpd~${title}~${GenerateNavigation(nav)}~${entityStr}`;
    } catch (err) {
      logthis('failed to generate weather page', err);
      return undefined;
    }
  }

  export const ColorTheme = ((page: Type): string | undefined => {
    switch (page) {
      case Type.screensaver: return 'color~0~65535~65535~64864~65535~65535~65535~65535~65535~65535~65535~65535~65535~15680~65535~65535';
    }
    return undefined;
  });

}
