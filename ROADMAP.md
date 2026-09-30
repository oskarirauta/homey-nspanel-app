# NSPanel for Homey – Kehityssuunnitelma, Muistio & Roadmap

Tämä dokumentti toimii projektin sisäisenä muistiona, teknisenä referenssinä ja etenemissuunnitelmana. Tähän dokumentoidaan tehdyt toteutukset, arkkitehtoniset periaatteet sekä tukimateriaalista selvitetyt protokollatiedot, jotta samoja asioita ei tarvitse tutkia uudelleen.


## Ajantasainen jatkojärjestys 28.9.2026

Nykyinen katselmointi ja avoimet havainnot: [docs/review.md](docs/review.md). Alla olevat aiemmat vaihekuvaukset ovat toteutus- ja protokollahistoriaa; fyysisen testauksen lista on erillinen hyväksymiskoe.

1. Sivujen poiston käyttökokeet Homeyn asetusikkunassa. Luonnoksiin yhdistäminen, peruminen ja näkyvä virheenkäsittely on toteutettu.
2. Studion selainkoe Homeyn asetusikkunassa, erityisesti kapea näkymä ja usean paneelin luonnokset.
3. Korttieditorien erottaminen HTML:stä. Tallennus (`studio-save.js`), lähdevalitsin (`studio-sources.js`) ja sivuhallinta (`studio-pages.js`) on jo erotettu.
4. Fyysinen hyväksymiskoe ennen uusia ominaisuuksia; voidaan tehdä rinnakkain vakautuksen kanssa.
5. Vienti/tuonti ja paneelien välinen kopiointi, tunnisteiden ja laitesidontojen näkyvä käsittely.
6. Uudet kortit ja ohjainten laajennukset käyttökokeiden jälkeen.

Tietolähteiden etusija, ohjainten ominaisuusrajaukset, komentovirheiden käsittely sekä paneelimoduulien ensimmäinen pilkkominen on jo toteutettu. Sivukopion odottavan nimeämistiedon periytyminen korjattiin tässä kierroksessa.

## Tietolähteiden etusija 28.9.2026

- Studiossa ja näyttötietoja päivittävien Flow-korttien ohjeissa selitetään lähteen etusija. Valittu automaattinen lähde määrää pääarvon; Flow-lähde hyväksyy käyttäjän syöttämän arvon. Kiinteiden aloitusarvojen Flow-päivitys säilyy yhteensopivana.
- Valojen, verhojen, puhaltimien, tilavalitsinten ja termostaattipopupin sidottujen pääarvojen Flow-päivitys ei väliaikaisesti korvaa Homey-tilaa. Lisätiedot ja termostaatin erilliset Flow-rivit säilyvät käytössä.
- Näyttötietojen päivitykset eivät vaihda pois aktiivisesta popupista/PIN-kyselystä. Tilavalitsimen avaaminen nollaa aiemman popupin tunnisteet.
- Varsinaiset ohjaustoiminnot (releet, ajastimet, hälytin) ja koko sivun määrittely ovat eri asia kuin näyttöarvojen päivitys. Määräaikaista Flow-ohitusta ei lisätty implisiittisesti.

## Studio ja jatkokatselmointi 28.9.2026

- Jaettu asetukset lepotilaan, paneelin toimintoihin ja yhteisiin palveluihin. Paneeli-/palveluasetusten tallennus ei vaihda fyysisen paneelin sivua.
- Homey-linkitysten tarkistus näyttää puuttuvan laitteen/ominaisuuden, yhteysongelman, puuttuvan arvon tai käytettävissä olevan ohjauksen. Tieto on tarkistushetken tilanne; se päivitetään erikseen painikkeesta.
- Valopopupin kirkkaus-, värilämpötila- ja väriohjaimet rajataan Homeyn ominaisuuksiin. Tukemattomat ja virheelliset slider-tapahtumat ohitetaan. Flow-lähteet säilyvät.
- Korjattu sivujärjestyksen ja sivun PIN-kenttien tallennus sekä sivun nimeäminen ja siihen osoittavat Studio-linkit. Ulkoisten Flow-korttien sivutunnisteita ei voida päivittää tällä operaatiolla.
- Hälytyksen navigointilukitus noudattaa käyttäjän valintaa. PIN-kyselyä ei korvata normaalilla sidonnan taustapäivityksellä.
- Uudet regressiotestit: sivun nimeäminen/uusintayritys/törmäys, PIN ja järjestys API:ssa, perusvalo/himmennys/värivalo, tukemattomat ohjaustapahtumat ja linkitysdiagnostiikka.
- Tämän osion alkuperäinen jatkolista on korvattu dokumentin alun ajantasaisella järjestyksellä. Lähteiden etusija ja verhojen/puhaltimien ominaisuusrajaukset on sittemmin toteutettu.

## Vakautus 27.9.2026

- MET-sijainti ja hakuväli ovat sovelluksen yhteisiä asetuksia. Yksi palvelu, ajastus ja välimuisti palvelevat kaikkia paneeleita; paneelikohtaiset MET/Flow/ei ennustetta -valinnat säilyvät.
- Vanhoista asetuksista siirretään ensimmäisen aktiivisen MET-kuluttajan asetukset kerran. Eri sijainteja aiemmin käyttäneen käyttäjän tulee tarkistaa yhteinen sijainti.
- Korjattu kaavion MET-lähteen API-validointi, sääkaavion editorin valinta ja virhetilanteessa näkyneet esimerkkiarvot. Pörssisähkömalli on selkeästi Flow-syöttöinen.
- Ajastimet tunnistetaan omalla tunnisteellaan. Pikamallien kesto huomioidaan ja aika lasketaan päättymishetkestä. Studiossa kesto syötetään minuutteina ja sekunteina.
- Laitevalinta säilyttää puhaltimen ja tilavalitsimen toimintotyypin. Puhaltimen tila ja nopeus tilataan erikseen; popup-päivitykset eivät piirrä taustasivua uudelleen.
- Pikamallit ryhmitelty, tekniset tunnisteet lisäasetuksiin ja yhteisten sääasetusten tallennustila erotettu sivumuutoksista.
- Varmennus: npm test, Homey debug-build sekä Studion selainkokeet. Viiden paneelin yhteinen haku ja ajastus testattu simuloidulla kellolla/HTTP:llä. Fyysinen usean paneelin koe on vielä tehtävä Homeyssa.
- Uusien valo-, verho- ja termostaattitoimintojen jälkeen seuraava painopiste on laitetestaus ja toimintokohtaisten asetusten selkeyttäminen.
- Jatkokatselmointi: estetty toistuvan sivunvaihdon PIN-ohitus, lisätty PIN-tarkistus detail-ikkunoihin ja korjattu PIN-valinnan poistaminen Studiossa. Uudet valo- ja verhosäädöt saavat sidottujen ominaisuuksien päivitykset myös avoimeen ikkunaan.

---

## 1. Projektin Visio ja Periaatteet

1. **NSPanel Studio hoitaa peruskäytön ilman manuaalisia Flow-kytkentöjä**:
   - Tavalliset kodin toiminnot (valot päälle/pois, pistorasiat, lämpötilanäytöt, termostaatin säätö, mediasoittimen ohjaus, tehonäyttö) voidaan kytkeä suoraan Studion graafisessa käyttöliittymässä Homey-laitteisiin.
   - Laitekytkennät (`bindings`) ovat kaksisuuntaisia: Homey-laitteen tilamuutokset päivittyvät paneelille automaattisesti taustalla (`BindingService.watch`), ja ruudun kosketus ohjaa suoraan Homey-laitetta ilman käyttäjän rakentamia apu-floweja.
2. **Flow'lla toteutetaan laajennukset ja monimutkainen logiikka**:
   - Kaikki paneelin kosketustapahtumat, sivuvaihdot, hälytykset, PIN-koodit ja ilmoitukset laukaisevat edelleen vastaavat Flow-triggerit, joten käyttäjä voi halutessaan rikastaa toimintoja vapaasti automaatioilla.
3. **Reaaliaikainen ja turvallinen MQTT-väylä**:
   - Tasmota Berry-ajuri: komennot paneelille `CustomSend`-viesteinä, tapahtumat paneelilta `CustomRecv`-JSONina (`tele/%topic%/RESULT`).

---

## 2. Tukimateriaali ja Tekniset Lähteet

