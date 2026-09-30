Transform your Sonoff NSPanel into a powerful, interactive smart home control center connected to Athom Homey.

This application provides complete bidirectional integration with Sonoff NSPanel running Tasmota and NSPanel Lovelace UI firmware. Control lighting, climate, shutters, media players, security, and smart home scenes directly from your wall.

KEY HIGHLIGHTS

Interactive Touchscreen Cards
- Screensaver: Displays time, date, indoor temperature, outdoor weather forecast (up to 5 days with min/max temperatures and wind speed), and customizable status icons.
- Grid Cards: Up to 6 or 8 interactive touch buttons with dynamic icons, status colors, and targeted actions.
- Entities Cards: Up to 4 devices in a clean list format with toggles, values, and text sensors.
- Thermostat Card: Complete climate control with current temperature, target setpoint, heating and cooling modes, and limits.
- Media Player Card: Title, artist, volume slider, playback controls, shuffle, and source selection.
- Alarm Card: Security keypad with PIN code entry, arm home, arm away, arm night, and disarm actions. Integrated with Homey and Heimdall.
- QR Code Card: Display Wi-Fi guest network credentials or any custom text QR code for visitors.
- Power Flow Card: Live energy dashboard showing Home consumption, Solar generation, Grid import and export, and Battery state.
- Chart Card: Visual line graphs for power, solar, temperature, or humidity trends.
- Unlock Card: PIN-protected security keypad for restricted pages and sensitive smart home functions.

Popup Control Dialogs
- Light Popup: Adjust brightness, RGB color wheel, color temperature, and power states.
- Shutter Popup: Position slider, tilt angle adjustment, and open, close, and stop controls.
- Fan Popup: Speed steps, oscillating mode, and power toggle.
- Input Select Popup: Interactive selection list from dropdown options.
- Timer Popup: Interactive countdown timer with start, pause, and reset.
- Thermostat Popup: Detailed HVAC modes, fan modes, and preset selections.
- Notification Popup: Full-screen popup alerts with custom message, auto-dismiss timeout, optional acoustic beep, and two action buttons.

Security and Night Mode
- PIN Code Protection: Protect sensitive cards and actions with master or individual PIN codes. Flow triggers for correct and failed PIN attempts.
- Night Mode: Automatic dimming and sleep scheduling. Configure active and standby brightness levels for day and night.

NSPanel Studio Visual Editor
- Configure your panel layout directly from Homey App Settings.
- Visual live interactive preview simulating the NSPanel touchscreen.
- Device capability picker to bind Homey lights, thermostats, and sensors with real-time automatic synchronization.

Hardware and Connectivity
- Direct MQTT: High-performance built-in MQTT client with automatic reconnects and low latency.
- External MQTT Client: Fully compatible with the nl.scanno.mqtt Homey application.
- Physical Relays: Independent control and status reporting for the 2 physical hardware switches.
- Temperature Sensor: Live reporting from the internal ADC temperature sensor.
- Onboard Buzzer: Play custom beep signals, alarm sirens, and feedback tones.
- Built-in Weather: Automatic local weather forecasting via MET Norway Locationforecast or custom Homey Flow weather cards.

Comprehensive Flow Support
- Over 60 Flow cards for triggers, conditions, and actions.
- React to physical button presses, touch gestures, slider adjustments, alarm events, and notifications.
- Dynamically update card slots, sensor values, weather data, and screen brightness via Flows.
