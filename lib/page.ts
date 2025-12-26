import { Color } from './color';
import { Icon } from './icon';

export namespace Page {

  export let logthis = ((...args: any[]): void => {});

  export enum Type {
    screensaver, qrcode, media, power, thermostat, notification
  };

  export enum EntityType {
    light, switch, text, button
  };

  export interface Config {
    page: Type,
    options: string | undefined
  }

  export interface NavigationItem {
    target: string | undefined,
    icon: string | undefined,
    color: number | string | Color.RGB | undefined,
    name: string | undefined
  }

  export interface Navigation {
    leading: NavigationItem | undefined,
    trailing: NavigationItem | undefined
  }

  export interface Entity {
    type: EntityType | undefined,
    name: string | undefined,
    icon: string | undefined,
    color: number | string | Color.RGB | undefined,
    title: string | undefined,
    value: boolean | number | string | undefined
  }

  export interface PowerEntity {
    name: string | undefined;
    title: string | undefined;
    icon: string | undefined; 
    color: string | undefined;
    consumption: string | undefined;
    speed: number | undefined;
  }

  function stringToEntityType(type: string|undefined): EntityType | undefined {
    if (typeof type === 'string') {
      switch(type) {
        case 'light': return EntityType.light;
        case 'switch': return EntityType.switch;
        case 'text': return EntityType.text;
        case 'button': return EntityType.button;
      }
    }
    return undefined;
  }

  function EntityTypeToString(type: EntityType): string {
    switch(type) {
      case EntityType.light: return 'light';
      case EntityType.switch: return 'switch';
      case EntityType.text: return 'text';
      case EntityType.button: return 'button';
    }
    return 'text';
  }

  function parseBoolValue(value: string | boolean | number | undefined): boolean | undefined {

    if (typeof value === 'boolean') {
      return value;
    } else if (typeof value === 'string') {
      if (value === '0' || value.toUpperCase() === 'NO' || value.toUpperCase() === 'FALSE' || value.toUpperCase() === 'DISABLED' || value.toUpperCase() === 'OFF')
        return false;
      else if (value === '1' || value.toUpperCase() === 'YES' || value.toUpperCase() === 'TRUE' || value.toUpperCase() === 'ENABLED' || value.toUpperCase() === 'ON')
        return true;
    } else if (typeof value === 'number') {
      return value === 0 ? false : true;
    }

    return undefined;
  }

  function parseIntValue(value: string | boolean | number | undefined, min: number | undefined = undefined, max: number | undefined = undefined): number | undefined {

    let result: number | undefined = undefined;
    if (typeof value === 'boolean') {
      result = value ? 1 : 0;
    } else if (typeof value === 'number') {
      result = value;
    } else if (typeof value === 'string' && value !== '') {
      const converted = parseInt(value);
      if (!isNaN(converted))
        result = converted;
    }

    if (result !== undefined && min !== undefined && result! < min!)
      result = min!;
    else if (result !== undefined && max !== undefined && result! > max!)
      result = max!;

    return result;
  }

  function parseFloatValue(value: string | boolean | number | undefined, min: number | undefined = undefined, max: number | undefined = undefined): number | undefined {

    let result: number | undefined = undefined;
    if (typeof value === 'boolean') {
      result = value ? 1 : 0;
    } else if (typeof value === 'number') {
      result = value;
    } else if (typeof value === 'string' && value !== '') {
      const converted = parseFloat(value);
      if (!isNaN(converted))
        result = converted;
    }
    
    if (result !== undefined && min !== undefined && result! < min!)
      result = min!;
    else if (result !== undefined && max !== undefined && result! > max!)
      result = max!;
    
    return result;
  }

  function parseNavigationItems(options: string | undefined): Navigation {

    const result: Navigation = { leading: undefined, trailing: undefined };

    try {
      const json = JSON.parse(options !== undefined && options !== '' ? options : '{}');

      if (json['nav'] === undefined && json['navigation'] === undefined)
        return result;

      const nav = json['nav'] !== undefined ? json['nav'] : json['navigation'];

      if (nav['left'] !== undefined || nav['leading'] !== undefined) {
        const data = nav['left'] !== undefined ? nav['left']! : nav['leading']!;
        if (data['target'] !== undefined)
          result.leading = { target: data['target'], icon: data['icon'], color: data['color'], name: data['name'] };
      }

      if (nav['right'] !== undefined || nav['trailing'] !== undefined) {
        const data = nav['right'] !== undefined ? nav['right']! : nav['trailing']!;
        if (data['target'] !== undefined)
          result.trailing = { target: data['target'], icon: data['icon'], color: data['color'], name: data['name'] };
      }

    } catch {}

    return result;
  }