Paikallinen referenssikansio:
```
/Users/osku/Downloads/homey/support/nspanel-lovelace-ui
```

### Tärkeimmät alikansiot ja tiedostot:
- **`HMI/n2t-out/` ja `HMI/n2t-out-visual/`**:
  Nextion TFT/HMI -laiteohjelmiston purettu koodi. Näistä tiedostoista näkee suoraan kunkin ruudun ja popupin muuttujat, elementtien ID:t, `tSend.txt`-tapahtumat ja komennot:
  - `cardGrid.txt`, `cardGrid2.txt`, `cardEntities.txt` – Ruudukko- ja listanäkymät.
  - `cardThermo.txt` – Termostaattinäkymä.
  - `cardMedia.txt` – Mediasoitin.
  - `cardPower.txt` – Energianäkymä (Power Flow).
  - `cardAlarm.txt` – Hälytinjärjestelmä ja PIN-näppäimistö.
  - `cardQR.txt` – QR-koodinäyttö.
  - `cardChart.txt` & `cardLChart.txt` – Pylväs- ja viivakaaviot (pörssisähkö, lämpötilat jne.).
  - `popupLight.txt` & `popupLightNew.txt` – Valon tarkempi säätöikkuna (dimmer, värilämpötila, RGB).
  - `popupShutter.txt` – Verho- ja kaihdinsäätö (asento 0–100 %, ylös, alas, seis, sälekulma/tilt).
  - `popupFan.txt` – Puhaltimen ja ilmanvaihdon säätöikkuna.
  - `popupTimer.txt` – Ajastin / munakello.
  - `popupNotify.txt` – Koko ruudun ilmoitusikkuna.
  - `screensaver.txt` & `screensaver2.txt` – Lepotilanäytöt.
- **`HMI/README.md`**:
  Protokollan referenssidokumentaatio: viestimuodot, parametrit, Nextion-värikoodit (RGB565) ja kuvakekoodit.

---

## 3. Toteutetut Osa-alueet (Valmiit toiminnot)

### 3.1 Yhteys & Laitteistohallinta
- **Tasmota MQTT**: Tuki sekä erilliselle MQTT-brokerille että Scannon `nl.scanno.mqtt`-sovellukselle. Automaattinen laitteiden löytäminen parituksessa.
- **Fyysisten painikkeiden Decouple-tila (`SetOption73`)**:
  - Painikkeet voidaan irrottaa fyysisistä releistä (releitä ei naksuteta suoraan).
  - Painikkeille voidaan Studiossa asettaa: suora Homey-kytkin/valo-ohjaus, sivunavigointi, paikallinen releohjaus tai vain Flow-triggeri.
- **Rule2-navigointi**:
  - Painike 1 vaihtaa edelliselle sivulle (`bPrev`), Painike 2 seuraavalle sivulle (`bNext`).
- **Summeri (Buzzer PWM, `SetOption111`)**:
  - Mahdollistaa moniääniset piippaukset ja soittoäänet. Flow-toiminto `play_buzzer_action`.

### 3.2 Screensaver (Lepotila)
- Iso digitaalikello ja suomenkielinen päivämäärä.
- **Yläkulmien tilakuvakkeet (`statusIcon1`, `statusIcon2`)**: vapaa kuvake ja värivalinta (esim. WiFi, pyykinpesukone, varoitus, lukko).
- **Lämpötilalähteet & näkyvyys**:
  - Sisälämpötila: sisäinen ADC-anturi, Homey-laite (`measure_temperature`) tai Flow. Näkyvyys kytkettävissä pois.
  - Ulkolämpötila: MET Norway -sääennuste, Homey-laite tai Flow. Näkyvyys kytkettävissä pois.
- **MET Norway -sääautomaatio**:
  - Hakee automaattisesti 5 päivän ennusteen MET Norway Locationforecast -rajapinnasta (Homeyn sijainnilla tai omilla koordinaateilla).
  - Tukee MET-sääsymboleita, päivä/yö-kuvakkeita ja lämpötilarajoja.
  - **Säädettävä päivitystiheys**: 1h (oletus), 2h, 3h, 6h tai 12h.
  - Kunnioittaa MET:n `Expires`-, `Retry-After`- ja `If-Modified-Since` (304) -sääntöjä. Jaettu välimuisti paneelien kesken.

### 3.3 Korttityypit & Suorat Homey-kytkennät
- **Grid & Grid2 (`cardGrid`, `cardGrid2`)**:
  - 6 tai 8 slotia.
  - Slotin tietolähde: Homey-laite, paneelin rele 1/2, sisäinen lämpötila, kiinteä arvo tai Flow.
  - Homey-valinta esitäyttää nimen, kuvakkeen, ohjaustyypin (`switch` / `button` / `text`) ja tilan.
  - Kosketus kääntää laitteen tilan suoraan `BindingService.control()`-kautta.
- **Entities (`cardEntities`)**:
  - 4 pystysuuntaista laiteriviä samoilla laitekytkennöillä kuin Grid.
  - Erikoisesiasetus: *Viiden päivän sääennuste* (täyttää rivit automaattisesti MET/Flow-ennusteesta).
- **Energianäkymä (`cardPower`)**:
  - Kodin ja 6 solmun tehotiedot suoraan Homeyn `measure_power`-antureista, Flow-korttien kautta tai kiinteinä arvoina.
  - Automaattinen tai manuaalinen animaationopeus ja virtaussuunnat (+ kotiin, − pois, pakotettu sisään/ulos).
- **Termostaattikortti (`cardThermo`)**:
  - Suora Homey-termostaatin linkitys (`target_temperature`, `measure_temperature`).
  - Reaaliaikainen lämpötilanäyttö ja tavoitelämpötilan kosketusohjaus (`tempUpd`) suoraan laitteelle.
- **Mediasoitin (`cardMedia`)**:
  - Suora Homey-mediasoittimen linkitys (`speaker_track`, `speaker_artist`, `speaker_playing`, `volume_set`).
  - Kosketusohjaus suoraan soittimelle: toisto/tauko, kappaleen vaihto ja äänenvoimakkuusliuku.
- **Hälytin (`cardAlarm` / Heimdall)**:
  - Täysi kaksisuuntainen tuki Homeyn ja Heimdallin hälytystilalle (`homealarm_state`: `disarmed`, `armed`, `partially_armed`).
  - Tukee tiloja: Pois päältä (`disarmed`), Kotona (`armed_home`), Poissa (`armed_away`), Yötila (`armed_night`), Kytkeytyy (`arming`/`pending`) ja Hälyttää! (`triggered`).
  - Suomenkieliset ja englanninkieliset painiketekstit (Kotona, Poissa, Yö, Pois / Home, Away, Night, Disarm) sekä mahdollisuus omien nimien määrittämiseen.
  - **PIN-koodin varmistus ja virheenkäsittely**:
    - Purku (`disarm`) vaatii PIN-koodin tarkistuksen, mikäli koodi on määritelty.
    - Virheellinen PIN soittaa virhesummerin paneelilla (`buzzer 1,2,1,1`) ja laukaisee Homey Flow -triggerin `alarm_pin_failed` (syötetyllä koodilla).
    - Oikea PIN soittaa kuittausäänen, asettaa hälytyksen pois päältä ja purkaa tilan Homeyn hälytyslaitteelta.
    - Valinnainen PIN-vaatimus myös viritykseen (`pin_for_arm`).
  - **Käyttäjälähtöinen navigoinnin lukitus**:
    - **Pois päältä (`disarmed`)**: Käyttäjä voi selata vapaasti paneelin kaikkia muita sivuja (anturit, kaaviot, pörssisähkö, tehonäytöt, kytkimet).
    - **Viritettynä (`armed_home`, `armed_away`, `armed_night`, `arming`, `triggered`)**: Paneelin navigointi muille sivuille on tiukasti lukittu. Kaikki sivunvaihdot (`bPrev`, `bNext`, `bExit`, suorat siirtymät) estetään, ja paneeli pysyy hälytysruudussa.
    - **Lepotilasta herääminen (`wake_to_alarm`)**: Laitteen asetus (oletuksena päällä). Kun näytönsäästäjä aktivoituu miltä tahansa sivulta, herätessä näyttö palaa *aina* suoraan hälytinsivulle (oli hälytin viritetty tai ei), jolloin hälytyksen kytkentä tai tilan tarkistus on heti saatavilla yhdellä kosketuksella.
  - **Flow-integraatiot**:
    - Triggeri: `alarm_action_triggered` (tokenit: `action`, `pin`).
    - Triggeri: `alarm_pin_failed` (token: `entered_pin`).
    - Toiminto: `set_alarm_state_action` (asettaa hälyttimen tilan ja kytkee tarvittaessa summerin/näytön herätyksen hälytyksen soidessa).
    - Toiminto: `show_alarm_page_action` (avaa hälytinsivun halutulla tilalla ja PIN-asetuksilla).
