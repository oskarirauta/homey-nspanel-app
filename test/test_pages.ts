import assert from 'assert';
import { Page } from '../lib/page';
import { Color } from '../lib/color';
import { Icon } from '../lib/icon';

console.log('--- Running NSPanel Unit Tests ---');

// 1. Color tests
console.log('Testing Color...');
assert.strictEqual(Color.get('white'), 65535, 'White should be 65535');
assert.strictEqual(Color.get('46521'), 46521, 'Numeric string should parse to 46521');
assert.strictEqual(typeof Color.get('#FF9800'), 'number', 'Hex string should parse to RGB565 number');

// 2. Icon tests
console.log('Testing Icon...');
assert.ok(Icon.exists('lightbulb'), 'lightbulb should exist');
assert.ok(Icon.exists('power'), 'power should exist');
assert.ok(Icon.get('lightbulb') !== '', 'Icon should return glyph string');
assert.strictEqual(Icon.get('non_existent_icon_12345', 'close-box-outline'), Icon.get('close-box-outline'), 'Should fallback to close-box-outline');

// 3. Page Type conversions
console.log('Testing Page.stringToPageType...');
assert.strictEqual(Page.stringToPageType('grid'), Page.Type.grid);
assert.strictEqual(Page.stringToPageType('cardGrid'), Page.Type.grid);
assert.strictEqual(Page.stringToPageType('entities'), Page.Type.entities);
assert.strictEqual(Page.stringToPageType('thermostat'), Page.Type.thermostat);
assert.strictEqual(Page.stringToPageType('alarm'), Page.Type.alarm);
assert.strictEqual(Page.stringToPageType('notification'), Page.Type.notification);

// 4. cardGrid generation
console.log('Testing Page.GenerateGrid...');
const gridOutput = Page.GenerateGrid({
  id: 'test_grid',
  type: Page.Type.grid,
  title: 'Living Room',
  navigation: { leading: { target: 'screensaver' }, trailing: { target: 'screensaver' } },
  entities: [
    { type: Page.EntityType.switch, name: 'slot_1', title: 'Light 1', icon: 'lightbulb', color: 'white', value: '1' },
    { type: Page.EntityType.button, name: 'slot_2', title: 'Scene', icon: 'home', color: 'white', value: '' }
  ]
}, false);

assert.ok(gridOutput, 'Grid output should be generated');
assert.ok(gridOutput.startsWith('entityUpd~Living Room~'), 'Grid output should start with entityUpd~Living Room~');
assert.ok(gridOutput.includes('switch~slot_1~'), 'Grid should include switch slot_1');
assert.ok(gridOutput.includes('button~slot_2~'), 'Grid should include button slot_2');

// 5. cardEntities generation
console.log('Testing Page.GenerateEntities...');
const entitiesOutput = Page.GenerateEntities({
  id: 'test_entities',
  type: Page.Type.entities,
  title: 'Heating Status',
  entities: [
    { type: Page.EntityType.text, name: 'temp_sensor', title: 'Temperature', icon: 'thermometer', value: '21.5 °C' },
    { type: Page.EntityType.switch, name: 'floor_heat', title: 'Floor Heating', icon: 'radiator', value: '1' }
  ]
});

assert.ok(entitiesOutput, 'Entities output should be generated');
assert.ok(entitiesOutput.startsWith('entityUpd~Heating Status~'), 'Entities output should start with entityUpd');
assert.ok(entitiesOutput.includes('text~temp_sensor~'), 'Entities should include text temp_sensor');
assert.ok(entitiesOutput.includes('switch~floor_heat~'), 'Entities should include switch floor_heat');

// 6. cardAlarm generation
console.log('Testing Page.GenerateAlarm...');
const alarmOutput = Page.GenerateAlarm({
  id: 'test_alarm',
  type: Page.Type.alarm,
  title: 'Home Alarm',
  alarm: {
    state: 'disarmed',
    pinRequired: true
  }
});
assert.ok(alarmOutput, 'Alarm output should be generated');
assert.ok(alarmOutput.includes('arm_home') && alarmOutput.includes('arm_away'), 'Alarm should list armed modes when disarmed');
assert.ok(alarmOutput.includes('enable'), 'Numpad should be enabled when PIN required');

// 7. popupNotify generation
console.log('Testing Page.GenerateNotification...');
const notifyOutput = Page.GenerateNotification('Doorbell', 'Front door pressed', 'Dismiss', 'Open', 'white', 'white');
assert.ok(notifyOutput.startsWith('entityUpdateDetail~notify~Doorbell~65535~Dismiss~'), 'Notification should generate entityUpdateDetail format');

