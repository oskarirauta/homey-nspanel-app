# NSPanel Homey -sovellus – Julkaisusuunnitelma (ROADMAP2)

Tämä dokumentti täydentää alkuperäistä ROADMAP.md:tä ja kirjaa yhteisen suunnitelman projektin saattamiseksi julkaisukuntoon. Tavoitteena on vakaa, kattava NSPanel Studio useimmille käyttäjille sekä Flow-laajennettavuus vaativampiin tarpeisiin. Sovellus luovutetaan toiselle kehittäjälle julkaisun jälkeen, joten kaiken tulee olla mahdollisimman valmista ja hyvin dokumentoitua.

## Visio

- **NSPanel Studio** mahdollistaa paneelin konfiguroinnin ilman koodia: sivut, kortit, linkitykset, pikamallit ja perusohjaus.
- **Flow-integraatio** tarjoaa reitin edistyneemmille skenaarioille: mukautetut komennot, dynaaminen sisältö, ulkoiset tietolähteet ja logiikka jota Studio ei kata.
- Sovellus on **julkaisukelpoinen** kun automaattiset testit, fyysiset käyttökokeet, dokumentaatio ja kielenhallinta ovat riittävällä tasolla.

## Nykytilanne (30.9.2026)

### Valmiit osa-alueet

- Moduulijako: `device.ts` pilkottu kuuteen vastuukokonaisuuteen (`drivers/nspanel/modules/`).
- Ilmoitusten elinkaari: korvaava ilmoitus säilyttää paluukohteen; vanha viivästetty piirto ei piirry uuden näkymän päälle; poistetulta paluusivulta palataan oletussivulle.
- Sisäinen `showNotification`: viivästetty sisällön lähetys suojattu `viewRevision`-tarkistuksella; regressiotesti lisätty.
- Studion pilkkominen: tallennus, lähdevalinta, sivuhallinta, korttilomakkeet, esikatselu, pikamallit ja MQTT-asetukset omissa moduuleissaan.
- Flow-korttien regressiokorjaukset: popupit, ilmoitukset, summeri, media, termostaatti, QR, energia, kaavio.
- MQTT-elinkaari: LWT-ajastusten sukupolvitunniste, vanhojen callbackien mitätöinti, laitteen purun siivous.
- Lokalisointirakenne: `locales/en.json` ja `fi.json` ovat avaimiltaan yhtenevät (44/44).

### Keskeneräiset / avoimet

| Teema | Tilanne | Seuraava askel |
| --- | --- | --- |
| **Englanninkielinen kattavuus** | `locales/en.json` ja `fi.json` ovat avaimiltaan yhtenevät (44/44), mutta **Studio-tiedostoissa on 261 kovakoodattua suomenkielistä tekstiä 14 tiedostossa** (`index.html`, `studio-*.js`). Nämä eivät ole locales-järjestelmässä. | Kaikki Studion UI-tekstit siirretään `locales/en.json` + `fi.json`; koodi käyttää `Homey.__()` -kutsuja. Tavoite: sovellus on täysin englanninkielinen oletuksena, suomi valinnaisena. |
| Fyysinen hyväksymiskoe | Automaattiset testit läpäisevät; oikean paneelin kokeet puuttuvat | PIN/popup/lepotila-yhteistoiminta, kahden paneelin MET-haku, yhteyskatkot |
| Studion selainkatselmointi | Toiminnallisuus valmis; visuaalinen tarkistus tekemättä | Kapea/leveä näkymä, tallennuspalkki, Homey-valitsin, kahden paneelin luonnokset |
| Poiston hyväksymiskoe | Tallennusmalli ja virheenkäsittely testattu ohjelmallisesti | Poistomerkintä, peruminen ja uudelleenyritys oikeassa asetusikkunassa |
| Korttilomakkeiden validointi | Termostaatin nolla ja median äänenvoimakkuus korjattu | Min/max-kenttien keskinäinen validointi, yhtenäinen virhepalaute |
| Tyylit | HTML:ssä; erottaminen seuraava rakenteellinen kokonaisuus | CSS-moduulin muodostus ja latausjärjestys |
| **Vienti/tuonti/paneelien välinen kopiointi** | Ei toteutettu; **sisältyy julkaisulaajuuteen** | Versioitu JSON-muoto, esikatselu ennen tuontia, laitelinkitysten uudelleenkohdistus, Flow-/ajastintunnisteiden käsittely (säilytä vs. luo uudet) |
| Uudet kortit ja laajemmat ohjaimet | Odottaa vakautusta | Valitaan vasta yllä olevien jälkeen |
| device.ts:n lisäpilkkominen | ~1 888 riviä; kuusi moduulia jo erotettu | Arvioidaan seuraavat kohteet (ks. alla) |

## device.ts:n lisäpilkkomissuunnitelma

Nykyinen `device.ts` (~1 888 riviä) sisältää vielä useita selkeitä vastuukokonaisuuksia jotka voi irrottaa omiin moduuleihinsa:

1. **NextionEventProcessor** (`processNextionEvent`, `processSlotInteraction`, `handleNextionEvent`) – paneelin tapahtumien tulkinta ja reititys. Noin 400 riviä.
2. **DeviceInteractions** (`handleFanInteraction`, `handleThermoInteraction`, `handleSelectInteraction`, `moveShutter`, `controlTimer`) – laitekohtaiset ohjauskomennot. Noin 150 riviä.
3. **PopupOpeners** (`openLightPopup`, `openShutterPopup`, `openFanPopup`, `openSelectPopup`, `openTimerPopup`, `openThermoPopup` + vastaavat setState-metodit) – popupien avaus ja tilan päivitys. Noin 120 riviä.
4. **FlowRegistration** (`registerFlowActions`, Flow-ehtojen rekisteröinti) – Flow-korttien sitominen. Noin 120 riviä.
5. **LifecycleTimers** (`scheduleDeviceTimer`, `cancelDeviceTimer`, käynnistys-/asetusviiveet) – ajastinten hallinta. Noin 60 riviä.

Jäljelle jäävä `device.ts` olisi noin 900–1 000 riviä ja keskittyisi alustukseen (`onInit`/`onUninit`), asetusten käsittelyyn (`onSettings`), MQTT-viestien vastaanottoon (`onMessage`) ja moduulien väliseen koordinaatioon.

**Periaate:** jokainen uusi moduuli saa vain tarvitsemansa rajapinnan (tyypitetty viite deviceen tai PageManageriin), ei koko `any`-oliota. Testit päivitetään vastaamaan uutta rakennetta ennen kuin muutos merkitään valmiiksi.

## Julkaisukriteerit

Sovellus on julkaisukelpoinen kun:

- [ ] Kaikki automaattiset testit (`npm test`) läpäisevät.
- [ ] Homey CLI build ja debug-validointi läpäisevät.
- [ ] **Kielenhallinta**: kaikki UI-tekstit ovat englanniksi oletuksena; suomi saatavilla valinnaisena kielenä. Kovakoodattuja tekstejä ei ole.
- [ ] Fyysinen hyväksymiskoe on suoritettu vähintään kahdella paneelilla:
  - [ ] Perusnavigointi, sivunvaihto, lepotila/herätys
  - [ ] Popupit (valo, verho, puhallin, valitsin, ajastin, termostaatti)
  - [ ] PIN-lukitus ja aseistettu hälytystila
  - [ ] Flow-ilmoitukset ja summeri
  - [ ] Yhteyskatko ja uudelleenyhdistyminen
  - [ ] Kahden paneelin yhteinen MET-sääpalvelu
- [ ] Studion selainkatselmointi on tehty (kapea/leveä, tallennus, valitsimet).
- [ ] Poiston, nimeämisen ja kopioinnin käyttökoe on suoritettu Studiossa.
- [ ] Vienti/tuonti ja paneelien välinen kopiointi on toteutettu ja testattu.
- [ ] Dokumentaatio: asennusohje, Studion käyttöopas, Flow-korttien referenssi, tunnetut rajoitteet, API-dokumentti.
- [ ] CHANGELOG ja versionumerointi ajan tasalla.
- [ ] Luovutuspaketti: README, CONTRIBUTING, LICENSE, arkkitehtuurikuvaus, moduulikaaviot.

## Työjärjestys

Priorisoitu järjestys ottaen huomioon katselmuksen suositukset ja julkaisutavoite:

1. **Englanninkielinen kattavuus** – kaikki kovakoodatut tekstit locales-järjestelmään; en-fi-pariteetti.
2. **Fyysinen hyväksymiskoe** (rinnakkain kohdan 3 kanssa) – paljastaa regressiot joita automaattiset testit eivät kata.
3. **Studion selainkatselmointi** – visuaalinen laatu ennen julkaisua.
4. **Poiston hyväksymiskoe** – tallennusmallin viimeinen varmistus.
5. **Korttilomakkeiden validointi** – termostaatin min/max, yhtenäinen virhepalaute.
6. **Tyylit** – CSS-moduulin erottaminen.
7. **Vienti/tuonti/paneelien välinen kopiointi** – versioitu JSON, esikatselu, linkitysten uudelleenkohdistus.
8. **device.ts:n lisäpilkkominen** – rakenne kuntoon ennen ominaisuuslaajennuksia.
9. **Uudet kortit** – vasta kun yllä olevat ovat vakaita.

## Flow vs. Studio -raja

| Ominaisuus | Studio | Flow |
| --- | --- | --- |
| Sivujen ja korttien luonti | ✅ | ❌ |
| Laitteiden linkitys | ✅ | ✅ (täydentävä) |
| Pikamallit | ✅ | ❌ |
| Sää ja lämpötilat | ✅ (MET, Flow-syöttö) | ✅ (ulkoinen lähde) |
| Mukautetut komennot | ❌ | ✅ |
| Dynaaminen sisältö | Rajoitetusti | ✅ |
| Monimutkainen logiikka | ❌ | ✅ |
| Ulkoiset API:t | ❌ | ✅ |
| Vienti/tuonti | ✅ (suunniteltu) | ❌ |

Studio kattaa valtaosan peruskäytöstä. Flow on reitti kaikkeen mitä Studio ei tee – tämä raja pidetään selkeänä dokumentaatiossa ja käyttöliittymässä.

## Muistiinpanot

- Alkuperäinen ROADMAP.md säilyy historiallisena viitteenä; tämä dokumentti on aktiivinen suunnitelma.
- Päivitä tätä dokumenttia jokaisen merkittävän muutoksen jälkeen.
- Fyysiset käyttökokeet kirjataan tähän dokumenttiin tuloksineen.
- Luovutusvalmius edellyttää, että kaikki yllä mainitut julkaisukriteerit täyttyvät.