- **QR-koodi (`cardQR`)**:
  - Wi-Fi-vierasverkon tunnukset tai mikä tahansa tekstisisältö.
- **Ilmoitukset (`popupNotify`)**:
  - Koko ruudun ilmoitusikkuna kahdella valinnaisella toimintonapilla ja summeriäänellä.
- **Kaaviokortti (`cardChart` & `cardLChart`)**:
  - Graafinen pylväs- (`cardChart`) tai viivakaavio (`cardLChart`).
  - Suora Homey-anturin kytkentä automaattisella 24 tunnin liukuvalla historiapuskurilla (tuntikohtaiset mittauspisteet ja 4 tunnin välein muodostetut X-akselin aikaleimat `00:00`, `04:00`, `08:00`...).
  - Pörssisähkön esiasetus (`applyPreset('spot')`) ja tuki tuntihinnoille (c/kWh Nextion 1-desimaalin skaalauksella x10).
  - Vapaa määrittely Studion editorissa tai reaaliaikainen syöttö Homey Flow -toiminnoilla (`show_chart_page_action` ja `update_chart_data_action`).
  - Automaattinen tai manuaalinen Y-akselin asteikko (tick-arvot) ja yksikkö (`c/kWh`, `°C`, `W`, `%`).

### 3.4 NSPanel Studio (Selainkäyttöliittymä)
- Interaktiivinen 480x320 Nextion-simulaattori (mukaan lukien realistinen pylväs- ja viivakaavioiden esikatselu Y-akselin asteikoilla ja X-akselin aikaleimoilla sekä monivärinen hälytinnäkymä tilakuvakkeilla).
- **Sivujen järjestely ja monistus**:
  - **▲ / ▼ Järjestyspainikkeet**: Sivujen siirtäminen ylös ja alas listassa katselujärjestyksen muuttamiseksi.
  - **⧉ Duplikointi**: Aktiivisen sivun kloonaus uudeksi muokattavaksi sivuksi yhdellä klikkauksella.
- **Älykäs laiteominaisuuksien tunnistus (Smart Slot Detection)**:
  - Valittaessa Homey-laite slotin kohteeksi, järjestelmä analysoi laitteen kyvyt ja asettaa automaattisesti parhaan toimintotyypin:
    - Kaihtimet/verhot (`windowcoverings_set`) -> `shutter` (kaihdinsäätö popup)
    - Valot (`dim`, `light_temperature`, `light_hue`) -> `light` (älyvalo popup)
    - Puhallin/tuuletin -> `fan` (puhallin popup)
    - Kytkimet/releet (`onoff`) -> `switch`
    - Mittaukset/anturit -> `text`
- **Homey Device Picker Modal**:
  - Reaaliaikainen haku nimellä ja huoneella/vyöhykkeellä.
  - Pikasuodattimet: Kaikki / Valot / Pistorasiat / Anturit / Termostaatit / Mediasoittimet / Hälyttimet (Heimdall).
- **Staattinen alareunan tallennuspalkki**:
  - Dirty-seuranta: tallennuspainike aktivoituu muutoksista ja tallentaa kerralla koko paneelin sivut.