// 8. cardPower generation
console.log('Testing Page.GeneratePower...');
const powerOutput = Page.GeneratePower({
  id: 'test_power',
  type: Page.Type.power,
  title: 'Solar & Grid',
  devices: [
    { title: 'Home', icon: 'home', color: 'white', consumption: '1200 W' },
    { title: 'Solar', icon: 'solar-power', color: 'orange', consumption: '3500 W', speed: 45 },
    { title: 'Grid', icon: 'transmission-tower', color: 'red', consumption: '0 W', speed: 0 }
  ]
});
assert.ok(powerOutput, 'Power output should be generated');
const pTokens = powerOutput.split('~');
assert.strictEqual(pTokens.length, 70, `Power output must have exactly 70 tokens, got ${pTokens.length}`);
assert.strictEqual(pTokens[0], 'entityUpd', 'Token 0 must be entityUpd');
assert.strictEqual(pTokens[1], 'Solar & Grid', 'Token 1 must be title');
assert.strictEqual(pTokens[16], Icon.get('home'), 'Token 16 must be Home icon');
assert.strictEqual(pTokens[17], '65535', 'Token 17 must be Home color 65535');
assert.strictEqual(pTokens[19], '1200 W', 'Token 19 must be Home consumption');
assert.strictEqual(pTokens[26], 'Home', 'Token 26 must be Home title');
assert.strictEqual(pTokens[30], Icon.get('solar-power'), 'Token 30 must be Node 0 (Solar) icon');
assert.strictEqual(pTokens[32], 'Solar', 'Token 32 must be Node 0 title');
assert.strictEqual(pTokens[33], '3500 W', 'Token 33 must be Node 0 consumption');
assert.strictEqual(pTokens[34], '-45', 'Token 34 must be Node 0 speed (inverted -45 for left inflow)');
assert.strictEqual(pTokens[37], Icon.get('transmission-tower'), 'Token 37 must be Node 1 (Grid) icon');
assert.strictEqual(pTokens[39], 'Grid', 'Token 39 must be Node 1 title');
assert.strictEqual(pTokens[40], '0 W', 'Token 40 must be Node 1 consumption');
assert.strictEqual(pTokens[41], '0', 'Token 41 must be Node 1 speed');

// 8b. Studio format { home, nodes }
const studioPowerOutput = Page.GeneratePower({
  title: 'Energiavirta',
  home: { title: 'Koti', icon: 'home', color: 'white', consumption: '2.4 kW' },
  nodes: [
    { title: 'Verkko', icon: 'transmission-tower', color: 'orange', consumption: '1.2 kW', speed: 20 },
    { title: 'Akku', icon: 'battery-charging', color: 'green', consumption: '0.8 kW', speed: -15 },
    { title: 'Lämpöpumppu', icon: 'heat-pump', color: 'red', consumption: '0.9 kW', speed: 0 },
    { title: 'Aurinko', icon: 'solar-power', color: 'yellow', consumption: '3.5 kW', speed: 35 },
    { title: 'Sähköauto', icon: 'car-electric', color: 'blue', consumption: '11.0 kW', speed: -45 }
  ]
});
assert.ok(studioPowerOutput, 'Studio power output should be generated');
const sTokens = studioPowerOutput.split('~');
assert.strictEqual(sTokens.length, 70, 'Studio power output must have 70 tokens');
assert.strictEqual(sTokens[1], 'Energiavirta');
assert.strictEqual(sTokens[16], Icon.get('home'));
assert.strictEqual(sTokens[19], '2.4 kW');
assert.strictEqual(sTokens[26], 'Koti');
// Node 0: Left side, speed positive 20 inverted to -20 for Nextion (inflow)
assert.strictEqual(sTokens[30], Icon.get('transmission-tower'));
assert.strictEqual(sTokens[32], 'Verkko');
assert.strictEqual(sTokens[33], '1.2 kW');
assert.strictEqual(sTokens[34], '-20');
// Node 3: Right side, speed positive 35 stays 35 for Nextion (inflow)
assert.strictEqual(sTokens[51], Icon.get('solar-power'));
assert.strictEqual(sTokens[55], '35');
// Node 4: Right side, speed negative -45 stays -45 for Nextion (outflow)
assert.strictEqual(sTokens[58], Icon.get('car-electric'));
assert.strictEqual(sTokens[62], '-45');

// 9. Backward compatibility: raw JSON parsing
console.log('Testing backward compatible JSON input...');
const rawJson = JSON.stringify({
  title: 'WIFI',
  navigation: { leading: { target: 'screensaver' } },
  qrcode: 'WIFI:S:MyNet;P:Secret;;',
  entities: [{ type: 'text', title: 'SSID', value: 'MyNet', icon: 'wifi' }]
});
const qrOutput = Page.GenerateQRCode(rawJson);
assert.ok(qrOutput, 'QR output from JSON should succeed');
// 10. cardChart generation
console.log('Testing Page.GenerateChart...');
assert.strictEqual(Page.stringToPageType('chart'), Page.Type.chart);
assert.strictEqual(Page.stringToPageType('cardChart'), Page.Type.chart);
assert.strictEqual(Page.stringToPageType('cardLChart'), Page.Type.chart);
assert.strictEqual(Page.pageTypeToHmiCommand(Page.Type.chart), 'pageType~cardChart');