  function parseEntities(options: string | undefined): Array<Entity> {

    const result: Array<Entity> = [];

    try {
      const json = JSON.parse(options !== undefined && options !== '' ? options : '{}');

      if (json['entities'] === undefined || typeof json['entities'] === 'string' || typeof json['entities'] === 'number' || json['entities'].length < 1)
        return result;

      for(let i=0;i < json['entities'].length; i++) {
        const item = json['entities'][i];
        const entity: Entity = { type: stringToEntityType(item['type']), name: item['name'], icon: item['icon'], color: item['color'], title: item['title'] ?? '', value: undefined };

        if (entity.name === undefined || entity.name! === '') {
          const entityTitle = entity.title === undefined || entity.title === '' ? ('entity' + i.toString()) : entity.title;
          const entityType = EntityTypeToString(entity.type ?? EntityType.text);
          const entityName = entity.name === undefined || entity.name! === '' ? ( 'i' + (entityType[0].toUpperCase() + entityType.substr(1)) + '.' + entityTitle.toUpperCase()) : entity.name;
          entity.name = entityName;
        }

        let value = item['value'];
        if (typeof value === 'string')
          entity.value = value;
        else if (typeof value === 'number')
          entity.value = value.toString();
        else if (typeof value === 'boolean')
          entity.value = value ? '1' : '0';

        result.push(entity);        
      }

    } catch {}

    return result;
  }

  function GenerateNavigation(navigation: Navigation | undefined): string {

    const leading = navigation !== undefined ? navigation!.leading : undefined;
    const trailing = navigation !== undefined ? navigation!.trailing : undefined;

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

    if (leading !== undefined && leading.target !== undefined) {
      leadingType = 'Nav.Button.prev';
      leadingIcon = leading.icon !== undefined && leading!.icon! !== '' ? Icon.get(leading!.icon!, 'close-box-outline')! : Icon.get('arrow-left-bold')!;
      leadingColor = leading.icon !== undefined && leading!.icon! !== '' ?  (Icon.exists(leading!.icon!) ? (leading!.color !== undefined ? Color.get(leading!.color!, 'white')! : Color.get('not_found')!) : Color.get('white')!) : Color.get('white')!;
      leadingTarget = leading!.target!;
      leadingName = leading.name ?? '';
    }

    if (trailing !== undefined && trailing.target !== undefined) {
      trailingType = 'Nav.Button.next';
      trailingIcon = trailing.icon !== undefined && trailing!.icon! !== '' ? Icon.get(trailing!.icon!, 'close-box-outline')! : Icon.get('arrow-right-bold')!;
      trailingColor = trailing.icon !== undefined && trailing!.icon! !== '' ?  (Icon.exists(trailing!.icon!) ? (trailing!.color !== undefined ? Color.get(trailing!.color!, 'white')! : Color.get('not_found')!) : Color.get('white')!) : Color.get('white')!;
      trailingTarget = trailing!.target!;
      trailingName = trailing.name ?? '';      
    }

    return leadingType + '~' + leadingTarget + '~' + leadingIcon + '~' + (leadingColor < 0 ? '' : leadingColor.toString()) + '~' + leadingName + '~~' +
      trailingType + '~' + trailingTarget + '~' + trailingIcon + '~' + (trailingColor < 0 ? '' : trailingColor.toString()) + '~' + trailingName + '~';
  }

  function GenerateEntity(entity: Entity | undefined): string {

    const entityColor = entity === undefined ? undefined : (entity!.color === undefined ? undefined : Color.get(entity!.color, 'white')!);
    return entity == undefined ? '~~~~~' : (EntityTypeToString(entity!.type ?? EntityType.text) + '~' + entity!.name + '~' + (entity!.icon !== undefined ? Icon.get(entity!.icon!, 'close-box-outline')! : '') + '~' + (entityColor !== undefined ? entityColor.toString() : '65535') + '~' + (entity!.title ?? '') + '~' + (entity!.value ?? ''));
  }

  export const GenerateQRCode = ((options: string | undefined): string | undefined => {

    try {

      const json = JSON.parse(options !== undefined && options !== '' ? options : '{}');
      const navigation = parseNavigationItems(options);
      const entities = parseEntities(options);
      let entityStr = '';

      for(let i=0; i < Math.min(entities.length, 2); i++)
        entityStr += (i === 0 ? '' : '~') + GenerateEntity(entities[i]);

      return 'entityUpd~' + (json['title'] ?? '') + '~' + GenerateNavigation(navigation) + '~' + (json['qrcode'] ?? '') + '~' +
        entityStr;

    } catch(err) {
      logthis('failed to parse qrcode page config', err);
      return undefined;
    }
  });

