# NSPanel Lovelace UI – Kuvakeopas (Icons & Symbols)

Sonoff NSPanelin Lovelace UI -firmware tukee yli **6 900 Material Design Icon (MDI)** -kuvaketta. Kaikki kuvakkeet on integroitu suoraan Homey-sovellukseen ja niitä voidaan käyttää ruutujen, painikkeiden, entiteettien ja navigoinnin määrittelyssä.

---

## 📌 Miten kuvakkeita käytetään?

Voit asettaa kuvakkeen kirjoittamalla sen tunnuksen (slug) ilman `mdi:`-etuliitettä:

1. **Page Studiossa:** Syötä kuvakkeen nimi *Kuvake (Icon)* -kenttään (esim. `lightbulb`, `thermometer`, `power`).
2. **Homey Flow -korteissa:** Käytä kuvakkeen nimeä tekstikentissä (esim. toimintokortissa *Aseta ruudukon ruutu*).
3. **JSON-määrityksissä:** `"icon": "television"`.

> [!TIP]
> Kuvakekenttään kelpaa mikä tahansa alla listatuista nimistä tai mikä tahansa virallinen [Material Design Icons](https://pictogrammers.com/library/mdi/) -tunnus.

---

## 💡 Valot ja Valaistus (Lights & Lighting)

| Kuvakkeen nimi | Tunnus | Käyttökohde |
| :--- | :--- | :--- |
| `lightbulb` | 💡 | Yleisvalo / Kattovalo |
| `lightbulb-outline` | 💡 | Valo pois päältä |
| `lightbulb-group` | 💡💡 | Valoryhmä |
| `lamp` | 🛋️ | Pöytävalaisin / tunnelmavalo |
| `ceiling-light` | 🪔 | Kattovalaisin |
| `wall-sconce` | 🏮 | Seinävalaisin |
| `floor-lamp` | 🛋️ | Lattiavalaisin |
| `led-strip` | 〰️ | LED-valonauha |
| `track-light` | 🔦 | Kohdevalo / Spottivalo |
| `candelabra` | 🕯️ | Kynttelikkö / himmeä valo |
| `candle` | 🕯️ | Kynttilä |
| `brightness-5` | 🔆 | Himmennys / Kirkkaus 50% |
| `brightness-7` | ☀️ | Täysi kirkkaus |
| `palette` | 🎨 | Värivalo / RGB-ohjaus |

---

## ⏻ Virta, Kytkimet ja Releet (Power & Switches)

| Kuvakkeen nimi | Tunnus | Käyttökohde |
| :--- | :--- | :--- |
| `power` | ⏻ | Päävirtakytkin / Rele |
| `power-standby` | ⏼ | Valmiustila |
| `power-socket-eu` | 🔌 | EU-pistorasia / Älypistorasia |
| `power-plug` | 🔌 | Pistotulppa |
| `toggle-switch` | 🔛 | Vipukytkin |
| `toggle-switch-off` | 📴 | Vipukytkin (pois) |
| `flash` | ⚡ | Sähkö / Hetkellinen kulutus |
| `flash-outline` | ⚡ | Sähköverkko |
| `battery` | 🔋 | Akku (täysi) |
| `battery-charging` | ⚡🔋 | Akun lataus |
| `battery-alert` | ⚠️ | Akku vähissä |
| `solar-power` | ☀️⚡ | Aurinkovoima / Aurinkopaneelit |
| `generator-portable` | ⚙️ | Generaattori / Varavoima |

---

## 🌡️ Lämpö, Ilmastointi ja LVI (Climate & HVAC)

| Kuvakkeen nimi | Tunnus | Käyttökohde |
| :--- | :--- | :--- |
| `thermometer` | 🌡️ | Lämpötila-anturi |
| `thermometer-low` | ❄️ | Matala lämpötila |
| `thermometer-high` | 🔥 | Korkea lämpötila |
| `radiator` | ♨️ | Lämpöpatteri |
| `radiator-disabled` | 🚫 | Patteri pois päältä |
| `air-conditioner` | ❄️ | Ilmalämpöpumppu / Ilmastointi |
| `fan` | 🌀 | Ilmanvaihtokone / Tuuletin |
| `fan-speed-1` | 🌀 | Tuulettimen nopeus 1 |
| `fan-speed-2` | 🌀 | Tuulettimen nopeus 2 |
| `fan-speed-3` | 🌀 | Tuulettimen nopeus 3 |
| `fire` | 🔥 | Lämmitys aktiivinen |
| `snowflake` | ❄️ | Viilennys aktiivinen |
| `water-boiler` | 🛢️ | Lämminvesivaraaja |
| `hvac` | 🏭 | LVI-keskusjärjestelmä |
| `water-percent` | 💧 | Ilmankosteus (%) |
| `air-filter` | 🍃 | Ilmanpuhdistin / Suodatin |

---

## 🌦️ Sää ja Ulkoilma (Weather & Outdoors)

| Kuvakkeen nimi | Tunnus | Käyttökohde |
| :--- | :--- | :--- |
| `weather-sunny` | ☀️ | Aurinkoista |
| `weather-partly-cloudy` | ⛅ | Puolipilvistä |
| `weather-cloudy` | ☁️ | Pilvistä |
| `weather-rainy` | 🌧️ | Vesisadetta |
| `weather-pouring` | 🌧️ | Rankkasadetta |
| `weather-lightning-rainy` | ⛈️ | Ukkoskuuroja |
| `weather-snowy` | ❄️ | Lumisadetta |
| `weather-snowy-rainy` | 🌨️ | Räntäsadetta |
| `weather-fog` | 🌫️ | Sumua |
| `weather-windy` | 💨 | Tuulista |
| `weather-night` | 🌙 | Selkeä yö / Kuutamo |
| `weather-sunset` | 🌅 | Auringonlasku |
| `weather-sunset-up` | 🌄 | Auringonnousu |
| `umbrella` | ☂️ | Sadetunnistin / Sateenvarjo |

---

## 🔒 Turvallisuus, Lukot ja Valvonta (Security & Locks)

| Kuvakkeen nimi | Tunnus | Käyttökohde |
| :--- | :--- | :--- |
| `lock` | 🔒 | Lukittu |
| `lock-open` | 🔓 | Avattu |
| `shield` | 🛡️ | Turvajärjestelmä |
| `shield-check` | 🛡️✔️ | Hälytys viritetty (Home/Poissa) |
| `shield-alert` | 🛡️⚠️ | Hälytys lauennut! |
| `shield-off` | 🛡️✖️ | Hälytin poiskytketty |
| `alarm-light` | 🚨 | Hälytysvalo / Sireeni |
| `bell` | 🔔 | Ovikello |
| `motion-sensor` | 🚶 | Liiketunnistin |
| `cctv` | 📹 | Valvontakamera |
| `door` | 🚪 | Ovi (suljettu) |
| `door-open` | 🚪 | Ovi (auki) |
| `window-closed` | 🪟 | Ikkuna (suljettu) |
| `window-open` | 🪟 | Ikkuna (auki) |
| `garage` | 🚗 | Autotallin ovi (suljettu) |
| `garage-open` | 🚗 | Autotallin ovi (auki) |
| `smoke-detector` | 💨 | Palovaroitin |

---

## 🎵 Viihde ja Media (Media & Entertainment)

| Kuvakkeen nimi | Tunnus | Käyttökohde |
| :--- | :--- | :--- |
| `television` | 📺 | Televisio |
| `television-classic` | 📺 | Vanha TV / Näyttö |
| `speaker` | 🔈 | Kaiutin |
| `speaker-wireless` | 🔈 | Langaton monihuonekaiutin |
| `volume-high` | 🔊 | Äänenvoimakkuus suuri |
| `volume-medium` | 🔉 | Äänenvoimakkuus keskitaso |
| `volume-low` | 🔈 | Äänenvoimakkuus matala |
| `volume-mute` | 🔇 | Mykistetty |
| `play` | ▶️ | Toista |
| `pause` | ⏸️ | Keskeytä |
| `skip-next` | ⏭️ | Seuraava kappale |
| `skip-previous` | ⏮️ | Edellinen kappale |
| `music` | 🎵 | Musiikki |
| `radio` | 📻 | Radio |
| `headphones` | 🎧 | Kuulokkeet |
| `gamepad-variant` | 🎮 | Pelikonsoli |

---

## ☕ Kodinkoneet ja Keittiö (Appliances & Kitchen)

| Kuvakkeen nimi | Tunnus | Käyttökohde |
| :--- | :--- | :--- |
| `coffee` | ☕ | Kahvinkeitin |
| `coffee-maker` | ☕ | Kahviautomaatti |
| `kettle` | 🫖 | Vedenkeitin |
| `toaster` | 🍞 | Leivänpaahdin |
| `stove` | 🍳 | Liesi / Uuni |
| `microwave` | 🍲 | Mikroaaltouuni |
| `fridge` | 🥛 | Jääkaappi |
| `dishwasher` | 🍽️ | Astianpesukone |
| `washing-machine` | 🧺 | Pyykinpesukone |
| `tumble-dryer` | 💨 | Kuivausrumpu |
| `robot-vacuum` | 🤖 | Robotti-imuri |
| `vacuum` | 🧹 | Pölynimuri |

---

## 🏠 Huoneet ja Tilat (Rooms & Places)

| Kuvakkeen nimi | Tunnus | Käyttökohde |
| :--- | :--- | :--- |
| `home` | 🏠 | Koti / Päänäkymä |
| `home-outline` | 🏡 | Talo / Ulkonäkymä |
| `sofa` | 🛋️ | Olohuone |
| `bed` | 🛏️ | Makuuhuone |
| `silverware-fork-knife` | 🍴 | Keittiö / Ruokailutila |
| `shower` | 🚿 | Kylpyhuone / Suihku |
| `bathtub` | 🛁 | Kylpyamme |
| `desk` | 🖥️ | Työhuone |
| `baby-carriage` | 👶 | Lastenhuone |
| `car` | 🚗 | Auto |
| `car-electric` | 🚙⚡ | Sähköauto / Latausasema |
| `ev-station` | 🔌 | Sähköauton latauspiste |

---

## 🧭 Navigointi ja Yleiset (Navigation & System)

| Kuvakkeen nimi | Tunnus | Käyttökohde |
| :--- | :--- | :--- |
| `clock` | ⏰ | Kello / Lepotila |
| `clock-outline` | ⏱️ | Ajastin |
| `timer-sand` | ⏳ | Tiimalasi / Odotus |
| `arrow-left-bold` | ⬅️ | Edellinen sivu (‹ Prev) |
| `arrow-right-bold` | ➡️ | Seuraava sivu (› Next) |
| `chevron-left` | ‹ | Siirry taaksepäin |
| `chevron-right` | › | Siirry eteenpäin |
| `refresh` | 🔄 | Päivitä tiedot |
| `cog` | ⚙️ | Asetukset |
| `check` | ✔️ | Hyväksy / Valmis |
| `close` | ✖️ | Sulje / Peruuta |
| `information` | ℹ️ | Lisätiedot |
| `qrcode` | 📶 | QR-koodi / WiFi |

---

## 🔍 Lisää kuvakkeita

Sovellus sisältää koko Material Design Icons -kokoelman (yli 6 900 kuvaketta). Voit selata ja etsiä mitä tahansa kuvaketunnusta suoraan osoitteesta:
👉 **[Pictogrammers MDI Library](https://pictogrammers.com/library/mdi/)**

Kirjoita sivustolta löytyvä kuvakkeen nimi (esim. `ceiling-fan`, `pool`, `hot-tub`, `solar-panel`) suoraan NSPanel Studion kuvakekenttään tai Homey Flow -toimintoon.