// Bar chart test (e.g. spot prices)
const chartBarOutput = Page.GenerateChart({
  title: 'Pörssisähkö',
  navigation: { leading: { target: 'prev' }, trailing: { target: 'next' } },
  color: 'yellow',
  yAxisLabel: 'c/kWh',
  yAxisTicks: [10, 20, 30, 40, 50],
  values: [
    { value: 52, label: '00:00' },
    { value: 48 },
    { value: 75, label: '06:00' },
    { value: 120, label: '12:00' }
  ]
});
assert.ok(chartBarOutput, 'Chart bar output should be generated');
assert.ok(chartBarOutput.startsWith('entityUpd~Pörssisähkö~button~prev~'), 'Should start with entityUpd and nav');
assert.ok(chartBarOutput.includes('c/kWh~10:20:30:40:50~52^00:00~48~75^06:00~120^12:00'), 'Should contain unit, ticks and formatted values');

// Line chart test with explicit x:y and xAxisTicks
const chartLineOutput = Page.GenerateChart({
  title: 'Lämpötila',
  chartType: 'line',
  color: 'blue',
  yAxisLabel: '°C',
  yAxisTicks: '0:10:20:30',
  xAxisTicks: '0^00:00+12^12:00+24^24:00',
  values: ['0:15', '12:22^12:00', '24:18']
});
assert.ok(chartLineOutput, 'Chart line output should be generated');
assert.ok(chartLineOutput.includes('°C~0:10:20:30~0^00:00+12^12:00+24^24:00~0:15~12:22~24:18'), 'Line chart should contain plus-separated xAxisTicks and x:y point pairs');

// Line chart test with auto-indexing values without explicit x:
const chartLineAutoOutput = Page.GenerateChart({
  title: 'Kulutus',
  chartType: 'line',
  color: 'yellow',
  yAxisLabel: 'W',
  values: [
    { value: 500, label: '00:00' },
    { value: 800 },
    { value: 1200, label: '06:00' }
  ]
});
assert.ok(chartLineAutoOutput, 'Auto-indexed line chart should be generated');
assert.ok(chartLineAutoOutput.includes('0^00:00+2^06:00~0:500~1:800~2:1200'), 'Line chart should auto-assign x index and create x-ticks from labels');

// 11. popupFan & EntityType.fan generation
console.log('Testing Page.GenerateFanPopup & EntityType.fan...');
assert.strictEqual(Page.stringToEntityType('fan'), Page.EntityType.fan, 'String fan should convert to EntityType.fan');
assert.strictEqual(Page.EntityTypeToString(Page.EntityType.fan), 'fan', 'EntityType.fan should convert to string fan');

// Fan entity generation on entities page
const fanEntityPage = Page.GenerateEntities({
  id: 'test_fan_page',
  type: Page.Type.entities,
  title: 'Ilmanvaihto',
  entities: [
    { type: Page.EntityType.fan, id: 'ventilation', name: 'ventilation', title: 'Ilmanvaihtokone', icon: 'fan', color: 'cyan', value: 'Kotona' }
  ]
});
assert.ok(fanEntityPage, 'Entities page with fan should generate');
assert.ok(fanEntityPage.includes('fan~ventilation~'), 'Entities page should contain fan~ventilation');

// Fan popup generation with slider and modes
const fanPopupOutput = Page.GenerateFanPopup({
  entityId: 'ventilation',
  iconColor: 'cyan',
  buttonState: true,
  speed: 2,
  maxSpeed: 4,
  label: 'Nopeus',
  currentMode: 'Kotona',
  modes: ['Poissa', 'Kotona', 'Tehostus', 'Takkatila']
});
assert.ok(fanPopupOutput, 'Fan popup output should be generated');
assert.ok(fanPopupOutput.startsWith('entityUpdateDetail~ventilation~~'), 'Fan popup should start with entityUpdateDetail~ventilation~~');
const fanTokens = fanPopupOutput.split('~');
assert.strictEqual(fanTokens[1], 'ventilation', 'Token 1 should be entityId');
assert.strictEqual(fanTokens[4], '1', 'Token 4 should be buttonState 1 (on)');
assert.strictEqual(fanTokens[5], '2', 'Token 5 should be speed 2');
assert.strictEqual(fanTokens[6], '4', 'Token 6 should be maxSpeed 4');
assert.strictEqual(fanTokens[7], 'Nopeus', 'Token 7 should be label');
assert.strictEqual(fanTokens[8], 'Kotona', 'Token 8 should be currentMode');
assert.strictEqual(fanTokens[9], 'Poissa?Kotona?Tehostus?Takkatila', 'Token 9 should be question-mark separated modes');

