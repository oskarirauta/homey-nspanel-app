# Sonoff NSPanel for Homey

[![Homey Apps SDK v3](https://img.shields.io/badge/Homey%20SDK-v3-blue.svg)](https://apps.developer.homey.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPLv3-green.svg)](./LICENSE)

Advanced bidirectional integration for **Sonoff NSPanel** running **Tasmota** and **NSPanel Lovelace UI** firmware.

Transform your wall-mounted Sonoff NSPanel into a powerful, interactive smart home control center connected to Athom Homey!

---

## Studio settings and linked devices

Studio has separate **Lepotila** (appearance and displayed sources), **Paneelin toiminnot** (buttons, brightness, night mode and PIN), and **Yhteiset palvelut** sections. The first two affect the selected panel; shared services affect all panels. Settings are applied with the Save button.

Homey links show the last checked connection/capability status. **Tarkista yhteys** refreshes this information without saving. Linked lights expose only the controls supported by their Homey capabilities. Flow-fed light controls remain available independently.

Page order is saved, and renaming a custom page updates Studio navigation references. The default `active` page ID is reserved. External Flow cards that contain a page ID must be updated separately after a rename.

## Flow values and automatic sources

The source selected in Studio owns the displayed value. **Homey**, **internal sensor**, **forecast**, and **MET** values are not replaced by display-value Flow cards. Select **Flow** to supply that value yourself. A fixed value is an initial/manual value and can still be updated through Flow for backwards compatibility.

For example, a Homey-linked light keeps Homey's on/off and brightness values when a display-state Flow runs. With a Flow source, the same card updates the displayed state. Flow may still provide presentation details and unbound secondary fields, such as a fan profile. These display-state cards do not control the linked Homey device; use that device's own Flow actions for control.

This rule concerns value updates. Flow actions which explicitly configure a complete page, operate a relay, control a timer or manage an alarm retain their own behavior. There is no implicit temporary override timer. Source selection is not changed automatically by a value update.

## Shared weather settings

NSPanel Studio uses one application-wide MET Norway weather service. Location and refresh interval under **Yhteiset sääasetukset** apply to every panel; forecast and temperature-chart consumers share the request cache and scheduler. No automatic requests run when no panel uses MET weather. Server cache expiry can postpone a request beyond the selected minimum interval.

Each panel independently selects **MET**, **Flow**, or **no forecast**. Indoor/outdoor temperature bindings remain panel-specific. Flow weather values are not overwritten by the shared MET snapshot. A MET chart also activates the shared service even if that panel's forecast is disabled.

On the first upgrade, the first active MET consumer supplies the initial shared location and interval (otherwise Homey's location and one hour). If panels previously used different locations, check the shared settings once. Saving these settings from any panel changes them for all panels.

Charts with unavailable data show no readings instead of sample readings. The electricity-price preset is a Flow-fed template, not a built-in price provider.

## Features

### 10 Interactive Touchscreen Cards
- **Screensaver**: Time, date, indoor temperature, outdoor weather forecast (up to 5 days with min/max temperatures and wind speed), and 4 customizable status icons.
- **Grid Cards (`cardGrid` & `cardGrid2`)**: 6 or 8 interactive buttons/toggles with dynamic icons, status colors, and targeted actions.
- **Entities Cards (`cardEntities`)**: Up to 4 devices in a vertical list (switches, buttons, text sensors, numbers, lights).
- **Thermostat Card (`cardThermo`)**: Climate control with current temp, target setpoint, heating/cooling modes, and limits.
- **Media Player Card (`cardMedia`)**: Artist, track title, volume slider, play/pause, next/previous, shuffle, and source controls.
- **Alarm Card (`cardAlarm`)**: Keypad with PIN code entry, arm home/away/night, and disarm actions. Integrated with Homey and Heimdall.
- **QR Code Card (`cardQR`)**: Display Wi-Fi guest network credentials or any custom text QR code.
- **Power Flow Card (`cardPower`)**: Live energy flow dashboard (Home, Solar, Grid, Battery).
- **Chart Card (`cardChart`)**: Visual trend line graphs for energy, solar generation, temperature, or humidity.
- **Unlock Card (`cardUnlock`)**: Security keypad with numeric PIN for protecting sensitive functions and restricted pages.

### Dedicated Popup Control Dialogs
- **Light Control (`popupLight`)**: Brightness slider, RGB color wheel, color temperature, and power switch.
- **Shutter / Blind Control (`popupShutter`)**: Position slider, tilt angle adjustment, and open/stop/close buttons.
- **Fan Control (`popupFan`)**: Speed steps, oscillating mode toggle, and power switch.
- **Input Select (`popupInSel`)**: Interactive list for choosing options, scenes, or modes.
- **Timer (`popupTimer`)**: Interactive countdown timer with start, pause, and cancel.
- **Thermostat Details (`popupThermo`)**: Extended HVAC modes, fan modes, and temperature presets.
- **Notifications (`popupNotify`)**: Full-screen message dialogs with optional Action 1 and Action 2 buttons, auto-dismiss timeout, and optional beep sound.

### Security & Night Mode
- **PIN Code Protection**: Secure pages and actions with a Master PIN or individual card PIN codes. Triggers flows on PIN success or failure.
- **Night Mode & Schedules**: Automatic day/night active and standby brightness scheduling, dimming after inactivity, and Flow-based sleep controls.

### NSPanel Studio (Visual Web Editor)
- Built directly into Homey App Settings.
- Visual drag-and-drop page configuration.
- Interactive live display preview simulating the Nextion screen.
- Real-time device capability bindings connecting Homey lights, thermostats, and sensors.

### Connectivity & Hardware
- **Direct MQTT**: Fast, independent built-in MQTT client (no extra Homey apps required).
- **External MQTT**: Full compatibility with `nl.scanno.mqtt` (Scanno MQTT Client).
- **Physical Relays**: Direct control and state reporting for the 2 physical hardware switches.
- **Temperature Sensor**: Live temperature readings from the onboard ADC thermistor.
- **Piezo Buzzer**: Audio feedback, alarm sirens, and notification beeps.
- **Weather Automation**: Built-in MET Norway Locationforecast 2.0 or custom Homey Flow weather cards.

---

## Installation & Setup

1. **Flash Firmware**:
   - Flash your NSPanel with **Tasmota32**, install the Berry driver, and flash the **NSPanel Lovelace UI** TFT display firmware.
   - For step-by-step instructions, see [FIRMWARE.md](./FIRMWARE.md).
2. **Add Device in Homey**:
   - In the Homey app, select **Devices -> (+) Add Device -> Sonoff NSPanel**.
   - Choose your connection mode:
     - **Direct MQTT** (Recommended): Enter your MQTT Broker IP, port, and optional credentials.
     - **Scanno MQTT Client**: Uses the `nl.scanno.mqtt` application installed on Homey.
   - Enter your NSPanel Tasmota topic (or click **Scan** to discover it automatically).
3. **Configure Pages**:
   - Open **Settings -> Sonoff NSPanel** to launch **NSPanel Studio**.
   - Design your page layout, bind Homey devices, and save.

---

## Flow Cards Overview

### When... (Triggers)
- **Physical button pressed**: Relay 1 or 2 pressed (single, double, or hold).
- **Screen button pressed**: A button on a Grid card was touched (*Page, Slot, Value*).
- **Screen switch toggled**: A switch on an Entities card was toggled (*Page, Slot, State*).
- **Light action triggered**: Light was controlled from screen or popup (*Entity, Action, Value*).
- **Shutter action triggered**: Shutter position or tilt was changed (*Entity, Action, Value*).
- **Fan action triggered**: Fan state or speed was adjusted (*Entity, Action, Value*).
- **Thermostat target setpoint changed**: Setpoint adjusted on thermostat card.
- **Thermostat mode changed**: Heating/cooling/auto mode changed.
- **Media action pressed**: Play, pause, volume, or track navigation clicked.
- **Alarm action triggered**: Arm home/away/night or disarm action triggered with PIN.
- **Alarm PIN failed**: Invalid PIN entered on alarm or unlock card.
- **Select action triggered**: Option picked from an input select list.
- **Timer action / finished**: Timer countdown started, stopped, or completed.
- **Notification button clicked**: Button 1 or Button 2 clicked on a popup dialog.
- **Page changed**: Active page navigated on screen.
- **Screensaver entered / exited**: Display entered or exited screensaver mode.
- **Night mode changed**: Night mode turned on or off.
- **Online status changed**: Panel connected or disconnected from MQTT.

### And... (Conditions)
- **Current page is**: Checks if the display is currently showing a specific page.
- **Screensaver is active**: Checks if the panel is in screensaver / sleep mode.
- **Is in night mode**: Checks if night mode is currently active.
- **Panel is online**: Checks if the panel has an active MQTT connection.

### Then... (Actions)
- **Show Page**: Switch directly to any page type (`screensaver`, `grid`, `entities`, `thermo`, `media`, `qrcode`, `power`, `chart`, `alarm`, `unlock`).
- **Show Light / Shutter / Fan / Select / Timer / Thermo Popup**: Open specific interactive control popups.
- **Show Notification**: Display a full-screen notification dialog with action buttons and optional beep.
- **Wake Up Screen**: Forcefully wake the screen, restore brightness, and optionally open a specific page.
- **Set Brightness & Standby**: Adjust active screen brightness and standby dim level.
- **Set Night Mode**: Enable or disable night mode manually or via automation.
- **Set Grid Slot / Entity Slot**: Dynamically update individual slots on cards.
- **Update Slot Value**: Fast single-value text/sensor update without reloading the page.
- **Set Screensaver Weather**: Set outdoor temperature, weather condition/icon, and indoor temperature.
- **Set Screensaver Forecast Day**: Configure Days 1–5 forecast with icon, temp, and day name.
- **Set Screensaver Status Icon**: Set custom status icon and color on screensaver slots (1–4).
- **Push Chart Value / Update Chart**: Feed live energy or sensor trend data to the chart card.
- **Play Buzzer**: Trigger acoustic feedback patterns (single, double, warning, alarm).
- **Set Relay**: Toggle physical relay switches 1 or 2.

---

## Lovelace UI Icon Guide

The app includes built-in support for over 6,900 Material Design Icons supported by the Lovelace UI display font.

👉 **See the complete categorized [Icon Guide (ICONS.md)](./ICONS.md) for full lists and usage examples.**

---

## Development & Testing

Run unit tests and verification checks:
```bash
npm test
npx homey app validate -l publish
npx homey app validate -l verified
```

---

## License

GNU General Public License v3.0 - see [LICENSE](./LICENSE) for details.