  export const GenerateMedia = ((options: string | undefined): string | undefined => {

    try {

      const json = JSON.parse(options !== undefined && options !== '' ? options : '{}');
      const navigation = parseNavigationItems(options);
      const entities = parseEntities(options);

      const authorName = json['media'] !== undefined && json['media']['author'] !== undefined ? json['media']['author'] : '';
      const authorColor = json['media'] !== undefined && json['media']['authorcolor'] !== undefined ? Color.get(json['media']['authorcolor'] as string, 'not_found')!.toString() : Color.get('white')!.toString();
      const songName = json['media'] !== undefined && json['media']['title'] !== undefined ? json['media']['title'] : '';
      const songColor = json['media'] !== undefined && json['media']['titlecolor'] !== undefined ? Color.get(json['media']['titlecolor'], 'not_found')!.toString() : Color.get('white')!.toString();
      const volume = (parseIntValue(json['volume'], 0, 100) ?? 0).toString();
      const paused = parseBoolValue(json['paused']) ?? false;
      const onoff = parseBoolValue(json['onoff']);
      const shuffle = parseBoolValue(json['shuffle']);
      const mediaIcon = json['media'] !== undefined && json['media']['icon'] !== undefined ? json['media']['icon'] : 'music';
      const mediaIconColor = json['media'] !== undefined && json['media']['iconcolor'] !== undefined ? Color.get(json['media']['iconcolor'], 'not_found')!.toString() : Color.get('music_cover')!;

      let entityStr = '';

      for(let i=0; i < Math.min(entities.length, 5); i++)
        entityStr += (i === 0 ? '' : '~') + GenerateEntity(entities[i]);

      return 'entityUpd~' + (json['title'] ?? '') + '~' + GenerateNavigation(navigation) + '~' + 
             'media' + '~' + authorName + '~' + authorColor + '~' + songName + '~' + songColor + '~' +
             volume + '~' + //volume
             Icon.get(paused ? 'pause' : 'play') + '~' + // play/pause button
             (onoff !== undefined ? Color.get(onoff! === true ? {red: 255, green: 152, blue: 0} : 1374) : 'disable') + '~' + // onoff color or 'disable' to hide
             (shuffle !== undefined ? Icon.get(shuffle! === true ? 'shuffle' : 'shuffle-disabled')! : 'disable') + '~' + // shuffle icon or 'disable' to hide
             'button.media.cover' + '~' + 'media.music' + '~' + Icon.get(mediaIcon, 'close-box-outline')! + '~' + mediaIconColor + '~~~' + // Music media/cover icon
             entityStr;

    } catch(err) {
      logthis('failed to parse media page config,', err);
      return undefined;
    }
  });