// Fan popup with slider disabled (modes only)
const fanPopupModesOnly = Page.GenerateFanPopup({
  entityId: 'iv_kone',
  iconColor: 'white',
  buttonState: false,
  speed: 'disable',
  currentMode: 'Auto',
  modes: 'Auto?Manuaali?Yö'
});
const mTokens = fanPopupModesOnly.split('~');
assert.strictEqual(mTokens[4], '0', 'ButtonState should be 0 (off)');
assert.strictEqual(mTokens[5], 'disable', 'Speed should be disable');
assert.strictEqual(mTokens[8], 'Auto');
assert.strictEqual(mTokens[9], 'Auto?Manuaali?Yö');

// 12. Smart Auto-Scaling: calculateChartTicks
console.log('Testing Page.calculateChartTicks...');
const tempTicks = Page.calculateChartTicks([195, 202, 214, 225], '°C');
assert.ok(tempTicks.includes('190') && tempTicks.includes('230'), 'Temperature ticks should bound 195..225');

const powerTicks = Page.calculateChartTicks([150, 420, 1850], 'W');
assert.strictEqual(powerTicks, '0:500:1000:1500:2000', 'Power ticks should start at 0 with 500W steps');

const emptyTicks = Page.calculateChartTicks([], 'W');
assert.strictEqual(emptyTicks, '0:20:40:60:80:100', 'Empty values should return default ticks');

// 13. GenerateChart with auto ticks
const autoTicksChart = Page.GenerateChart({
  title: 'Teho Automaattiasteikolla',
  chartType: 'line',
  unit: 'W',
  color: 'yellow',
  values: [250, 450, 950, 1400]
});
assert.ok(autoTicksChart, 'Chart with auto ticks should generate');
// 14. FIFO rolling buffer: shiftChartValues
console.log('Testing Page.shiftChartValues...');
// 14a. Line chart with explicit X positions
const initialLinePoints = [
  { value: 10, x: 0 },
  { value: 5, x: 50 },
  { value: 8, x: 100 }
];
const shiftedLine = Page.shiftChartValues(initialLinePoints, 12);
assert.strictEqual(shiftedLine.length, 3, 'Shifted line chart should maintain 3 points');
assert.deepStrictEqual(shiftedLine[0], { value: 5, x: 0 }, 'Point 1 should shift to x=0 with value=5');
assert.deepStrictEqual(shiftedLine[1], { value: 8, x: 50 }, 'Point 2 should shift to x=50 with value=8');
assert.deepStrictEqual(shiftedLine[2], { value: 12, x: 100 }, 'New point should occupy rightmost x=100 with value=12');

// 14b. Line chart with custom X and label
const shiftedCustomX = Page.shiftChartValues(initialLinePoints, 15, { x: 120, label: '14:00' });
assert.deepStrictEqual(shiftedCustomX[2], { value: 15, x: 120, label: '14:00' }, 'Custom x and label should be assigned');

// 14c. Bar chart with fixed slots (X ignored)
const initialBars = [10, 20, 30];
const shiftedBars = Page.shiftChartValues(initialBars, 40, { isBarChart: true, x: 999 });
assert.deepStrictEqual(shiftedBars, [20, 30, 40], 'Bar chart should drop oldest bar, shift slots left, and append 40 (ignoring x)');

// 14d. String input parsing with tilde separator
const shiftedFromString = Page.shiftChartValues('0:10~50:5~100:8', 12);
assert.deepStrictEqual(shiftedFromString[0], { value: 5, x: 0 }, 'String input should parse and shift');
assert.deepStrictEqual(shiftedFromString[2], { value: 12, x: 100 }, 'New point appended with shifted x');

// 15. popupInSel & EntityType.input_sel generation
console.log('Testing Page.GenerateInputSelectPopup & EntityType.input_sel...');
assert.strictEqual(Page.stringToEntityType('input_sel'), Page.EntityType.input_sel, 'String input_sel should convert to EntityType.input_sel');
assert.strictEqual(Page.stringToEntityType('select'), Page.EntityType.input_sel, 'String select should convert to EntityType.input_sel');
assert.strictEqual(Page.EntityTypeToString(Page.EntityType.input_sel), 'input_sel', 'EntityType.input_sel should convert to string input_sel');

const inputSelEntityPage = Page.GenerateEntities({
  id: 'test_modes_page',
  type: Page.Type.entities,
  title: 'Kodin tilat',
  entities: [
    { type: Page.EntityType.input_sel, id: 'home_mode', name: 'home_mode', title: 'Kodin tila', icon: 'home', color: 'green', value: 'Kotona' }
  ]
});
assert.ok(inputSelEntityPage, 'Entities page with input_sel should generate');
assert.ok(inputSelEntityPage.includes('input_sel~home_mode~'), 'Entities page should contain input_sel~home_mode');