### 3.5 PIN-koodisuojaus kriittisille toiminnoille (`cardUnlock`)
- **Tila**: Valmis ja täysin integroitu (ajuri, generointi, Studio UI, Flow-kortit, testit).
- **Mitä tekee**: Mahdollistaa herkkien toimintojen (älylukot, autotallin ovet, pääreleet, pistorasiat) ja kokonaisten sivujen (asetukset, ylläpito, hälytin) suojaamisen numeerisella PIN-koodilla.
- **Tuetut ominaisuudet**:
  - **Ruutukohtainen PIN-suojaus (Slot PIN)**:
    - Ruudun asetuksissa Studiossa: *Vaadi PIN-koodi toiminnolle* (`require_pin`).
    - Valinnainen mukautettu PIN-koodi (`pin`) tai paneelin yleinen laite-PIN (`global_pin`).
    - Ruutua kosketettaessa paneeli siirtyy automaattisesti `cardUnlock`-näppäimistöön. Toiminto (rele, kytkin, popup, laiteohjaus) suoritetaan vasta, kun oikea PIN on syötetty.
  - **Sivukohtainen PIN-suojaus (Page PIN)**:
    - Sivun asetuksissa Studiossa: *Vaadi PIN-koodi sivun avaamiseen* (`require_pin`).
    - Valinnainen sivukohtainen PIN tai paneelin yleinen laite-PIN.
    - Sivulle siirryttäessä (valikosta, navigointipainikkeista tai linkeistä) avautuu `cardUnlock`. Siirtymä suoritetaan vasta oikealla koodilla.
  - **Käyttökokemus ja turvallisuus**:
    - Oikea PIN: kuittausääni (`buzzer 1,1,1`), siirtymä pois näppäimistöstä ja toiminnon/sivun suoritus.
    - Väärä PIN: 2-ääninen virhesummeri (`buzzer 2,2,1`), `alarm_pin_failed`-Flow-triggerin laukeaminen syötetyllä koodilla, ja toiminto pysyy estettynä.
    - Peruutus (`bExit`): palauttaa turvallisesti edelliselle sivulle suorittamatta toimintoa.
  - **Flow-integraatio**:
    - Toiminto: `show_unlock_page` (avaa `cardUnlock`-näppäimistön Flow'sta millä tahansa otsikolla ja kohteella).
    - Triggeri: `alarm_pin_failed` (laukeaa väärällä koodilla).
  - **NSPanel Studio UI**:
    - Ruudun muokkaus: PIN-valintaruutu ja koodikenttä.
    - Sivun muokkaus: PIN-valintaruutu ja koodikenttä.
    - Simulaattorissa suojatut ruudut ja sivut korostetaan 🔒-merkillä, ja näppäimistö (`cardUnlock`) voidaan esikatsella.

### 3.6 Yötila & kirkkauden ajastukset (Night Mode & Scheduled Brightness)
- **Tila**: Valmis ja täysin integroitu (ajuri, asetukset, Studio UI, Flow-kortit, testit).
- **Mitä tekee**: Monipuolinen ja automaattinen näytön kirkkauden ja teeman hallinta yöaikaan häikäisyn estämiseksi makuuhuoneissa ja asuintiloissa.
- **Ohjaustavat**:
  - **1. Sisäänrakennettu aikataulu**:
    - Laitteen asetuksissa säädettävä aikaikkuna: aloitusaika (`night_mode_start`, oletus `22:00`) ja lopetusaika (`night_mode_end`, oletus `07:00`). Toimii saumattomasti myös vuorokauden vaihtuessa keskiyön yli.
  - **2. Heimdall- ja hälytysintegraatio**:
    - Asetus `night_follow_alarm`: kun hälytin kytketään yötilaan (`armed_night` / `partially_armed`), paneeli siirtyy välittömästi yötilaan ja palautuu automaattisesti hälytyksen purkauduttua.
  - **3. Homey Flow -ohjaus**:
    - Toimintokortti `set_night_mode` (`on` / `off` / `auto`): mahdollistaa yötilan ohjauksen kodin yleisillä nukkumaanmeno- ja heräämisautomaatioilla.
    - Toimintokortti `set_brightness` (`brightness`, `sleep_brightness`): aktiivisen ja lepotilan kirkkauden säätö lennosta.
    - Ehtokortti `is_night_mode`: tarkistaa Flow'ssa, onko paneeli parhaillaan yötilassa.
    - Triggerikortti `night_mode_changed`: laukeaa, kun yötilan tila muuttuu (`active`-boolean-tokenilla).
- **Yötilan ominaisuudet**:
  - Säädettävä aktiivinen kirkkaus yöllä (`night_brightness`, 1–100 %, oletus 20 %).
  - Säädettävä lepotilan kirkkaus yöllä (`night_sleep_brightness`, 0–100 %, oletus 0 % = täysin pimeä).
  - Lyhyempi lepotilan aikakatkaisu yöllä (`night_sleep_timeout`, oletus 15 s) näytön sammuttamiseksi nopeasti kosketuksen jälkeen.
  - Musta taustateema yöllä (`night_theme_black`, Nextion OLED-tyylinen `background_black`) kontrastin ja valovuodon minimoimiseksi.
- **NSPanel Studio UI**:
  - Lepotilan asetuksissa erillinen *Yötila & kirkkauden ajastus* -osio ja *Yleinen PIN-koodi* -kenttä.


---

## 4. Tulevat Osa-alueet & Kehityskohteet (Roadmap)

Tukimateriaalista (`support/nspanel-lovelace-ui/HMI`) poimitut seuraavat mahdolliset laajennukset:

### Vaihe 4: Valojen tarkempi säätöikkuna (`popupLight` / `popupLightNew`) [Toteutettu ✅]
- **Tila**: Valmis ja täysin integroitu Homeyn ominaisuuksiin, Studioon ja Flow-järjestelmään.
- **Mitä tekee**: Kun valoa painetaan (tai avataan Flow'sta), ruudulle avautuu säätöikkuna, joka tarjoaa monipuoliset säätimet valon tyypin mukaan.
- **Tuetut ominaisuudet**:
  - Päällä/pois kytkin (`onoff`, tila 0/1).
  - Kirkkauden liukusäädin (`dim`, 0–100 % / `brightnessSlider`).
  - Värilämpötilan liukusäädin (`light_temperature`, kelvin / 0–100 % / `colorTempSlider`) dynaamisella Kelvin-värilaskennalla (`kelvin_fraction_to_565`).
  - RGB-väriympyrä kosketuskoordinaateilla (`x|y|wh` -> `pos_to_hsv` -> `light_hue` / `light_saturation` 0..1).
- **Protokolla Nextionilta**:
  - Avaus: `event,pageOpenDetail,popupLight,<entityId>` tai `popupLightNew`
  - Komennot takaisin:
    - `event,buttonPress2,<entityId>,OnOff,<0|1>`
    - `event,buttonPress2,<entityId>,brightnessSlider,<0-100>`
    - `event,buttonPress2,<entityId>,colorTempSlider,<0-100>`
    - `event,buttonPress2,<entityId>,colorWheel,<x>|<y>|<wh>`
    - `event,buttonPress2,popupLight,bExit`
- **Päivitysviesti paneelille**:
  `entityUpdateDetail~<entityId>~<icon>~<iconColor>~<buttonState>~<brightness>~<colorTemp>~<colorMode>~<colorTrans>~<ctTrans>~<brTrans>~<effectSupported>`
  - Esim. `entityUpdateDetail~ceiling_light~~65535~1~80~50~enable~Väri~Lämpötila~Kirkkaus~disable`
  - `colorMode`: `enable` (näyttää väripyörän) tai `disable` (vain kirkkaus/värilämpötila).
- **Flow-integraatio**:
  - Triggeri: `light_action_triggered` (tokenit: `entity`, `action_type`, `onoff`, `brightness`, `color_temp`, `hue`, `saturation`).
  - Toiminto: `show_light_popup_action` (avaa säätöikkunan määritetyillä arvoilla).
  - Toiminto: `set_light_state_action` (päivittää tilan paneelille).
- **NSPanel Studio UI & Esiasetus**:
  - Toimintotyyppi: `Valo (popupLight säätöikkuna)`
  - Esiasetus: `💡 Älyvalot (popupLight)` (`lights_popup`)
  - Simulaattori tukee valon arvon näyttöä (`💡 100 %`) ja vuorovaikutusta.

### Vaihe 5: Verhojen ja sälekaihtimien popup (`popupShutter`) [Toteutettu ✅]
- **Tila**: Valmis ja täysin integroitu Homeyn ominaisuuksiin (`windowcoverings_set`, `windowcoverings_tilt_set`, `windowcoverings_state`), Studioon ja Flow-järjestelmään.
- **Mitä tekee**: Erillinen ohjausikkuna rullaverhoille, sälekaihtimille ja markiiseille.
- **Tuetut ominaisuudet**:
  - Asennon liukusäädin (0–100 % / `positionSlider` -> `windowcoverings_set`).
  - Nosto, lasku ja pysäytys (`up`, `down`, `stop`).
  - Säleiden kulmasäädin (0–100 % / `tiltSlider` -> `windowcoverings_tilt_set`) sekä tilttipainikkeet (`tiltOpen`, `tiltStop`, `tiltClose`).
  - Tuki sekä tavallisille rullaverhoille (ilman tilttiä, sälesäätimet piilossa `disable`) että sälekaihtimille (tiltti käytössä).
  - `cardEntities` -listassa sisäänrakennetut Up/Stop/Down -ohjauspainikkeet suoraan rivillä (token 19).
- **Protokolla Nextionilta**:
  - Avaus: `event,pageOpenDetail,popupShutter,<entityId>`
  - Tapahtumat:
    - `event,buttonPress2,<entityId>,positionSlider,<0-100>`
    - `event,buttonPress2,<entityId>,up`
    - `event,buttonPress2,<entityId>,stop`
    - `event,buttonPress2,<entityId>,down`
    - `event,buttonPress2,<entityId>,tiltOpen`
    - `event,buttonPress2,<entityId>,tiltStop`
    - `event,buttonPress2,<entityId>,tiltClose`
    - `event,buttonPress2,<entityId>,tiltSlider,<0-100>`
    - `event,buttonPress2,popupShutter,bExit`
- **Päivitysviesti paneelille**:
  `entityUpdateDetail~<entityId>~<posVal>~<infoText>~<posHeading>~<icon>~<iconUp>~<iconStop>~<iconDown>~<statusUp>~<statusStop>~<statusDown>~<tiltHeading>~<iconTiltLeft>~<iconTiltStop>~<iconTiltRight>~<statusTiltLeft>~<statusTiltStop>~<statusTiltRight>~<tiltVal>`
  - Jos `statusTiltLeft` ei ole `'enable'` tai `'disable'`, Nextion piilottaa tilttipainikkeet (`vis 0`). Jos `tiltVal` on `'disable'`, liukusäädin pysyy piilossa.
- **Flow-integraatio**:
  - Triggeri: `shutter_action_triggered` (tokenit: `entity`, `action_type`, `position`, `tilt`).
  - Toiminto: `show_shutter_popup_action` (avaa säätöikkunan määritetyillä arvoilla).
  - Toiminto: `set_shutter_state_action` (päivittää asennon/tilin paneelille ja aktiiviselle popupille).
- **NSPanel Studio UI & Esiasetus**:
  - Toimintotyyppi: `Verhot / Kaihtimet (popupShutter)`
  - Esiasetus: `🪟 Verhot & Kaihtimet (popupShutter)` (`shutters`)
  - Simulaattori tukee asennon esitystä (`↕ 50 %`) ja vuorovaikutusta.

### Vaihe 6: Pörssisähkön, ennusteiden & historiatiedon kaaviokortti (`cardChart` & `cardLChart`) [Toteutettu & Laajennettu ✅]
- **Tila**: Valmis, täysin automatisoitu ja integroitu (ajuri, generointi, Studio UI, Flow-toiminnot, testit).
- **Protokolla paneelille**:
  - Pylväskaavio: `entityUpd~<heading>~<navigation (12 tokens)>~<color>~<yAxisLabel>~<yAxisTicks>~<val1^label1>~<val2>~...`
  - Viivakaavio: `entityUpd~<heading>~<navigation (12 tokens)>~<color>~<yAxisLabel>~<yAxisTicks>~<xAxisTicks>~<x1:y1>~<x2:y2>~...`
  - **Tärkeä Nextion-havainto**: Viivakaaviossa jokainen mittauspiste *täytyy* olla muotoa `x:y` (esim. `0:52~1:48~2:75`). Nextion lukee kaksoispisteen vasemman puolen X-koordinaatiksi ja oikean puolen Y-koordinaatiksi. Jos kaksoispistettä ei ole, Nextion lukee Y-arvoksi 0, jolloin viiva piirtyy ruudun pohjaan!
  - X-akselin ticksit (`token 17`) erotellaan `+`-merkillä ja muodostetaan muodossa `x^label+x^label` (esim. `0^00:00+6^06:00+12^12:00`). Ensimmäisen tickin X-arvo asettaa Nextionin `vaMinX`-arvon.
  - Nextion jakaa Y-akselin ticksit luvulla 10 (`sys1 /= 10; sys2 = sys1 % 10`), joten 1 desimaalin luvut (esim. c/kWh tai °C) skaalataan x10 (`5.2` -> `52`). Y-ticksien tulee alkaa 0:sta (tai alimmasta arvosta), jotta Nextion löytää asteikon minimin.
  - Pylväiden maksimikorkeus lasketaan automaattisesti arvojen maksimista `vaYUnit.val = (m0.h - 24) / vMax.val`.
- **Automaattiset tietolähteet ilman Flow-kaavioita**:
  1. **Homey Insights 24h -historia**:
     - Ajuri hakee suoraan Homey Web API:n kautta (`api.insights.getLogs` & `api.insights.getLogEntries`) sidotun laitteen viimeisen 24 tunnin mittaustiedot (`measure_temperature`, `measure_power`, `measure_humidity`, `meter_power`).
     - Kaavio täyttyy välittömästi paneelin käynnistyessä eikä vaadi tuntien odottelua muistin keräämiseksi.
     - Liukuva muistipuskuri päivittyy reaaliajassa `BindingService.watch`-kuuntelijalla.
  2. **MET Norway 24h -lämpötilaennuste (`MetWeatherService.getHourly24h`)**:
     - Tuottaa tulevan 24 tunnin tuntikohtaisen lämpötilakäyrän suoraan MET-säärajapinnasta.
     - X-akselin aikaleimat automaattisesti käyttäjän aikavyöhykkeessä (4h välein, esim. `13:00`, `17:00`, `21:00`...).
     - Ei vaadi lainkaan fyysisiä sensoreita tai Flow-kytkentöjä.
  3. **Pörssisähkön spot-hinnat**:
     - Valmis esiasetus c/kWh-tuntihinnoille (24h profiili).
- **Älykäs automaattiasteikko (`calculateChartTicks`)**:
  - Jos Y-akselin asteikoksi on valittu `auto` (tai jätetty tyhjäksi), asteikko lasketaan dynaamisesti luonnollisin ihmisaskelin (1, 2, 5 tai 10 x suuruusluokka).
  - Luonnollinen 0-pohja teholle (`W`), kulutukselle ja hinnoille (`minVal < span`).
  - Lämpötiloille ja pienille vaihteluille (esim. sisälämpö 20.5–22.0 °C) asteikko keskittyy vaihteluvälille eikä pakota nollaa pohjalle.
- **NSPanel Studio UI & Esiasetukset**:
  - Tietolähteen valitsin:
    - `🏠 Homey-laitteen historia (Insights 24h)`
    - `🌤 MET Norway 24h lämpötilaennuste`
    - `⚡ Pörssisähkön tuntihinnat (spot)`
    - `✍️ Kiinteät arvot / Manuaalinen`
  - Pikamallit yhdellä klikkauksella:
    - `📈 Lämpötilatrendi 24h`
    - `⚡ Sähkönkulutus 24h (W)`
    - `🌤 24h Lämpötilaennuste (MET)`
    - `💶 Pörssisähkö (c/kWh)`
- **Flow-toiminnot**:
  - `show_chart_page_action` ja `update_chart_data_action` koko aineiston kerta-asetukseen ja sivun näyttämiseen.
  - `push_chart_value_action`: FIFO-rullaava puskuritoiminto ("Lisää arvo kaavioon"). Poistaa automaattisesti vanhimman pisteen vasemmalta, siirtää jäljelle jäävät pisteet ja lisää uuden arvon oikealle:
    - **Viivakaavio (`cardLChart`)**: Siirtää X-koordinaatit taaksepäin alkuperäisen rasterin mukaan ja asettaa uuden pisteen oikeanpuoleisimpaan X-sijaintiin (tai annettuun X-arvoon).
    - **Pylväskaavio (`cardChart`)**: Pylväät ovat kiinteissä peräkkäisissä sloteissa, joten uusi arvo lisätään suoraan viimeiseksi pylvääksi ja vanhin pudotetaan pois (mahdollinen X-arvo ohitetaan automaattisesti).

### Vaihe 7: Valintalista / Tilavalitsin (`popupInSel` - input_select) [Toteutettu ✅]
- **Tila**: Valmis ja integroitu (ajuri, generointi, Studio UI, Flow-kortit, testit).
- **Mitä tekee**: Ponnahdusikkuna, josta voi valita vaihtoehdon listasta (esim. Homeyn tilat: *Kotona* / *Poissa* / *Nukkumassa* / *Loma*, tai ilmanvaihto- ja lämmitysprofiilit).
- **Protokolla paneelille (`popupInSel.txt`)**:
  - Päivityskomento: `entityUpdateDetail2~<entityId>~~<iconColor>~<title>~<currentState>~<option1>?<option2>?<option3>...`
  - Token 1 (`entityId`): Kohteen ID (esim. `home_mode`).
  - Token 3 (`iconColor`): Otsikkokuvakkeen väri RGB565-lukuna.
  - Token 4 (`title`): Otsikkoteksti (esim. *Kodin tila*).
  - Token 5 (`currentState`): Valittuna oleva arvo (korostetaan näytöllä automaattisesti eri värillä `1374`).
  - Token 6 (`options`): Kysymysmerkillä `?` eroteltu lista vaihtoehdoista (enintään 12 sivua kohden, vieritettävissä `bModeNext`-painikkeella).
- **Tapahtumat paneelilta (`buttonPress2`)**:
  - Avaus tapahtuu suoraan `cardEntities`- ja `cardGrid`-ruuduilta, kun slotin tyyppi on `input_sel` -> Nextion lähettää `event,pageOpenDetail,popupInSel,<entityId>`.
  - Valinta: `event,buttonPress2,<entityId>,mode-<title>,<index>` (0-pohjainen indeksi valitulle riville).
  - Sulkeminen: `event,buttonPress2,popupInSel,bExit` -> palauttaa aiemman sivun näytölle.
- **Ajuri- ja Flow-tuki**:
  - Triggeri: `select_action_triggered` (tokenit: `entity`, `option`, `index`).
  - Toiminto: `set_select_state_action` (päivittää valintalistan nykyisen tilan, ruudun korostuksen sekä emosivun slotin arvon).
  - Toiminto: `show_select_popup_action` (avaa `popupInSel`-ikkunan mistä tahansa Flow'sta halutuilla vaihtoehdoilla ja tekee sivusiirtymän).
  - Tuki kaksisuuntaiselle Homey-kytkennälle: jos slotilla on laitekytkentä, valittu teksti ohjataan suoraan laitteen capabilitylle.
- **NSPanel Studio UI**:
  - Slottityyppinä `Valintalista / Tilavalitsin (popupInSel)`.
  - Vaihtoehtojen syöttökenttä (esim. `Kotona?Poissa?Nukkumassa?Loma`).
  - Pikamalli: `🏠 Kodin tilat (popupInSel)` (`applyPreset('modes')`).

### Vaihe 8: Puhallin- ja ilmanvaihtoratkaisut (`popupFan` / IV-kone) [Toteutettu ✅]
- **Tila**: Valmis ja integroitu (ajuri, generointi, Studio UI, Flow-kortit, testit).
- **Protokolla paneelille (`popupFan.txt`)**:
  - Komento: `entityUpdateDetail~<entityId>~~<iconColor>~<buttonState>~<speedVal>~<speedMaxVal>~<speedLabel>~<currentMode>~<modeList>`
  - Token 4 (`buttonState`): `0` tai `1` (On/Off kytkin).
  - Token 5 (`speedVal`): numero (esim. 1..4) tai `"disable"` jos liukusäädin halutaan piilottaa.
  - Token 6 (`speedMaxVal`): liukusäätimen maksimiarvo `hSpeed.maxval` (esim. 4 neliportaiselle IV-koneelle, tai 100 %).
  - Token 7 (`speedLabel`): liukusäätimen otsikkoteksti (esim. *Teho* tai *Nopeus*).
  - Token 8 (`currentMode`): aktiivisen tilan nimi (esim. *Kotona*).
  - Token 9 (`modeList`): kysymysmerkillä `?` eroteltu tilalista (esim. `Poissa?Kotona?Tehostus?Takkatila`). Jos tyhjä, tilapainikkeet piiloutuvat.
- **Tapahtumat paneelilta (`buttonPress2`)**:
  - Tehon liukusäädin: `event,buttonPress2,<entityId>,number-set,<speed>`
  - Tilapainikkeet: `event,buttonPress2,<entityId>,mode-preset_modes,<modeIndex>` (0-pohjainen indeksi)
  - Pääkytkin: `event,buttonPress2,<entityId>,OnOff,<0|1>`
  - Sulkupainike: `event,buttonPress2,popupFan,bExit`
- **Ajuri- ja Flow-tuki**:
  - Triggeri: `fan_action_triggered` (tokenit: `entity`, `action_type` [speed/mode/onoff], `speed`, `mode`, `mode_index`, `onoff`).
  - Toiminto: `set_fan_state_action` (päivittää tallennetun tilan, aktiivisen popupin sekä nykyisen sivun vastaavan slotin).
  - Toiminto: `show_fan_popup_action` (avaa `popupFan`-ikkunan pyydetyillä parametreilla ja tekee sivusiirtymän).
  - Tuki kaksisuuntaiselle Homey-kytkennälle: sidotun laitteen `dim` ohjaa tehoa ja `onoff` pääkytkintä.
  - Slot-interaktio: ruudukosta tai listasta `type: 'fan'` tai `target: 'popupFan'` avaa suoraan säätöikkunan.
- **NSPanel Studio UI**:
  - Ruudun toimintotyypeissä: `Ilmanvaihto / Puhallin (popupFan)`.
  - Pikamalli: `🌀 Ilmanvaihto (LTO)` (`applyPreset('ventilation')`), joka luo valmiin ruudun:
    - 1: Ilmanvaihto (`fan`, avaa popupin)
    - 2: Takkatila (`switch`, ylipaineistuksen kytkin)
    - 3: Tuloilma (`text`, anturiarvo)
    - 4: Poistoilma (`text`, anturiarvo)
    - 5: Tehostus 30 min (`button`, pika-ajastin)
    - 6: Koti (`navigate`, takaisin päänäkymään)
- **Käyttöesimerkki: Määräaikainen tehostus / beforeApply -automaatio**:
  - Käyttäjä voi Homey Flow'lla ottaa IV-koneelta talteen nykyisen tehon ja tilan muuttujaan.
  - Kun paneelilta valitaan *Tehostus* (tai tehoa nostetaan), Flow käynnistää ajastimen (esim. 30 min / 1 h).
  - Ajastimen päätyttyä Flow palauttaa alkuperäisen tilan `set_fan_state_action`-kortilla ja IV-koneen rajapintaan. Jos tehoa säädetään uudelleen ajastimen ollessa käynnissä, ajastin resetoidaan säilyttäen alkuperäiset oletusasetukset.

### Huomio lepotiloista: `screensaver2`
- **Päätös**: `screensaver2` on jätetty tietoisesti pois / matalalle prioriteetille. Sen asettelu on sekava, ja olemassa oleva `screensaver` (iso digitaalikello, päivämäärä, viiden päivän MET-sää, sisä- ja ulkolämpötila sekä kaksi vapaasti valittavaa tilakuvaketta) tarjoaa paljon selkeämmän ja luettavamman kokonaisuuden.

### Vaihe 9: Ajastin / Munakello (`popupTimer`) [Toteutettu ✅]
- **Tila**: Valmis ja integroitu (ajuri, generointi, taustalaskenta, summeri, Studio UI, Flow-kortit, testit).
- **Mitä tekee**: Keittiö- tai yleisajastin, jota voi säätää ja käynnistää suoraan kosketusnäytöltä tai Homey Flow'sta. Sisältää sekuntikohtaisen laskennan, interaktiiviset säätimet (+/- 1, 5, 10, 15 min/s), tilapainikkeet (Start, Pause, Cancel, Stop) sekä moniäänisen summerihälytyksen ajan päättyessä.
- **Protokolla paneelille (`popupTimer.txt`)**:
  - Avaus: `event,pageOpenDetail,popupTimer,<entityId>`
  - Lähetys: `entityUpdateDetail~<entityId>~~<iconColor>~<entityId>~<min_remaining>~<sec_remaining>~<editable>~<action1>~<action2>~<action3>~<label1>~<label2>~<label3>`
  - Token 4 (`name/entityId`): Kohteen nimi/tunniste.
  - Token 5 (`min_remaining`): Jäljellä olevat minuutit `n1.val` (0..59).
  - Token 6 (`sec_remaining`): Jäljellä olevat sekunnit `n2.val` (0..59).
  - Token 7 (`editable`): `1` (muokattavissa) tai `0` (lukittu kun käynnissä).
  - Token 8–10 (`action1..3`): Painikkeiden toiminnot (jos tyhjä, painike piilotetaan).
  - Token 11–13 (`label1..3`): Painikkeiden tekstit ruudulla.
  - Painikkeiden logiikka:
    - *Idle (pysähdyksissä)*: `editable=1`, keskipainike `action2="start"`, `label2="START"`.
    - *Running (käynnissä)*: `editable=0`, `action1="pause"`, `label1="PAUSE"`, `action2="cancel"`, `label2="CANCEL"`, `action3="finish"`, `label3="STOP"`.
    - *Paused (tauolla)*: `editable=1`, `action1="start"`, `label1="START"`, `action2="cancel"`, `label2="CANCEL"`.
- **Tapahtumat paneelilta (`buttonPress2`)**:
  - Käynnistys / jatko: `event,buttonPress2,<entityId>,timer-start`
  - Ajan asetus näytöltä: Kun käyttäjä napauttaa minuutteja/sekunteja ja sulkee säätönapit, Nextion lähettää:
    `event,buttonPress2,<entityId>,timer-start,00:<minutes>:<seconds>`
  - Tauko: `event,buttonPress2,<entityId>,timer-pause`
  - Nollaus: `event,buttonPress2,<entityId>,timer-cancel`
  - Pakotettu lopetus: `event,buttonPress2,<entityId>,timer-finish`
  - Sulkupainike: `event,buttonPress2,popupTimer,bExit`
- **Ajurin taustalaskenta & summeri**:
  - Ajastin tikittää sekunnin välein taustalla (`tickTimer`) riippumatta siitä, onko popup auki vai ollaanko toisella sivulla / lepotilassa.
  - Ajan päättyessä (00:00) ajuri soittaa automaattisesti huomiota herättävän hälytysäänen NSPanelin summerilla (`playBuzzer(5, 2, 2)`).
  - Päivittää emosivun slotin arvon reaaliajassa `MM:SS` ja ajan päättyessä näyttää tekstin `Valmis!`.
- **Flow-integraatiot**:
  - Triggeri: `timer_finished_triggered` (tokenit: `entity`, `label`).
  - Triggeri: `timer_action_triggered` (tokenit: `entity`, `action` [start/pause/cancel/finish], `minutes`, `seconds`).
  - Toiminto: `show_timer_popup_action` (avaa `popupTimer`-ikkunan annetulla ajalla ja värillä).
  - Toiminto: `set_timer_action` (ohjaa ajastinta: start, pause, cancel tai set-aika).
- **NSPanel Studio UI**:
  - Slottityyppinä `Ajastin / Munakello (popupTimer)`.
  - Pikamalli: `⏱ Munakello / Ajastin (popupTimer)` (`applyPreset('timer')`):
    - 1: Keittiöajastin (`timer`, 5 min)
    - 2: Pika-ajastin 10 min (`timer`, 10 min)
    - 3: Pika-ajastin 30 min (`timer`, 30 min)
    - 4: Lepotila (`navigate`, `screensaver`)
  - Simulaattori esittää ajastimen reaaliaikaisesti timer-kuvakkeella ja `05:00`-arvolla.

### Vaihe 10: Termostaatin lisäsäätöikkuna (`popupThermo`) [Toteutettu ✅]
- **Tila**: Valmis ja täysin integroitu (ajuri, generointi, Studio UI & simulaattori, Flow-kortit, testit).
- **Mitä tekee**: Termostaattikortilta (`cardThermo` -ruudun `btDetail`-painike) tai suoraan ruudukosta/Flow'sta avautuva monipuolinen lisäsäätöikkuna, joka mahdollistaa jopa 3 erillisen toimintotilan rivin (esim. toimintatila, esiasetus ja puhallinnopeus) valinnan ja ohjauksen.
- **Tuetut ominaisuudet**:
  - **Rivi 1 (Toimintatila / Operation Mode)**: Esim. `Auto`, `Lämmitys`, `Viilennys`, `Pois`. Linkittyy suoraan Homey-termostaatin `thermostat_mode`-ominaisuuteen.
  - **Rivi 2 (Esiasetus / Preset Mode)**: Esim. `Koti`, `Säästö`, `Mukavuus`, `Tehostus`.
  - **Rivi 3 (Puhallintila / Fan Mode)**: Esim. `Auto`, `Matala`, `Keski`, `Korkea`.
  - Dynaaminen rivien piilotus: jos rivin tilalista on tyhjä, Nextion-laiteohjelmisto piilottaa kyseisen rivin automaattisesti.
  - Aktiivisen tilan värillinen korostus Nextion-näytöllä (`1374` / oranssi).
- **Protokolla paneelille (`popupThermo.txt`)**:
  - Avaus: `event,pageOpenDetail,popupThermo,<entityId>`
  - Lähetys: `entityUpdateDetail~<entityId>~<icon>~<iconColor>~<heading1>~<type1>~<curMode1>~<modeList1>~<heading2>~<type2>~<curMode2>~<modeList2>~<heading3>~<type3>~<curMode3>~<modeList3>`
- **Tapahtumat paneelilta (`buttonPress2`)**:
  - Tilan valinta riviltä: `event,buttonPress2,<entityId>,mode-<type>,<index>`
  - Sulkupainike: `event,buttonPress2,popupThermo,bExit` -> palauttaa aiemman sivun näytölle.
- **Ajuri- ja Flow-tuki**:
  - Triggeri: `thermostat_mode_changed` (tokenit: `entity`, `mode_type`, `mode`, `mode_index`, `row`).
  - Toiminto: `show_thermo_popup_action` (avaa `popupThermo`-ikkunan halutuilla otsikoilla ja tilalistoilla).
  - Toiminto: `set_thermo_mode_action` (päivittää valitun rivin tilan paneelille).
  - Automaattinen sidonta Homey-termostaattiin: jos termostaatti on sidottu Homey-laitteeseen, valinta päivittää suoraan laitteen `thermostat_mode`-tilan.
- **NSPanel Studio UI**:
  - Termostaatin muokkausosiossa omat asetuskentät jokaiselle riville (otsikko, valinnat, oletustila).
  - Simulaattorissa vuorovaikutteinen esikatselu: termostaatin tilanapista tai ⚙-painikkeesta avautuu täydellinen `popupThermo`-esikatselu suoraan virtuaalipaneelille.

---

## 5. Käytännön testauksen tarkistuslista (fyysisellä laitteella tehtävät testit)

Tähän on koottu toteutettujen ominaisuuksien testitapaukset, jotka testataan fyysisellä NSPanel-laitteella ja IV-koneella:

### 5.1 Kaavio- ja käyränäytöt (`cardChart` & `cardLChart`)
- [ ] **Homey Insights 24h -historia**:
  - Lämpötilan käyrä/pylväs (`measure_temperature`) todellisella anturilla: käyrä piirtyy heti paneelin käynnistyessä suoraan Insights-historiasta ilman tuntien odottelua.
  - Tehonäyttö (`measure_power` W): tarkistus, että nollataso ja asteikko asettuvat luonnollisesti (esim. `0:500:1000:1500...`).
  - Uusien mittausarvojen päivittyminen reaaliajassa puskuriin ja ruudulle laitteelta saapuvien arvojen myötä.
- [ ] **MET Norway 24h -lämpötilaennustekäyrä**:
  - Seuraavan 24 tunnin lämpötilakäyrän ja X-akselin kellonaikojen (4h välein käyttäjän aikavyöhykkeessä) visuaalinen selkeys ja skaalaus Nextion-näytöllä.
- [ ] **Älykäs automaattiasteikko (`calculateChartTicks`)**:
  - Pienten lämpötilavaihteluiden näkyminen selkeästi ilman 0-pakotusta (esim. 20.0–22.5 °C).
  - Suurten teholukemien ja pörssisähkön hintojen selkeät tasaluvut Y-akselilla.

### 5.2 Ilmanvaihto- ja puhallinsäätö (`popupFan` / IV-kone)
- [ ] **Avaus ja säätöikkunan ulkoasu**:
  - Säätöikkunan avautuminen ruudukosta/listasta (`type: fan` tai `target: popupFan`).
  - Teholiukusäätimen (1..4 / 0..100 %) vaste ja arvon siirtyminen (`number-set`).
  - Tilapainikkeiden (Kotona, Poissa, Tehostus, Takkatila) kosketus ja aktiivisen tilan korostus (`mode-preset_modes`).
  - Pääkytkimen On/Off-toiminta ja sulkunapin (`bExit`) toimivuus.
- [ ] **Kaksisuuntainen synkronointi**:
  - IV-koneen tilan muuttuminen Homeyn puolella päivittyy suoraan paneelin näyttöön.
- [ ] **Määräaikainen tehostus / beforeApply Flow**:
  - Nykyisen tehon ja tilan tallennus muuttujiin ennen tehostuksen alkamista.
  - Tehostuksen kytkeminen ja ajastimen käynnistys (esim. 30 min / 1 h).
  - Ajastimen nollaus ja uudelleenkäynnistys, jos tehoa säädetään tehostuksen ollessa jo käynnissä (säilyttäen alkuperäiset oletusasetukset muistissa).
  - Alkuperäisten asetusten palautus ajastimen päätyttyä `set_fan_state_action`-kortilla.

### 5.3 Valintalista ja tilavalitsin (`popupInSel` / Kodin tilat)
- [ ] **Avaus ja ulkoasu**:
  - Säätöikkunan avautuminen ruudukosta tai listasta (`type: input_sel`).
  - Vaihtoehtojen listautuminen riveittäin ja aktiivisen tilan värillinen korostus (`currentState`).
  - Sivunvaihto (`bModeNext`), jos vaihtoehtoja on enemmän kuin 12.
  - Sulkunapin toimivuus (`bExit`) ja paluu edelliselle sivulle.
- [ ] **Valinta ja tapahtumat**:
  - Rivin kosketus valitsee tilan ja lähettää `select_action_triggered`-triggerin (entity, option, index).
  - Korostuksen siirtyminen valittuun riviin ja emosivun slotin arvon päivittyminen.
  - Kaksisuuntainen ohjaus sidotulle Homey-laitteelle.

### 5.4 Ajastin ja munakello (`popupTimer`)
- [ ] **Avaus ja kosketussäätö**:
  - Ajastimen avautuminen ruudukosta tai listasta (`type: timer` tai `target: popupTimer`).
  - Minuuttien ja sekuntien säätö koskettamalla aikalukuja ja käyttämällä `+/- 1, 5, 10, 15` -painikkeita.
  - Painikkeiden tilasiirtymät: START -> PAUSE / CANCEL / STOP -> START / CANCEL.
- [ ] **Ajanotto ja hälytys**:
  - Sekunnin välein etenevä laskenta näytöllä ja taustalla.
  - Summeriäänimerkin soiminen (`playBuzzer`), kun aika saavuttaa 00:00.
  - `timer_finished_triggered`- ja `timer_action_triggered`-Flow-triggerien laukeaminen.
  - Sulkunapin toimivuus (`bExit`) ajastuksen jatkuessa taustalla.

### 5.5 Valojen säätöikkuna (`popupLight` / Älyvalot)
- [ ] **Avaus ja ulkoasu**:
  - Säätöikkunan avautuminen ruudukosta tai listasta valon painalluksella (`type: light` tai `target: popupLight`).
  - Avaaminen Flow-toiminnolla `show_light_popup_action`.
  - Sulkunapin toimivuus (`bExit`) ja paluu edelliselle sivulle.
- [ ] **Kirkkaus, värilämpötila ja väripyörä**:
  - Pääkytkimen On/Off-toiminta ja virtatilan synkronointi.
  - Kirkkaussäätimen (0..100 %) vaste ja arvon siirtyminen (`dim`).
  - Värilämpötilasäätimen (0..100 %) vaste ja kuvakkeen värin dynaaminen lämpeneminen/viileneminen Kelvin-arvon mukaan.
  - Väriympyrän kosketuspisteen muuntuminen Hue/Saturation-arvoiksi ja oikean värisävyn asettuminen valolle.
- [ ] **Kaksisuuntainen synkronointi ja Flow-kortit**:
  - Homey-laitteen tilan muutos päivittää säätöikkunan reaaliajassa.
  - `light_action_triggered`-triggeri laukeaa kaikista säätötoimenpiteistä oikeilla tokeneilla (`onoff`, `brightness`, `color_temp`, `hue`, `saturation`).
  - `set_light_state_action`-toiminto päivittää valon tilan paneelille ilman ikkunan uudelleenavausta.

### 5.6 Verhojen ja sälekaihtimien säätöikkuna (`popupShutter`)
- [ ] **Avaus ja ulkoasu**:
  - Säätöikkunan avautuminen ruudukosta tai listasta (`type: shutter` tai `target: popupShutter`).
  - Avaaminen Flow-toiminnolla `show_shutter_popup_action`.
  - Sulkunapin toimivuus (`bExit`) ja paluu edelliselle sivulle.
  - Rullaverho vs. sälekaihdin: jos sälesäätöä ei ole määritelty / laitteella ei ole `windowcoverings_tilt_set`, tilttisäätimet pysyvät piilossa.
- [ ] **Asennon ja kulman säätö**:
  - Asennon liukusäätimen (0..100 %) vaste ja laitteen ohjaus (`windowcoverings_set`).
  - Nosto/lasku/seis -painikkeiden toiminta (`up`, `down`, `stop`).
  - Sälekulman liukusäätimen ja tilttinappien toiminta (`tiltSlider`, `tiltOpen`, `tiltStop`, `tiltClose` -> `windowcoverings_tilt_set`).
  - `cardEntities` -listanäkymän suorien Up/Stop/Down-pikatoimintojen toimivuus rivillä.
- [ ] **Kaksisuuntainen synkronointi ja Flow-kortit**:
  - Homey-laitteen asennon/kulman muutos päivittää säätöikkunan ja slotin reaaliajassa.
### 5.7 Hälytinjärjestelmä ja Heimdall (`cardAlarm`)
- [ ] **Kaksisuuntainen synkronointi (Heimdall / Homey)**:
  - Heimdallin tilamuutos (`disarmed` -> `armed` / `partially_armed`) päivittää hälytyssivun tilan ja kuvakkeet välittömästi.
  - Paneelin purkunappi (`disarm`) päivittää tilan Homeyn hälytyslaitteelle.
- [ ] **Käyttäjälähtöinen navigoinnin lukitus**:
  - Kun hälytin ei ole viritettynä (`disarmed`): vapaa selaus muille sivuille (kaaviot, sää, kytkimet, asetukset).
  - Kun hälytin on viritettynä (`armed_home`, `armed_away`, `armed_night`, `arming`, `triggered`): kaikki poistumisyritykset (`bPrev`, `bNext`, `bExit`, sivuvalinnat) on estetty. Paneeli pysyy hälytyssivulla.
- [ ] **Lepotilasta herääminen (`wake_to_alarm`)**:
  - Kun asetus on päällä, näytönsäästäjän sulkeutuessa paneeli herää suoraan hälytinsivulle, vaikka se olisi ollut toisella sivulla lepotilan aktivoituessa.
- [ ] **PIN-koodin syöttö ja virheenkäsittely**:
  - Väärän PIN-koodin syöttö soittaa virhesummerin (`buzzer 1,2,1,1`), hälytys pysyy päällä ja Flow-triggeri `alarm_pin_failed` laukeaa syötetyllä koodilla.
  - Oikea PIN purkaa hälytyksen ja soittaa kuittausäänen.

### 5.8 NSPanel Studio UX -toiminnot
- [ ] **Sivujen järjestys ja monistus**:
  - Sivujen siirtäminen ylös ja alas listassa (▲ / ▼) muuttaa sivujen järjestystä luotettavasti.
  - Sivun duplikointi (⧉) luo identtisen kopion aktiivisesta sivusta uutena sivuna.
- [ ] **Älykäs laitetunnistus (Smart Slot Detection)**:
  - Valittaessa kaihdinlaite, slotin tyypiksi valikoituu automaattisesti `shutter`.
  - Valittaessa valaisinlaite, tyypiksi valikoituu automaattisesti `light`.
  - Valittaessa puhallinlaite, tyypiksi valikoituu automaattisesti `fan`.
  - Valittaessa kytkin tai mittari, valikoituu vastaavasti `switch` tai `text`.

### 5.9 PIN-koodisuojaus (ruudut, sivut & cardUnlock)
- [ ] **Ruutukohtainen PIN-suojaus (Slot PIN)**:
  - Ruudun kosketus avaa välittömästi `cardUnlock`-näppäimistön.
  - Toiminto (esim. rele 1/2 tai lukon avaus) ei tapahdu ennen PIN-koodin syöttämistä.
  - Väärä PIN soittaa 2-äänisen virhesummerin ja laukaisee `alarm_pin_failed`-triggerin; toiminto ei toteudu.
  - Oikea PIN soittaa kuittauksen, palaa sivulle ja suorittaa toiminnon.
  - Poistuminen (`bExit`) peruuttaa toiminnon turvallisesti ja palaa takaisin sivulle.
- [ ] **Sivukohtainen PIN-suojaus (Page PIN)**:
  - Suojatulle sivulle siirtyminen (painikkeesta tai valikosta) avaa `cardUnlock`-näppäimistön.
  - Oikea PIN avaa sivun; väärä PIN pitää paneelin aiemmalla sivulla.
- [ ] **Flow-ohjaus (`show_unlock_page`)**:
  - Näppäimistön avautuminen halutulla otsikolla Flow'sta.

### 5.10 Yötila & kirkkauden ajastus
- [ ] **Aikataulutettu siirtymä**:
  - Paneelin siirtyminen yötilaan määrättynä aikana (esim. 22:00) ja paluu aamulla (esim. 07:00).
  - Yötilan himmeämpi aktiivinen kirkkaus ja musta OLED-taustateema.
  - Lepotilan nopea sammutus (esim. 15 s) ja täysi pimeys lepotilassa (0 %).
- [ ] **Heimdall-integraatio (`night_follow_alarm`)**:
  - Hälyttimen kytkentä yöviritykseen (`armed_night` / `partially_armed`) aktivoi yötilan välittömästi kellonajasta riippumatta.
  - Hälyttimen purku palauttaa tilan normaaliksi.
- [ ] **Flow-kortit**:
  - `set_night_mode` (`on` / `off` / `auto`) pakottaa tai palauttaa yötilan.
  - `set_brightness` muuttaa kirkkautta reaaliajassa.
  - `is_night_mode`-ehto ja `night_mode_changed`-triggeri reagoivat oikein.

### 5.11 Termostaatin lisäsäätöikkuna (`popupThermo`)
- [ ] **Avaus ja ulkoasu**:
  - Avaaminen `cardThermo`-ruudulta detail-painikkeella (`btDetail`), ruudukon slotista (`type: thermostat`) tai Flow-kortilla `show_thermo_popup_action`.
  - Otsikkorivien ja tilapainikkeiden näkyminen selkeästi (Rivi 1: Toimintatila, Rivi 2: Esiasetus, Rivi 3: Puhallin).
  - Sulkunapin toimivuus (`bExit`) ja paluu termostaattikortille.
- [ ] **Tilojen valinta ja synkronointi**:
  - Painikkeen napautus korostaa valitun tilan ja lähettää `thermostat_mode_changed`-triggerin.
  - Sidotun Homey-termostaatin `thermostat_mode` päivittyy rivin 1 valinnasta.
  - `set_thermo_mode_action`-Flow-kortti päivittää aktiivisen tilan lennosta.

---

## 6. Kehittäjän Työkalut & Komennot

- **Yksikkötestit**:
  ```bash
  npm test
  ```
- **Homey-sovelluksen validointi**:
  ```bash
  npx homey app validate -l debug
  ```
- **Käännös**:
  ```bash
  npm run build # (tsc)
  ```
