# Sonoff NSPanel Firmware Installation & Flashing Guide
# Sonoff NSPanel Laiteohjelmiston Asennus- ja Flashausohje

This guide provides complete instructions for flashing your Sonoff NSPanel (EU or US version) with **Tasmota**, installing the **Berry Driver**, and flashing the **Nextion TFT Display** with the **NSPanel Lovelace UI** firmware.

Tämä ohje sisältää täydelliset vaiheittaiset ohjeet Sonoff NSPanelin (EU- tai US-versio) flashaamiseen **Tasmota**-laiteohjelmistolla, **Berry-ajurin** asentamiseen ja **Nextion TFT -näytön** päivittämiseen **NSPanel Lovelace UI** -firmwarella.

---

## 1. Required Hardware / Tarvittavat laitteet

1. **Sonoff NSPanel** (EU or US model)
2. **USB-to-Serial UART Adapter** (e.g. FTDI FT232RL, CP2102, or CH340)
   > [!CAUTION]
   > **Voltage warning:** The NSPanel ESP32 logic operates strictly at **3.3V**. Ensure your USB-UART adapter is set to **3.3V**, NEVER 5V! Connecting 5V to VCC or GPIO pins will permanently destroy the ESP32.
   > **Jännitevaroitus:** NSPanelin ESP32 käyttää ehdottomasti **3.3V** logiikkaa. Varmista, että FTDI/UART-adapterisi on asetettu **3.3V** tilaan (EI 5V)! 5V jännite tuhoaa laitteen pysyvästi.
3. **DuPont jumper wires** (4 wires: 3.3V, GND, TX, RX)
4. Small Phillips screwdriver and plastic prying tool to open the NSPanel case.

---

## 2. Disassembly & Pinout / Purkaminen ja kytkentä

1. Separate the display unit from the high-voltage relay base (carefully pull apart).
   * **Do NOT work on the device while connected to mains AC power (110V/230V)!**
   * **ÄLÄ KOSKAAN avaa tai kytke laitetta sen ollessa kytkettynä verkkovirtaan (230V)!**
2. Remove the screws holding the display PCB.
3. Locate the programming header pads on the back of the display unit PCB:

| NSPanel Pad | USB-UART Adapter Pin |
|---|---|
| **3V3** | 3.3V VCC |
| **GND** | GND |
| **TX** | RXD (adapter's RX) |
| **RX** | TXD (adapter's TX) |
| **IO0** | Connect to **GND** while powering on to enter bootloader mode |

> [!TIP]
> To enter flashing mode (bootloader): Hold **IO0** connected to **GND**, plug the USB adapter into your computer, wait 2 seconds, then disconnect IO0 from GND.
> Siirtyäksesi lataustilaan: Pidä **IO0** kytkettynä **GND**-pinniin, kytke USB-adapteri tietokoneeseen, odota 2 sekuntia ja irrota IO0 GND:stä.

---

## 3. Flashing Tasmota / Tasmotan asentaminen

### Method A: Web Installer (Easiest / Helpoin tapa)
1. Open Chrome or Edge and navigate to: **[https://tasmota.github.io/install/](https://tasmota.github.io/install/)**
2. Select **Tasmota32 NSPanel** (`tasmota32-nspanel.bin`).
3. Click **Connect**, select your serial port, and choose **Install Tasmota32 NSPanel**.
4. Check "Erase device" and proceed with installation.

### Method B: esptool (Command line / Komentorivi)
If using `esptool.py`:
```bash
# 1. Download tasmota32-nspanel.bin
curl -LO https://github.com/arendst/Tasmota-firmware/raw/main/release/firmware/tasmota32-nspanel.bin

# 2. Erase flash
esptool.py --chip esp32 erase_flash

# 3. Flash firmware
esptool.py --chip esp32 write_flash -fs 4MB -fm dio 0x0 tasmota32-nspanel.bin
```

---

## 4. Initial Tasmota Wi-Fi & Template Setup / Tasmotan alkuasetukset

1. Disconnect the USB adapter and reconnect it (or assemble back into the 230V base safely).
2. Connect your phone/PC to the Wi-Fi hotspot named `tasmota-xxxxxx-xxxx`.
3. Browse to `http://192.168.4.1` and enter your home Wi-Fi credentials.
4. Once connected, open the NSPanel's new IP address in your browser.
5. Go to **Configuration** -> **Configure Other**:
   * Under **Template**, paste the following template:
   ```json
   {"NAME":"NSPanel","GPIO":[0,0,0,0,3872,0,0,0,0,0,32,0,0,0,0,225,0,480,224,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4736,0],"FLAG":0,"BASE":1}
   ```
   * Check the **Activate** checkbox!
   * Under **Device Name** and **Friendly Name 1**, enter e.g. `NSPanel`.
   * Click **Save**. The device will restart.

---

## 5. Installing the Berry Driver / Berry-ajurin asennus

The Berry driver bridges Tasmota, MQTT, and the Nextion display over serial UART.

1. Open the Tasmota Web UI -> **Consoles** -> **Console**.
2. Run the following command (all on one line):
```text
Backlog UrlFetch https://raw.githubusercontent.com/joBr99/nspanel-lovelace-ui/main/tasmota/autoexec.be; SetOption151 0; Restart 1
```
3. The device will download `autoexec.be`, save it, and reboot.
4. After reboot, check the console; you should see:
   `NXP: Initializing Driver` or `Nextion driver initialized`.

---

## 6. Flashing Nextion TFT Display Firmware / Nextion TFT -näytön flashaus

Now flash the custom Lovelace UI screen interface to the Nextion display:

1. Open Tasmota **Console**.
2. Run the command matching your model:

* **EU Version (European square model):**
  ```text
  FlashNextion http://nspanel.pky.eu/lui-release.tft
  ```

* **US Version - Portrait (US pystymalli):**
  ```text
  FlashNextion http://nspanel.pky.eu/lui-us-p-release.tft
  ```

* **US Version - Landscape (US vaakamalli):**
  ```text
  FlashNextion http://nspanel.pky.eu/lui-us-l-release.tft
  ```

> [!IMPORTANT]
> - Always use `http://`, NOT `https://` (ESP32 may fail TLS certificate checks for TFT downloads).
> - The display will turn black, show a flashing screen with a progress percentage (0% -> 100%).
> - Do NOT power off or reboot the panel during this process! It takes roughly 2–5 minutes.
> - Once completed, the screen will display "Waiting for content..." or show the default startup screen.

---

## 7. Configuring MQTT in Tasmota / MQTT-asetukset Tasmotassa

1. In Tasmota Web UI, go to **Configuration** -> **Configure MQTT**:
   * **Host**: IP address of your MQTT Broker (e.g. `192.168.1.50`)
   * **Port**: `1883` (or your broker port)
   * **User**: Your MQTT username
   * **Password**: Your MQTT password
   * **Topic**: `nspanel_%06X` (or custom name like `nspanel_livingroom`)
   * **Full Topic**: `%prefix%/%topic%/`
2. Click **Save**.

---

## 8. Pairing with Homey / Paritus Homeyyn

1. Ensure **MQTT Client** (`nl.scanno.mqtt`) is installed and running on Homey, connected to the same MQTT Broker.
2. In Homey app, click **Add Device (+)** -> **NSPanel** -> **NSPanel**.
3. Homey will discover the NSPanel automatically via Tasmota discovery.
4. Select the device and complete pairing!