const inputSelPopup = Page.GenerateInputSelectPopup({
  entityId: 'home_mode',
  iconColor: 'cyan',
  title: 'Kodin tila',
  currentMode: 'Kotona',
  modes: ['Kotona', 'Poissa', 'Nukkumassa', 'Loma']
});
assert.ok(inputSelPopup, 'Input select popup should generate');
assert.ok(inputSelPopup.startsWith('entityUpdateDetail2~home_mode~~'), 'Should start with entityUpdateDetail2~home_mode~~');
const selTokens = inputSelPopup.split('~');
assert.strictEqual(selTokens[1], 'home_mode', 'Token 1 should be entityId');
assert.strictEqual(selTokens[4], 'Kodin tila', 'Token 4 should be title');
assert.strictEqual(selTokens[5], 'Kotona', 'Token 5 should be currentMode');
assert.strictEqual(selTokens[6], 'Kotona?Poissa?Nukkumassa?Loma', 'Token 6 should be question-mark separated options');

// 16. popupTimer & EntityType.timer generation
console.log('Testing Page.GenerateTimerPopup & EntityType.timer...');
assert.strictEqual(Page.stringToEntityType('timer'), Page.EntityType.timer, 'String timer should convert to EntityType.timer');
assert.strictEqual(Page.EntityTypeToString(Page.EntityType.timer), 'timer', 'EntityType.timer should convert to string timer');

const timerEntityPage = Page.GenerateEntities({
  id: 'test_timer_page',
  type: Page.Type.entities,
  title: 'Ajastimet',
  entities: [
    { type: Page.EntityType.timer, id: 'kitchen_timer', name: 'kitchen_timer', title: 'Keittiöajastin', icon: 'timer', color: 'yellow', value: '05:00' }
  ]
});
assert.ok(timerEntityPage, 'Entities page with timer should generate');
assert.ok(timerEntityPage.includes('timer~kitchen_timer~'), 'Entities page should contain timer~kitchen_timer');

// Timer popup generation (idle)
const timerIdlePopup = Page.GenerateTimerPopup({
  entityId: 'kitchen_timer',
  iconColor: 'yellow',
  minutes: 5,
  seconds: 0,
  editable: 1,
  action2: 'start',
  label2: 'START'
});
assert.ok(timerIdlePopup, 'Timer idle popup should generate');
assert.ok(timerIdlePopup.startsWith('entityUpdateDetail~kitchen_timer~~'), 'Should start with entityUpdateDetail~kitchen_timer~~');
const tTokens = timerIdlePopup.split('~');
assert.strictEqual(tTokens[1], 'kitchen_timer', 'Token 1 should be entityId');
assert.strictEqual(tTokens[4], 'kitchen_timer', 'Token 4 should be entityId/name');
assert.strictEqual(tTokens[5], '5', 'Token 5 should be minutes 5');
assert.strictEqual(tTokens[6], '0', 'Token 6 should be seconds 0');
assert.strictEqual(tTokens[7], '1', 'Token 7 should be editable 1');
assert.strictEqual(tTokens[8], '', 'Token 8 action1 should be empty');
assert.strictEqual(tTokens[9], 'start', 'Token 9 action2 should be start');
assert.strictEqual(tTokens[12], 'START', 'Token 12 label2 should be START');

// Timer popup generation (running)
const timerRunningPopup = Page.GenerateTimerPopup({
  entityId: 'kitchen_timer',
  iconColor: 'green',
  minutes: 4,
  seconds: 32,
  editable: 0,
  action1: 'pause',
  action2: 'cancel',
  action3: 'finish',
  label1: 'PAUSE',
  label2: 'CANCEL',
  label3: 'STOP'
});
const rTokens = timerRunningPopup.split('~');
assert.strictEqual(rTokens[5], '4', 'Token 5 should be minutes 4');
assert.strictEqual(rTokens[6], '32', 'Token 6 should be seconds 32');
assert.strictEqual(rTokens[7], '0', 'Token 7 editable should be 0');
assert.strictEqual(rTokens[8], 'pause', 'Token 8 action1 should be pause');
assert.strictEqual(rTokens[9], 'cancel', 'Token 9 action2 should be cancel');
assert.strictEqual(rTokens[10], 'finish', 'Token 10 action3 should be finish');
assert.strictEqual(rTokens[11], 'PAUSE', 'Token 11 label1 should be PAUSE');
assert.strictEqual(rTokens[12], 'CANCEL', 'Token 12 label2 should be CANCEL');
assert.strictEqual(rTokens[13], 'STOP', 'Token 13 label3 should be STOP');

// 17. popupLight & Page.GenerateLightPopup generation & Color helpers
console.log('Testing Page.GenerateLightPopup & Color helpers...');
assert.strictEqual(Color.rgb_to_565(255, 255, 255), 65535, 'White should be 65535');
const rgbColor = Color.hsv_to_rgb(0, 1, 1);
assert.strictEqual(rgbColor.red, 255);
assert.strictEqual(rgbColor.green, 0);
assert.strictEqual(rgbColor.blue, 0);