  // format: {title, navigation, power_entities: [{name, title, icon, color, consumption, speed} - max 7, first is "home", speed is ignored for home, speed is -100 - 100]}
  export const GeneratePower = ((options: string | undefined): string | undefined => {

    try {

      const json = JSON.parse(options !== undefined && options !== '' ? options : '{}');
      const navigation = parseNavigationItems(options);
      const entities: Array<PowerEntity> = [];

      if (json['devices'] !== undefined && json['devices'].length > 0) {
        for (let i = 0; i < Math.min(json['devices'].length, 7); i++) {
          let entity: PowerEntity = {
            name: json['devices'][i]['name'] === undefined || json['devices'][i]['name'] === '' ? (json['devices'][i]['name'] + i.toString()) : json['devices'][i]['name'],
            title: json['devices'][i]['title'] !== undefined && json['devices'][i]['title'] !== '' ? json['devices'][i]['title'] : undefined,
            icon: json['devices'][i]['icon'] !== undefined && json['devices'][i]['icon'] !== '' ? json['devices'][i]['icon'] : undefined,
            color: json['devices'][i]['color'] !== undefined && json['devices'][i]['color'] !== '' ? json['devices'][i]['color'] : undefined,
            consumption: json['devices'][i]['consumption'] !== undefined && json['devices'][i]['consumption'] !== '' ? json['devices'][i]['consumption'] : undefined,
            speed: json['devices'][i]['speed'] !== undefined && json['devices'][i]['speed'] !== '' ? parseIntValue(json['devices'][i]['speed'], -100, 100) : undefined,
          }
          entities.push(entity);
        }
      }

      if (entities.length > 0) {

        if (entities[0].icon === undefined)
          entities[0].icon = 'home';

        for(let i = entities.length; i < 7; i++)
          entities.push({
            name: undefined,
            title: undefined,
            icon: undefined,
            color: undefined,
            consumption: undefined,
            speed: undefined
          });
      }

      let entityStr = 'entityUpd~' + (json['title'] ?? '') + '~' + GenerateNavigation(navigation);

      if (entities.length > 0) {
        entityStr += '~' + (entities[0].name ?? '') + '~' + (entities[0].title ?? '') + '~' + Icon.get(entities[0].icon ?? 'home', 'home')! + '~' +
          (entities[0].color === undefined ? Color.get('default')!.toString() : Color.get(entities[0].color!, 'not_found')!.toString()) + '~~' +
          (entities[0].consumption ?? '') + '~~~~~~~' + (entities[0].title ?? '') + '~';
      }

      for (let i = 1; i < entities.length; i++) {

        // Range is -120 to 120, but we use percentage range 0-100 - negative or positive, value is inverted automatically depending on whether it's on left or right side
        const speed = entities[i].speed === undefined ? undefined : (i > 3 ? -Math.round(entities[i].speed! * 1.2) : Math.round(entities[i].speed! * 1.2));

        if (entities[i].icon !== undefined)
          entityStr += '~' + (entities[i].name ?? '') + '~~' + (entities[i].icon === undefined ? '' : Icon.get(entities[i].icon!, 'close-box-outline')!) + '~' +
            (entities[i].color === undefined ? Color.get('default')!.toString() : Color.get(entities[i].color!, 'not_found')!.toString()) + '~' +
            (entities[i].title ?? '') +'~' + (entities[i].consumption ?? '') + '~' + (speed === undefined ? '' : speed!.toString());
        else
          entityStr += '~~~~~~~';
      }

      return entityStr;

    } catch(err) {
      logthis('failed to parse power page config,', err);
      return undefined;
    }

  });

  export const GenerateThermo = ((options: string | undefined, temperature: number | undefined, setpoint: number | undefined, min: number | undefined, max: number | undefined, step: number | undefined, use_celcius: boolean): string | undefined => {

    try {

      const json = JSON.parse(options !== undefined && options !== '' ? options : '{}');
      const navigation = parseNavigationItems(options);
      const temp_current = temperature ?? 0;
      const temp_setpoint = (setpoint ?? 0) * 10;
      const temp_min = (min ?? 15.0) * 10;
      const temp_max = (max ?? 32.0) * 10;
      const temp_step = (step ?? 0.5) * 10;
      const details_page = parseBoolValue(json['details'] ?? 'false') ?? false;

      // mode = auto, heating, cooling, etc..

      let entityStr = 'entityUpd~' + (json['title'] ?? '') + '~' + GenerateNavigation(navigation) + '~~' +
        temp_current.toFixed(1) + ' ' + (use_celcius ? '°C' : '°F') + '~' + temp_setpoint.toFixed(0) + '~~' +
        temp_min.toFixed(0) + '~' + temp_max.toFixed(0) + '~' + temp_step.toFixed(0) + '~';

      entityStr += Icon.get('fire')! + '~' + Color.get('climate_heat')! + '~0~heating~';
      entityStr += Icon.get('fan')! + '~' + Color.get('climate_cool')! + '~0~cooling~';
      entityStr += '~~~~';

      for (let i = 0; i < 5; i++) {
        entityStr += '~~~~';
      }

      entityStr += '~~~' +
        Icon.get(use_celcius ? 'temperature-celsius' : 'temperature-fahrenheit')! + '~~1';

      return entityStr;

    } catch(err) {

      logthis('failed to parse thermo page config,', err);
      return undefined;
    }

  });

/*
cardThermo:
entityUpd~Thermostat~Nav.Button.prev~screensaver~~65535~Screensaver~~Nav.Button.next~screensaver~~65535~Screensaver~Olohuone~olohuone~21.0 °
C~250~Heating~180~300~5~~65535~istate~heat~~~~~~~~~~~~~~~~~~~~~~~~~~~~~current~state~action~~~1

supports 8 entities?
*/

  export const ColorTheme = ((page: Type): string | undefined => {

    switch(page) {
      case Type.screensaver: return 'color~0~65535~65535~64864~65535~65535~65535~65535~65535~65535~65535~65535~65535~15680~65535~65535';
    }

    return undefined;
  });

}