// Color wheel coordinate parsing
const hsvCoord = Color.pos_to_hsv(160, 80, 160);
assert.strictEqual(hsvCoord.hue, 0);
assert.strictEqual(hsvCoord.saturation, 1);

// Light popup generation (full RGB + Dimmer + Temp)
const lightFullPopup = Page.GenerateLightPopup({
  entityId: 'livingroom_light',
  iconColor: 'yellow',
  buttonState: true,
  brightness: 80,
  colorTemp: 45,
  colorMode: true,
  colorTranslation: 'Väri',
  colorTempTranslation: 'Lämpötila',
  brightnessTranslation: 'Kirkkaus'
});
assert.ok(lightFullPopup, 'Light popup payload should generate');
assert.ok(lightFullPopup.startsWith('entityUpdateDetail~livingroom_light~~'), 'Should start with entityUpdateDetail~livingroom_light~~');
const lTokens = lightFullPopup.split('~');
assert.strictEqual(lTokens[1], 'livingroom_light', 'Token 1 entityId');
assert.strictEqual(lTokens[4], '1', 'Token 4 buttonState 1');
assert.strictEqual(lTokens[5], '80', 'Token 5 brightness 80');
assert.strictEqual(lTokens[6], '45', 'Token 6 colorTemp 45');
assert.strictEqual(lTokens[7], 'enable', 'Token 7 colorMode enable');
assert.strictEqual(lTokens[8], 'Väri', 'Token 8 colorTranslation');
assert.strictEqual(lTokens[9], 'Lämpötila', 'Token 9 colorTempTranslation');
assert.strictEqual(lTokens[10], 'Kirkkaus', 'Token 10 brightnessTranslation');
assert.strictEqual(lTokens[11], 'disable', 'Token 11 effectSupported disable');

// Light popup generation (simple dimmer only)
const lightDimmerOnly = Page.GenerateLightPopup({
  entityId: 'kitchen_spots',
  buttonState: false,
  brightness: 50,
  colorTemp: 'disable',
  colorMode: false
});
const dTokens = lightDimmerOnly.split('~');
assert.strictEqual(dTokens[4], '0', 'ButtonState off');
assert.strictEqual(dTokens[5], '50', 'Brightness 50');
assert.strictEqual(dTokens[6], 'disable', 'ColorTemp disable');
// 18. popupShutter & Page.GenerateShutterPopup generation & EntityType.shutter
console.log('Testing Page.GenerateShutterPopup & EntityType.shutter...');
assert.strictEqual(Page.stringToEntityType('shutter'), Page.EntityType.shutter);
assert.strictEqual(Page.stringToEntityType('cover'), Page.EntityType.shutter);
assert.strictEqual(Page.stringToEntityType('curtain'), Page.EntityType.shutter);
assert.strictEqual(Page.stringToEntityType('blind'), Page.EntityType.shutter);
assert.strictEqual(Page.EntityTypeToString(Page.EntityType.shutter), 'shutter');

// Shutter with position & tilt
const shutterFull = Page.GenerateShutterPopup({
  entityId: 'living_blinds',
  pos: 65,
  infoText: '65 %',
  posHeading: 'Asento',
  icon: 'window-shutter',
  statusUp: 'enable',
  statusStop: 'enable',
  statusDown: 'enable',
  tiltHeading: 'Säleet',
  tilt: 40
});
assert.ok(shutterFull, 'Shutter popup payload should generate');
assert.ok(shutterFull.startsWith('entityUpdateDetail~living_blinds~65~65 %~Asento~'), 'Should start with correct header');
const sfTokens = shutterFull.split('~');
assert.strictEqual(sfTokens[1], 'living_blinds', 'Token 1 entityId');
assert.strictEqual(sfTokens[2], '65', 'Token 2 posVal 65');
assert.strictEqual(sfTokens[3], '65 %', 'Token 3 infoText');
assert.strictEqual(sfTokens[4], 'Asento', 'Token 4 posHeading');
assert.strictEqual(sfTokens[9], 'enable', 'Token 9 statusUp');
assert.strictEqual(sfTokens[10], 'enable', 'Token 10 statusStop');
assert.strictEqual(sfTokens[11], 'enable', 'Token 11 statusDown');
assert.strictEqual(sfTokens[12], 'Säleet', 'Token 12 tiltHeading');
assert.strictEqual(sfTokens[16], 'enable', 'Token 16 statusTiltLeft');
assert.strictEqual(sfTokens[17], 'enable', 'Token 17 statusTiltStop');
assert.strictEqual(sfTokens[18], 'enable', 'Token 18 statusTiltRight');
assert.strictEqual(sfTokens[19], '40', 'Token 19 tiltVal 40');

// Simple roller shutter (no tilt)
const shutterRoller = Page.GenerateShutterPopup({
  entityId: 'kitchen_shutter',
  pos: 0
});
const srTokens = shutterRoller.split('~');
assert.strictEqual(srTokens[1], 'kitchen_shutter');
assert.strictEqual(srTokens[2], '0');
assert.strictEqual(srTokens[16], '', 'Tilt left should be hidden when tilt is disabled');
assert.strictEqual(srTokens[19], 'disable', 'Tilt slider should be disabled');

// Entity generation with shutter type for cardEntities
const shutterEntityStr = Page.GenerateEntity({
  type: Page.EntityType.shutter,
  name: 'bedroom_shutter',
  title: 'Makuuhuoneen kaihdin',
  icon: 'window-shutter'
});
assert.ok(shutterEntityStr.startsWith('shutter~bedroom_shutter~'), 'Entity string starts with shutter');
assert.ok(shutterEntityStr.includes('|enable|enable|enable'), 'Entity value contains inline up/stop/down buttons');

// 19. cardAlarm & Page.GenerateAlarm generation
console.log('Testing Page.GenerateAlarm...');

// Disarmed default (English)
const alarmDefault = Page.GenerateAlarm({
  title: 'Security',
  alarm: { state: 'disarmed', pinRequired: true }
});
assert.ok(alarmDefault, 'Alarm payload should generate');
assert.ok(alarmDefault.startsWith('entityUpd~Security~'), 'Header should match title');
const aTokens = alarmDefault.split('~');
assert.strictEqual(aTokens[14], 'alarm_panel', 'Token 14 entityId');
assert.strictEqual(aTokens[15], 'Home', 'Token 15 mode 1 label');
assert.strictEqual(aTokens[16], 'arm_home', 'Token 16 mode 1 action');
assert.strictEqual(aTokens[17], 'Away', 'Token 17 mode 2 label');
assert.strictEqual(aTokens[18], 'arm_away', 'Token 18 mode 2 action');
assert.strictEqual(aTokens[19], 'Night', 'Token 19 mode 3 label');
assert.strictEqual(aTokens[20], 'arm_night', 'Token 20 mode 3 action');
assert.strictEqual(aTokens[23], Icon.get('shield-off'), 'Shield off icon when disarmed');
assert.strictEqual(aTokens[25], 'enable', 'Numpad enabled');
assert.strictEqual(aTokens[26], 'disable', 'Flashing disabled');

// Finnish language disarmed
const alarmFi = Page.GenerateAlarm({
  title: 'Hälytin',
  alarm: { state: 'disarmed', language: 'fi' }
});
const fiTokens = alarmFi!.split('~');
assert.strictEqual(fiTokens[15], 'Kotona');
assert.strictEqual(fiTokens[17], 'Poissa');
assert.strictEqual(fiTokens[19], 'Yö');

// Armed away (normalized from Homey state 'armed')
const alarmArmed = Page.GenerateAlarm({
  title: 'Hälytin',
  alarm: { state: 'armed', language: 'fi' }
});
const arTokens = alarmArmed!.split('~');
assert.strictEqual(arTokens[15], 'Pois', 'Armed state has single disarm button in Finnish');
assert.strictEqual(arTokens[16], 'disarm');
assert.strictEqual(arTokens[23], Icon.get('shield-lock'), 'Shield lock icon when armed away');
assert.strictEqual(arTokens[25], 'enable', 'Numpad enabled for PIN');

// Partially armed (normalized from Homey state 'partially_armed')
const alarmPart = Page.GenerateAlarm({
  title: 'Hälytin',
  alarm: { state: 'partially_armed', language: 'fi' }
});
const partTokens = alarmPart!.split('~');
assert.strictEqual(partTokens[23], Icon.get('shield-home'), 'Shield home icon when partially armed');

// Triggered state
const alarmTrig = Page.GenerateAlarm({
  title: 'Hälytys!',
  alarm: { state: 'triggered', language: 'fi' }
});
const trigTokens = alarmTrig!.split('~');
assert.strictEqual(trigTokens[23], Icon.get('bell-ring'), 'Bell icon when triggered');
assert.strictEqual(trigTokens[26], 'enable', 'Flashing enabled when triggered');

// Custom label overrides & JSON string input
const alarmCustom = Page.GenerateAlarm(JSON.stringify({
  title: 'Mökki',
  state: 'disarmed',
  pin_required: false,
  language: 'fi',
  labels: { arm_away: 'Lukitse', arm_home: 'Sisätila' }
}));
const cTokens = alarmCustom!.split('~');
assert.strictEqual(cTokens[15], 'Sisätila');
assert.strictEqual(cTokens[17], 'Lukitse');
// 20. popupThermo & Page.GenerateThermoPopup generation
console.log('Testing Page.GenerateThermoPopup & cardThermo detail...');
assert.strictEqual(Page.stringToEntityType('thermo'), Page.EntityType.thermostat);
assert.strictEqual(Page.stringToEntityType('thermostat'), Page.EntityType.thermostat);
assert.strictEqual(Page.EntityTypeToString(Page.EntityType.thermo), 'text');
assert.strictEqual(Page.EntityTypeToString(Page.EntityType.thermostat), 'text');

// Test cardThermo with entityId
const thermoCardPayload = Page.GenerateThermo(
  JSON.stringify({ id: 'living_thermo', title: 'Olohuone' }),
  21.5,
  22.0,
  15,
  30,
  0.5,
  true
);
assert.ok(thermoCardPayload, 'Thermo card payload should generate');
const tcTokens = thermoCardPayload!.split('~');
assert.strictEqual(tcTokens[1], 'Olohuone', 'Token 1 title');
assert.strictEqual(tcTokens[14], 'living_thermo', 'Token 14 entityId for popupThermo detail opening');
assert.strictEqual(tcTokens[tcTokens.length - 1], '1', 'Last token detail button enabled');

// Test GenerateThermoPopup (flat options)
const thermoPopupPayload = Page.GenerateThermoPopup({
  entityId: 'living_thermo',
  icon: 'thermometer',
  heading1: 'Toimintatila',
  type1: 'operation_mode',
  currentMode1: 'Lämmitys',
  modeList1: ['Auto', 'Lämmitys', 'Viilennys', 'Pois'],
  heading2: 'Esiasetus',
  type2: 'preset_mode',
  currentMode2: 'Koti',
  modeList2: 'Koti?Säästö?Mukavuus?Tehostus',
  heading3: 'Puhallin',
  type3: 'fan_mode',
  currentMode3: 'Auto',
  modeList3: 'Auto?Matala?Keski?Korkea'
});
assert.ok(thermoPopupPayload, 'Thermo popup payload should generate');
const tpTokens = thermoPopupPayload.split('~');
assert.strictEqual(tpTokens[0], 'entityUpdateDetail');
assert.strictEqual(tpTokens[1], 'living_thermo');
assert.strictEqual(tpTokens[2], Icon.get('thermometer'));
assert.strictEqual(tpTokens[4], 'Toimintatila');
assert.strictEqual(tpTokens[5], 'operation_mode');
assert.strictEqual(tpTokens[6], 'Lämmitys');
assert.strictEqual(tpTokens[7], 'Auto?Lämmitys?Viilennys?Pois');
assert.strictEqual(tpTokens[8], 'Esiasetus');
assert.strictEqual(tpTokens[9], 'preset_mode');
assert.strictEqual(tpTokens[10], 'Koti');
assert.strictEqual(tpTokens[11], 'Koti?Säästö?Mukavuus?Tehostus');
assert.strictEqual(tpTokens[12], 'Puhallin');
assert.strictEqual(tpTokens[13], 'fan_mode');
assert.strictEqual(tpTokens[14], 'Auto');
assert.strictEqual(tpTokens[15], 'Auto?Matala?Keski?Korkea');

// Test GenerateThermoPopup (nested structured options and default fallback)
const thermoPopupNested = Page.GenerateThermoPopup({
  entityId: 'bedroom_thermo',
  mode1: { heading: 'Tila', type: 'mode', currentMode: 'Heat', modes: 'Auto,Heat,Off' }
});
const tpnTokens = thermoPopupNested.split('~');
assert.strictEqual(tpnTokens[1], 'bedroom_thermo');
assert.strictEqual(tpnTokens[4], 'Tila');
assert.strictEqual(tpnTokens[5], 'mode');
assert.strictEqual(tpnTokens[6], 'Heat');
assert.strictEqual(tpnTokens[7], 'Auto?Heat?Off');
assert.strictEqual(tpnTokens[8], '', 'Empty row 2 heading');
assert.strictEqual(tpnTokens[11], '', 'Empty row 2 modes (hidden on Nextion)');

// 21. GenerateWeather page generation
console.log('Testing Page.GenerateWeather...');
const weatherForecast: any = {
  day0: { type: 'sunny', temperature: 21.5, day: 'Today' },
  day1: { type: 'cloudy', temperature: 18.0, day: 'Tomorrow' },
  day2: { type: 'rainy', temperature: 15.5, day: 'Wed' },
  day3: { type: 'partly_cloudy', temperature: 17.0, day: 'Thu' }
};
const weatherCmd = Page.GenerateWeather(
  JSON.stringify({ title: 'Weather' }),
  weatherForecast,
  22.5,
  '°C'
);
assert.ok(weatherCmd, 'Weather page command should generate');
const wTokens = weatherCmd!.split('~');
assert.strictEqual(wTokens[0], 'entityUpd', 'Weather uses entityUpd protocol');
assert.strictEqual(wTokens[1], 'Weather', 'Title token');
// Verify indoor temp slot exists and contains temperature value
const indoorSlot = wTokens.slice(3).join('~');
assert.ok(indoorSlot.includes('22.5'), 'Indoor temperature included in output');
assert.ok(indoorSlot.includes('21.5'), 'Forecast day0 temperature included');

console.log('✅ ALL TESTS PASSED SUCCESSFULLY!');


