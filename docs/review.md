# NSPanel – ajantasainen katselmointi 28.9.2026

Tämä kooste korvaa aiemman katselmoinnin suositellun jatkojärjestyksen. Tilanne perustuu projektin nykyiseen lähdekoodiin ja automaattisiin testeihin. Aiemmat päiväkohtaiset katselmoinnit ovat muutoshistoriaa, eivät enää tehtävälistoja.

## Nykytila

| Osa-alue | Toteutettu | Jäljellä |
| --- | --- | --- |
| Sää ja lämpötilat | Yhteinen MET-palvelu, välimuisti ja ajastus; paneelikohtaiset lähdevalinnat; Flow-syöttö | Usean oikean paneelin ja verkkokatkoksen käyttökokeet |
| Tietolähteiden etusija | Homey ohjaa sidottuja pääarvoja; Flow voi täydentää lisätietoja. Flow-lähde ja kiinteiden aloitusarvojen päivitys säilyvät | Ohjeiden ja todellisen käyttöliittymän yhteinen läpikäynti eri korttityypeillä |
| Valot, verhot, puhaltimet ja tilavalitsimet | Ominaisuuskohtaiset ohjaimet, Homeyn tilavaihtoehdot ja komentovirheiden käsittely | Fyysisen HMI:n tarkistus erilaisilla laitteilla |
| Ohjausvirheet | Sarjoitus, epäonnistuneen ohjauksen näyttötilan palautus, vanhojen jonotettujen painallusten mitätöinti | Yhteyskatkokset ja osittain onnistuneet komennot oikeassa Homeyssa |
| Popupit ja ajastimet | Yhteinen avauslogiikka, vanhojen viivästettyjen päivitysten esto ja absoluuttinen ajastimen päättymisaika | Fyysinen PIN-/popup-/lepotila-yhteistoiminta |
| Arvojen tarkistus | Virheelliset valo-, mediaäänenvoimakkuus- ja termostaatin asetusarvoviestit hylätään | Muiden tapahtumien tarkistus tarpeen mukaan; koko protokollaa ei ole auditoitu |
| Studion tallennus | Oma `studio-save.js`, paneelikohtaiset luonnokset, samanaikaisen muokkauksen säilyminen, muiden paneelien muutoksista kertova palkki | Poiston käyttökoe Homeyn asetusikkunassa |
| Studion tietolähdevalinta | Peruutus ei merkitse muutosta; oletus näkyy; aloitusarvon ja Homey-valinnan tekstit selkeytetty | Valitsin, sivuhallinta ja korttien lomaketoiminnot erotettu; esikatselu erotettu omaan moduuliin |
| Koodin pilkkominen | Paneeliohjaimet, popupien muodostus/elinkaari, tila-arvot, ajastin, komentojono ja Studion tallennus erotettu | `device.ts` ja `settings/index.html` ovat edelleen suuria; pilkotaan vastuu kerrallaan |

Tietolähteiden etusijan päättäminen tai puhallin-/verho-ohjainten perusrajaus eivät enää kuulu uuden työn kärkeen. Myöskään valojen tai muiden jo olemassa olevien popupien toteutusta ei pidä aloittaa uudelleen.

## Tässä katselmoinnissa korjattu

Käyttäjän ilmoittaman pysyvän Offline-tilan jatkotutkimuksessa löytyi käynnistyksen ajoitusvirhe: `onInit` merkitsi laitteen poissaolevaksi vasta MQTT-yhteyden käynnistyksen ja Homey-linkitysten latauksen jälkeen. Yhteyden jo palauttama Online-tila saattoi näin kumoutua. Alustava Offline-merkintä tehdään nyt ennen MQTT-yhteyden käynnistämistä. Regressiotesti simuloi yhteyden muodostumisen ennen linkitysten valmistumista. Käyttäjä vahvisti korjauksen toimivaksi: käynnistyvä paneeli näkyy lähes heti Online-tilassa, ja virrankatkaisu näkyy noin minuutin kuluttua. Tämä on käyttäjän raportoima käyttökokeen tulos, ei mitattu aikaraja. Manuaalinen tilapäivityspainike poistettiin, koska se ei nopeuta MQTT-katkoksen tunnistusta.

Studion paneelin yhteysmerkintä perustui vain aluksi haettuun laitelistaan. Uusi `studio-status.js` päivittää saatavuuden 15 sekunnin välein näkyvällä sivulla, ikkunaan palattaessa, paneelia vaihdettaessa automaattisesti. Vastauksen sivu- ja asetustietoja ei kopioida luonnoksiin. Tarkistuksen virhe erotetaan paneelin Offline-tilasta. Jos Homeyn oma `getAvailable()` on väärä, tämä päivitys ei peitä sitä; sellainen tapaus tarvitsee MQTT-/laitelokien tarkistuksen.

Sivuhallinnan erottamisen yhteydessä estettiin varatun `screensaver`-tunnisteen käyttäminen uudelle sivulle. Virheellisiä tunnisteita ei enää muuteta huomaamatta poistamalla merkkejä. Sivun nimeäminen päivittää myös fyysisten painikkeiden navigointikohteet ja merkitsee asetukset tallennettaviksi. Testit kattavat nämä sekä järjestämisen ja poistettavan sivun nimeämissuojan.

**Uudelleennimetyn sivun kopio peri `_renameFrom`-kentän.** Kopion tallennus saattoi tällöin käsitellä alkuperäistä palvelinsivua kopion vanhana nimenä. `duplicateCurrentPage` poistaa nyt tämän sisäisen kentän vain kopiosta. Alkuperäisen sivun odottava nimeäminen säilyy. Testi varmistaa myös, että kopion linkityksen muokkaaminen ei muuta alkuperäistä.

## Avoimet havainnot

### Sivun poisto on yhdistetty tallennukseen

Poisto merkitään paneelikohtaiseen luonnokseen. Sivun tunniste säilyy varattuna ja sivu näkyy listassa poistettavana, kunnes Tallenna onnistuu. Editorin ilmoituksesta voi perua poiston ennen tallennusta; pyynnön lähettämisen jälkeen sitä ei voi perua paikallisesti, koska aikakatkaisukin voi tarkoittaa palvelimella onnistunutta poistoa. Epäselvä lopputulos vahvistetaan uudella tallennusyrityksellä. Uuden tallentamattoman sivun poisto ei lähetä DELETE-pyyntöä. Odottavan uudelleennimeämisen poistossa käytetään palvelimelle tallennettua tunnistetta.

Virhe ja aikakatkaisu säilyttävät epäonnistuneen poiston odottavana. Usean poiston osittainen onnistuminen poistaa vain onnistuneet jonosta. Viimeistä sivua ei voi poistaa. Muista näkymistä tai paneelin painikkeista tulevat tunnetut Studio-linkit on muutettava ensin; Studio kertoo, missä linkkejä on. Ulkoisia Flow-viittauksia Studio ei pysty tarkistamaan. API palauttaa sivun muistiin, jos poistamisen tallennus epäonnistuu.

### Kopioiden toimintotunnisteet säilyvät

Sivukopio on syväkopio, mutta slotien Flow-/ajastintunnisteet ja Homey-linkitykset säilyvät samoina. Tämä voi olla käyttäjän toive, mutta erityisesti ajastimille ja Flow-kohdistukselle se voi myös yhdistää toimintoja tahattomasti. Käyttöliittymän pitää kertoa asiasta; myöhempi kopiointivalinta voi tarjota tunnisteiden säilyttämisen tai uusien muodostamisen. Olemassa olevia tunnisteita ei pidä muuttaa automaattisesti ilman näkyvää valintaa.

### Selainkokeen kattavuus

Käyttäjä ilmoitti asentaneensa sovelluksen Homeyyn jokaisen muutoksen jälkeen ja tehneensä käyttökokeita. Asennus- ja käyttökokemusta on siis myös oikeasta ympäristöstä. Yksittäisiä testitapauksia, paneelien määrää tai tuloksia ei ole tässä eritelty, joten koko hyväksymiskoetta ei merkitä suoritetuksi. Agentin uusimmat tallennus- ja lähdevalintatarkistukset ovat ohjelmallisia; selainkokeiden kattavuus varmistetaan tapauskohtaisesti.

## Suositeltu jatkojärjestys

1. **Poiston hyväksymiskoe käyttöliittymässä.** Tallennusmalli ja virheenkäsittely on nyt toteutettu ja testattu ohjelmallisesti. Tarkista poistomerkintä, peruminen ja uudelleenyritys oikeassa asetusikkunassa.
2. **Studion selainkatselmointi oikeassa asetusikkunassa.** Kapea ja leveä näkymä, tallennuspalkin vaatima tila, Homey-valitsimen avaaminen/peruminen, yhteiset sääasetukset ja kahden paneelin luonnokset. Korjaukset havaittujen ongelmien perusteella.
3. **Korttieditorien erottaminen HTML:stä pienissä ryhmissä.** Tallennus, lähdevalitsin ja sivuhallinta on erotettu omiin tiedostoihinsa. Termostaatin, median, hälyttimen ja kaavion linkityseditorit on nyt erotettu `studio-card-bindings.js`:ään. Myös slot- ja energiaeditorien linkitykset on erotettu `studio-slot-bindings.js`:ään. Paneeli- ja sääasetusten muodostus on erotettu `studio-panel-settings.js`:ään. Editorien käynnistys on nyt keskitetty viimeisenä ladattavaan `studio-init.js`:ään. Energiaeditori ja muiden korttien lomaketoiminnot ovat nyt erillisissä moduuleissa. Esikatselun piirto ja simuloitu navigointi on erotettu `studio-preview.js`:ään. Pikamallit ja MQTT-asetukset on myös erotettu omiin moduuleihinsa. Alla mainitut tallennushavainnot on korjattu. Säilytä rajapinnat ja testaa latausjärjestys.
4. **Fyysinen hyväksymiskoe ennen ominaisuuslaajennuksia.** Homeysta tulevat tilamuutokset, vain tuetut säädöt, katkeava yhteys, PIN ja popupin vaihto, ajastin taustalla sekä vähintään kaksi paneelia yhteisellä MET-haulla. Tätä voi tehdä rinnakkain kohtien 1–3 kanssa.
5. **Vienti, tuonti ja paneelien välinen kopiointi.** Versioitu tiedostomuoto, esikatselu ja laitelinkitysten uudelleenkohdistus. Päätä näkyvästi Flow-/ajastintunnisteiden säilyminen. Nykyinen saman paneelin sivukopio ei vielä korvaa tätä ominaisuutta.
6. **Uudet kortit ja laajemmat ohjaimet.** Valitaan vasta yllä olevien vakautusten ja käyttökokeiden jälkeen. Nykyinen Studio-peruskäyttö ja Flow-laajennettavuus säilyvät lähtökohtana.

## Varmennus ja rajat

`npm test` kattaa muun muassa lähdevalinnan perumisen, paneelien luonnosten palauttamisen, tallennuksen aikaiset muokkaukset, epäonnistuneet tallennukset ja nyt uudelleennimetyn sivun kopioinnin. Homey CLI:n build tarkistaa käännöksen ja debug-validoinnin. Tämän kierroksen koko testisarja sekä Homey-build ja debug-validointi läpäisivät.

Agentti ei tehnyt Homey-asennusta; käyttäjä tekee asennukset ja käyttökokeet itse. Tämä on kohdennettu katselmointi, ei kaikkien toimintojen tai laitteiden täydellinen auditointi. Fyysisen testauksen avoimet ruudut ROADMAPissa ovat edelleen avoimia, vaikka vastaavaa logiikkaa on testattu automaattisesti.

## Käyttökokeen ja rakenteen päivitys

Käyttäjä vahvisti Online-tilan esityksen tarkistetuksi ja hyväksi. Viiveellinen virrankatkaisun tunnistus on aiemmin todettu toimivaksi. Tämä ei merkitse muita hyväksymiskokeita automaattisesti suoritetuiksi.

Viisi editorien funktiokorvausta poistettiin: ruudun lataus ja toimintotyypin vaihto, lepotila-asetusten lataus sekä kodin ja energiasolmun asetusten lataus kutsuvat linkityseditoria nyt suoraan. Puuttuvan sivun/kohde-elementin vuoksi keskeytetty lataus ei enää jatka linkityseditorin rakentamiseen kääreen kautta. Paneelin vaihtamisen, tallennuksen ja diagnostiikan muut kääreet ovat vielä erillinen jatkotyö.

Paneelin vaihdon kääreet yhdistettiin yhteen ohjausfunktioon. Editorin piirto tapahtuu vasta laitetietojen ja mahdollisen luonnoksen palauttamisen jälkeen. Regressiotesti varmistaa, että paluu toisen paneelin keskeneräiseen luonnokseen piirtää oikean otsikon ja tietolähteen yhdellä kutsulla. Koko testisarja ja Homey-build läpäisivät.

Yön syvän unen aikakatkaisun nolla-arvo korjattiin Studiossa: 0 ei enää muutu 15 sekunniksi muita asetuksia muokattaessa. Tyhjä, ei-numeerinen tai alueen 0–300 ulkopuolinen syöte säilyttää aiemman luonnosarvon. Lepotilan ja himmennyksen päiväaikarajojen HTML-minimit korjattiin 20 sekuntiin Homeyn manifestin mukaisesti. Regressiotesti kattaa nollan ja virheelliset syötteet.

Paneelin yhdeksän lukukenttää käyttävät nyt yhteistä rajat tarkistavaa lukijaa: tyhjä, ei-numeerinen tai sallittujen rajojen ulkopuolinen arvo ei korvaa luonnoksen edellistä kelvollista arvoa oletuksella. Avoimen paneeliasetusnäkymän virheellinen lukukenttä estää tallennuksen ja antaa virheilmoituksen. Testit kattavat kelvolliset rajat, nollat ja estyneen tallennuksen ilman API-pyyntöä.

Yötilan alku- ja loppuajan syöttö tarkistetaan muodossa TT:MM (00:00–23:59). Tyhjä tai virheellinen syöte säilyttää viimeisen kelvollisen luonnosajan ja estää tallennuksen avoimesta asetusnäkymästä. Asetuslomakkeen uudelleenlataus tyhjentää vanhat mukautetut validointivirheet, jotta toisen paneelin virhe ei estä tallennusta. Testit kattavat virheelliset ajat, keskiyön, vuorokauden viimeisen minuutin ja virhetilan nollauksen.

Validoinnin jatkokorjaus: virheelliset paneeliasetusten numero- ja aikasyötteet säilyvät paneelikohtaisessa `panelInputErrors`-kartassa. Asetusnäkymästä poistuminen ei enää ohita tallennuksen estoa. Lomakkeen lataus poistaa edellisen paneelin DOM-virheet mutta palauttaa valitun paneelin omat virheelliset syötteet. Kelvollinen korjaus poistaa kyseisen kentän virheen. Testit kattavat näkymän vaihdon, paneelien eristyksen ja korjaamisen.

Energiasolmun otsikko, oletusteho, kuvake ja väri suojataan nyt HTML-lomakeattribuutteihin sijoitettaessa. Solmuvälilehtien ja esikatselun nimi-/tehotekstit käsitellään tekstinä, joten lainausmerkit ja kulmasulkeet eivät muuta rakennetta. Yhteinen tekstimuunnos säilyttää numeerisen nollan. Testi kattaa muodostetun energialomakkeen erikoismerkit. Tämä kohdennettu korjaus ei tarkoita kaikkien Studion HTML-interpolaatioiden auditointia.

## Pilkkomisen jäljellä oleva laajuus

Studion energiaeditori erotettiin kokonaisuutena `studio-energy.js`:ään. Termostaatin, median, hälyttimen ja QR-kortin lomaketoiminnot on nyt erotettu `studio-card-forms.js`:ään. Esikatselun piirto on erotettu `studio-preview.js`:ään. Pikamallit ja MQTT-asetukset on erotettu. Tyylit ovat seuraava rakenteellinen kokonaisuus; tallennushavainnot on korjattu. Näiden jälkeen arvioidaan hyöty uudelleen ennen pienempien apufunktioiden siirtämistä. `device.ts` sisältää nyt noin 1 800 riviä; kuusi vastuukokonaisuutta on siirretty `drivers/nspanel/modules`-kansioon; Studion pilkkomisen valmistuminen ei tarkoita koko sovelluksen refaktoroinnin valmistumista.

## Studion käynnistymisen korjaus

Käyttäjän konsoliloki osoitti virheen `window.Homey.ready is not a function`. Alustus oletti virheellisesti, että olemassa oleva Homey-olio on jo valmis SDK-rajapinta. `studio-init.js` tarkistaa nyt ready- ja api-metodien olemassaolon ja ottaa valmiin rajapinnan vastaan `onHomeyReady`-kutsussa. Homeyn latauspeite vapautetaan ennen editorin piirtämistä; synkroninen käynnistysvirhe näytetään sivulla uudelleenyrityspainikkeen kanssa.

Varmennus: koko testisarja ja Homey-build läpäisivät. Lisäksi koko HTML:n ja moduulien lataus suoritettiin jsdom-ympäristössä sekä lähdekoodilla että rakennetulla paketilla, mukaan lukien viivästetty Homey-valmius. Käyttäjä vahvisti, että modaali avautuu jälleen normaalisti.

## Korttilomakkeiden erottaminen

Termostaatti-, media-, hälytin- ja QR-lomakkeiden kuusi funktiota siirrettiin muuttamattomina `studio-card-forms.js`:ään. Moduuli ladataan ennen sovelluksen alustusta. Testit kattavat median nollaäänenvoimakkuuden, PIN-koodin etunollan, QR-sisällön ja puuttuvan sivun käsittelyn. Käynnistyskorjaus säilyy mukana.

Jatkokatselmoinnissa on tarkistettava korttilomakkeiden numeroarvot: termostaatin `parseFloat(...) || oletus` korvaa nollan oletuksella ja median `parseInt` sallii osittain numeerisen syötteen. Tässä rakenteellisessa muutoksessa niiden toimintaa ei muutettu.

Varmennus: koko `npm test`, Homey-build sekä lähde- ja build-version koko sivun jsdom-lataus viivästetyllä Homey-rajapinnalla läpäisivät.

## Esikatselun erottaminen

`studio-preview.js` sisältää korttien ja lepotilan piirtämisen, termostaatin esikatselutoiminnot, simuloidun navigoinnin ja kuvakkeiden esityksen. Noin 740 riviä siirrettiin HTML:stä muuttamatta toimintoja. Yhteinen `escapeHtml` jää toistaiseksi HTML:n apufunktioksi, sillä myös editorit käyttävät sitä. Moduuli ei käynnistä toimintaa ladattaessa.

Varmennus: koko testisarja ja Homey-build läpäisivät. Regressiotesti kattaa kaikkien korttityyppien reitityksen sekä navigoinnin sivulle, lepotilaan ja puuttuvaan kohteeseen. Koko sivun lataus viivästetyllä Homey-rajapinnalla tarkistettiin jsdomilla sekä lähde- että build-versiosta. Tämä ei korvaa visuaalista Homey-käyttökoetta.

## Pikamallit ja MQTT-asetukset

`studio-presets.js` sisältää pikamallien muodostuksen ja `studio-mqtt.js` yhteisten MQTT-asetusten latauksen, tallennuksen sekä brokerin yhteyskokeen. Molemmat ladataan ennen tallennusmoduulin toimintokääreitä ja Studion alustusta. Toiminnallisuutta ei tässä siirrossa muutettu.

Varmennus: koko testisarja ja Homey-build läpäisivät. Uudet testit käyvät läpi kaikki näkyvät pikamallit, tuoreiden sivuolioiden muodostuksen, sää- ja ajastinmallit sekä MQTT-pyynnön arvot ja yhteyskokeen virheestä palautumisen. Lähde- ja build-versioiden koko sivu käynnistettiin jsdomissa viivästetyllä Homey-rajapinnalla.

### Pikamallien ja MQTT-tallennuksen korjaukset

MQTT-asetukset tallennetaan peräkkäin ja jokaisen Homey.set-kutsun callback tarkistetaan. Virhe, synkroninen poikkeus tai 20 sekunnin aikakatkaisu estää onnistumisilmoituksen. Myöhäinen callback sivuutetaan ja päällekkäinen tallennus estetään. Osittainen tallennus kerrotaan käyttäjälle, eikä jo tallennettuja asetuksia väitetä perutuiksi. Uudelleenyritys tallentaa koko valitun asetuskokonaisuuden. MQTT-tila kirjoitetaan viimeisenä; Scanno-tilassa kirjoitetaan vain tila eikä käyttämättömiä brokeriasetuksia muuteta. Standalone-tallennus ja yhteyskoe edellyttävät osoitetta sekä kokonaislukumuotoista porttia 1–65535.

Pikamalli säilyttää sivun order- ja _renameFrom-kentät. Tallennuksen aikana, poistettavaksi merkitylle sivulle, lepotilasivulle tai puuttuvalle sivulle mallia ei aseteta. Tuntematon malli ei muuta sivua. Estetty toiminto ei merkitse luonnosta muuttuneeksi. Hälyttimen pikamallin demo-alarm-linkitys korvattiin Flow-lähteellä; käyttäjä voi valita oman Homey-laitteen editorissa.

Varmennus: koko npm test ja Homey-build läpäisivät, samoin lähde- ja build-version jsdom-käynnistys viivästetyllä Homey-rajapinnalla. Regressiotestit kattavat jokaisen MQTT-asetuksen epäonnistumisen, aikakatkaisun ja myöhäisen vastauksen, päällekkäisen tallennuksen, poikkeuksen, uudelleenyrityksen, virheelliset portit, Scanno-tilan sekä pikamallin metatietojen säilymisen ja muokkaussuojat. Homey-asennus ja todellisen brokerin käyttökoe jäävät käyttäjän tehtäviksi.

Seuraavat työvaiheet: korttilomakkeiden aiemmin kirjatut numeroarvojen validoinnit ja tyylien erottaminen HTML:stä. Tallennushavainnot on nyt korjattu.

## Nykyinen moduulijako ja korttilomakkeiden numerot

Projektin uusin lähtötilanne sisältää FlowManager-, PageManager-, PopupManager-, NightModeManager-, BindingManager- ja MqttHandler-moduulit. Tätä jakoa ei tehty uudelleen eikä näitä lähdetiedostoja muutettu tällä kierroksella. Lähtötilan koko testisarja läpäisi. Jatkossa arvioidaan erityisesti moduulien riippuvuuksia: esimerkiksi PageManager käyttää edelleen koko laiteoliota any-muunnoksen kautta. Tiedostojako on valmis tältä osin, mutta rajapintojen tarkennus on erillinen jatkotyö.

Studion termostaatin nolla-arvo ei enää korvaudu oletuksella. Myös plus/miinus-painikkeet laskevat nollasta oikein. Tyhjä, ei-numeerinen tai ääretön syöte säilyttää aiemman luonnosarvon. Median äänenvoimakkuus hyväksyy vain kokonaan numeerisen, äärellisen arvon väliltä 0–100. Nämä tarkistukset eivät lisää korttilomakkeisiin paneeliasetusten kaltaista pysyvää virhetilaa: keskeneräisestä syötteestä säilyy viimeinen kelvollinen luonnosarvo. Termostaatin min/max-kenttien keskinäinen validointi ja yhtenäinen virhepalaute ovat vielä jatkotyötä.

Varmennus: koko testisarja, Homey-build sekä lähde- ja build-version viivästetty Homey-käynnistys jsdomissa läpäisivät.

## Moduulijaon lepotilaregression korjaus

Käyttäjän ajonaikainen loki osoitti PageManager.showScreensaver-kutsussa puuttuvan dev.updateScreensaver-metodin. Vertailu ennen moduulijakoa tallennettuun lähteeseen osoitti lisäksi väärän HMI-komennon (page screensaver), puuttuvan teemapäivityksen ja lepotilan tapahtuma-/tilapäivitysten muutoksia. Metodia ei pidä lisätä tyhjänä yhteensopivuuskääreenä: showScreensaver palautettiin lähettämään pageType~screensaver sekä päivittämään sivutyyppi, teema, sää, tilakuvakkeet, kirkkaus ja uniajastin. Viivästetty sää-/kuvakepäivitys sivuutetaan, jos lepotilasta on jo poistuttu. Sää- ja tilakuvakekutsut käyttävät tyypitettyä device-viittausta.

Regressiotesti kutsuu oikeaa Device.showScreensaver -> PageManager-polkuja ja Device.setPage-reittiä, tarkistaa HMI-komennon, tilan, ajastetut päivitykset, kertaluonteisen siirtymätriggerin suoralla avauksella ja viivästettyjen päivitysten ohittamisen poistumisen jälkeen. Koko npm test ja Homey-build läpäisivät. Fyysisen paneelin lepotilakoe on vielä tehtävä. Aiemman testisarjan läpäisy ei kattanut tätä reittiä eikä siis todistanut moduulijakoa kokonaan toimivaksi.

Muiden moduulien suorien dev.metodi()-kutsujen nimivertailussa ei löytynyt muuta puuttuvaa laitemetodia. Tämä rajattu tarkistus ei kata dynaamisia any-kutsuja tai toimintojen semantiikkaa. Seuraavaksi moduulijaon käyttäytymisvertailu ja oikeat siirtymätestit ovat tärkeämpiä kuin lomakkeiden jatkokehitys. Flow-managerissa on myös vanhoja, typeof-tarkistuksen taakse jääviä updateScreensaver-kutsuja; niiden tietomallien ja päivityspolkujen arviointi on erillinen jatkotehtävä.

## Flow-moduulin regressioiden korjaus

Käyttäjä vahvisti lepotilan kaatumiskorjauksen jälkeen sovelluksen käynnistyvän. Moduulijaon vertailussa aiempaan lähteeseen löytyi FlowManagerista toiminnallisia muutoksia, ei pelkkää koodin siirtoa: sääarvot kirjoitettiin käyttämättömiin kenttiin, sääpäivitykset kutsuivat olematonta updateScreensaver-metodia typeof-suojan takaa, JSON-ennusteet viittasivat puuttuviin setForecast/setForecastOWM-metodeihin ja herätyksen kohdesivu jäi huomiotta.

Kahdeksan toimintoa palautettiin aiempaan toteutukseen: sisä- ja ulkolämpötila, lepotilan sää, yksittäinen ennustepäivä, yleinen ja OWM-JSON-ennuste, tilakuvake ja herätys. Ne käyttävät jälleen weather/indoorTemperature/flowOutdoorTemperature-tietomallia, Weather-jäsennystä ja todellisia päivitysmetodeja. Virheellinen JSON tuottaa virheen eikä näennäistä onnistumista.

Flow-toimintojen rekisteröinti kohdistaa käsittelijän nyt args.device-laitteeseen. Moduuliversion handler.bind(this.device) saattoi kohdistaa toiminnon viimeksi rekisteröineeseen paneeliin. Puuttuva laite hylätään. Testit kattavat kahden paneelin kohdistuksen, nolla- ja negatiiviset lämpötilat, molemmat JSON-syötöt, virheellisen JSONin, sääpäivityskutsut, herätyksen kohdesivun sekä tilakuvakkeen paikan.

Lepotilasta poistumisen ja wakeScreen-perusmetodin vertailu vastasi aiempaa toteutusta; tässä ei tehty niihin muutoksia. Koko npm test ja Homey-build läpäisivät. Tämä ei vielä ole kaikkien moduulien käyttäytymisauditointi. Seuraavaksi verrataan muiden Flow-toimintojen ja MQTT-elinkaaren toteutuksia sekä lisätään tarvittavat integraatiotestit. Fyysisen Homeyn Flow-käyttökoe jää vahvistettavaksi.

## Rele-, JSON- ja kirkkaus-Flow-toimintojen jatkokorjaukset

Moduulijaon vertailussa löytyi kolme lisäregressiota. set_relay_action käytti postSwitchState-metodia, joka käsittelee vastaanotettua tilaa, eikä lähettänyt Power-komentoa. Se lähettää jälleen paneelille ON/OFF/TOGGLE-komennon. update_page_config_action luki args.json-arvoa args.config-arvon sijasta ja korvasi active-sivua; se muodostaa jälleen nykyisen korttityypin komennon, päivittää currentOptions-arvon ja lähettää komennon vain lepotilan ulkopuolella. set_brightness rajoittaa jälleen kirkkauden välille 1–100 ja lepotilan kirkkauden välille 0–100, sivuuttaa ei-numeerisen arvon ja huomioi himmennystilan.

Regressiotestit tarkistavat relekomennot kaikille kolmelle tilalle, kirkkauden rajat/himmennyksen sekä JSON-päivityksen oikean argumentin, muodostetun QR-komennon ja lepotilan lähetyssuojan. Koko npm test ja Homey-build läpäisivät. Oikean paneelin rele- ja kirkkauskäyttökoe on vielä vahvistamatta.

MQTT-yhteyden muodostuksen vertailu ei osoittanut siinä uutta moduulijaon regressiota. Elinkaaren auditointi on silti kesken: vanhojen yhteyksien callbackit, ajastetut LWT-reaktiot ja uudelleenyhdistäminen tarvitsevat erilliset testit. Myös muiden Flow-korttien käyttäytymisvertailu jatkuu; tätä kierrosta ei pidä tulkita koko moduulijaon hyväksynnäksi.

## MQTT-ajastusten elinkaarikorjaus 29.9.2026

LWT Online -viestin ajastetut käynnistyskomennot eivät aiemmin peruuntuneet Offline-viestillä. MqttHandler omistaa nyt näiden ajastusten joukon ja sukupolvitunnisteen: uusi LWT, yhteyden uudelleenmääritys, suoran yhteyden sulkeutuminen ja laitteen purku mitätöivät odottavat operaatiot. Myös jo ajettavaksi jonotettu callback tarkistaa tunnisteen. Viivästetyn operaation poikkeus kirjataan käsittelemättömän Promise-virheen sijasta. Scanno-käynnistyksen viive käyttää samaa mekanismia.

Suoran MQTT-asiakkaan connect/message/close-käsittelijät tarkistavat, että asiakas on edelleen käytössä. Vanhan asiakkaan viite poistetaan ennen disconnect-kutsua. Näin korvatun asiakkaan sulkeutuminen ei pysäytä uuden yhteyden toimintaa. Async connect -käsittelijä tarkistaa lisäksi sukupolven saatavuuskutsun jälkeen. Laitteen onUninit mitätöi odottavat handler-ajastukset ja sulkee asiakkaan viitteen kautta.

Testit simuloivat Online–Offline-vaihdon ennen ajastusten suorittamista, vanhojen callbackien suorittamisen, uuden Online-jakson onnistuneen alustuksen ja ajastusten perumisen stop-kutsulla. Koko npm test ja Homey-build läpäisivät. Todellisen brokerin uudelleenyhdistämiskoe on vielä tekemättä. Tämä muutos koskee MqttHandlerin omistamia ajastuksia; device.ts:n muiden ajastusten ja asetusten uudelleenkytkentäviiveen elinkaari tarvitsee vielä erillisen katselmoinnin.

## Laiteohjaimen viivästetyt alustus- ja asetustoiminnot 29.9.2026

Device omistaa nyt nimetyt ajastukset neljälle viivästetylle käynnistyspyynnölle (kello, ajuriversio, tila, sää) sekä asetusten MQTT-uudelleenkytkennälle, online-uudelleenalustukselle ja kirkkauspäivitykselle. Saman toiminnon uusi ajastus korvaa vanhan. Callback tarkistaa edelleen oman ajastimensa voimassaolon, joten jo jonotettu vanha callback ei suorita toimenpidettä.

Offline peruu käynnistyspyynnöt sekä odottavan online-/kirkkauspäivityksen. Uusi MQTT-asetus korvaa odottavan uudelleenkytkennän ja käyttää kopioituja asetuksia. onUninit peruu kaikki tämän ryhmän ajastukset, eikä sammunut laite hyväksy uusia asetustoimintoja tai setOnline-alustusta. MQTT-uudelleenkytkentää ei peruta tavallisella Offline-tapahtumalla, koska sen tarkoitus on muodostaa uusi yhteys; purku kuitenkin peruu sen.

Regressiotesti kutsuu oikeita onSettings-, setOffline- ja onUninit-metodeja, simuloi peräkkäiset asetusmuutokset ja suorittaa tarkoituksella vanhentuneita callbackeja. Vain uusimmat asetukset johtavat yhteyden muodostamiseen; sulkemisen jälkeen ei muodostu yhteyttä. Koko npm test ja Homey-build läpäisivät. Fyysisen brokerin käyttökoe on edelleen vahvistamatta. Sivunvaihdon ilmoitusviiveen, moduulien muiden ajastusten ja kaikkien Flow-toimintojen katselmointia ei tällä merkitä valmiiksi.

## Flow-sivujen ja PIN-kohdistuksen korjaukset 29.9.2026

Kahdeksan Flow-käsittelijää verrattiin moduulijakoa edeltäneeseen lähteeseen ja palautettiin aiempaan toimintaan: grid/entities-sivun näyttäminen, kummankin ruudun asetukset, ruudun arvopäivitys, hälytyssivun näyttäminen, hälytystilan asetus ja PIN-toiminnon näyttäminen. Ruutujen asetukset lukevat jälleen entity_id/title/action_type/entity_type-argumentit, säilyttävät nolla-arvon ja käyttävät type/name/title/value-kenttiä. Arvopäivitys poistaa vanhan val-kentän eikä piirrä taustasivua tai sulje popupia. Lepotilassa ruudun asetuspäivitys ei avaa näkymää.

Hälytyskortti muodostetaan jälleen oikealla komentomuodostimella, pin_required tulkitaan Flow-valinnasta yes/no, ja disable_nav_when_armed estää navigointipainikkeet aseistetussa tilassa. Sivun näyttäminen ei korvaa active-sivun sisältöä. Tyhjä set_alarm_state ei enää poista hälytystilaa oletuksella. PIN-toiminto käyttää global_pin/asetuksen etusijaa sekä pendingUnlock.entityId- ja returnPageId-kenttiä, joita avauksen käsittely odottaa.

Uusi test_flow_pages kuuluu npm test -sarjaan ja kattaa argumentit, nolla-arvot, taustapäivityksen, hälytyksen navigoinnin ja PIN-toiminnon kohdistuksen. Koko testisarja sekä Homey-build läpäisivät. Oikean paneelin Flow- ja PIN-käyttökoe on vielä vahvistamatta. Media-, termostaatti-, energia- ja kaavio-Flow-korttien vertailua ei tällä kierroksella merkitä valmiiksi; ne ovat seuraavat tarkistuskohteet.

## Media-, termostaatti-, QR-, energia- ja kaavio-Flow-kortit 29.9.2026

Moduulijaon vertailussa palautettiin kahdeksan käsittelijän aiempi toiminta: termostaatti-, media- ja QR-sivun näyttäminen, energiasivun näyttäminen ja solmun päivitys sekä kaavion näyttäminen, datan päivitys ja uuden pisteen lisäys. Media käyttää jälleen card_title/artist/title-argumentteja ja varsinaista komentomuodostinta; termostaatti välittää lämpötilat, rajat, askeleen ja yksiköt oikeaan komentomuodostimeen. QR välittää myös tekstirivit. Nämä väliaikaiset Flow-kortit eivät korvaa Studion active-sivun rakennetta.

Energia käyttää rawOptions.home/nodes-tietomallia väärän powerNodes-rakenteen sijaan. Solmun nopeus lasketaan jälleen powerWatts/powerSpeed-apureilla, kun nopeutta ei anneta tai se on nolla. Olemassa olevat lähdelinkitykset säilyvät. Kaavio säilyttää annetun datamuodon, käyttää yAxisLabel/yAxisTicks-kenttiä ja lisää pisteen yhteisellä shiftChartValues-apurilla, joka huomioi skaalauksen ja datan muodon. Taustalla tai popupin alla olevan kortin arvopäivitys ei vaihda näyttöä.

Testit vertaavat media-, termostaatti- ja QR-komennot muodostimiin, tarkistavat nolla-arvot, tallennetun active-sivun säilymisen, energian negatiivisen tehon automaattinopeuden ja käsin annetun nopeuden, Homey-linkitysten säilymisen sekä kaaviodatan, akseliarvot ja skaalatun pisteen lisäämisen. Koko npm test ja Homey-build läpäisivät. Fyysisen paneelin korttikohtaiset käyttökokeet ovat edelleen vahvistamatta.

Jäljellä on erityisesti Flow-popupien, ilmoitusten ja summerin argumenttien vertailu sekä moduulien rajapintojen tiukentaminen. Koko moduulijakoa ei vielä merkitä auditoiduksi.

## Flow-popupit, ilmoitukset ja summeri 29.9.2026

Ilmoitus-Flow kutsui olematonta showNotificationPopup-metodia typeof-suojan takaa ja saattoi onnistua tekemättä mitään. Sen aiempi komentomuodostus on palautettu laitteen showFlowNotification-metodiin, joka käyttää heading-argumenttia, herättää näytön, lähettää popupNotify-komennot ja ylläpitää paluukohdetta. Vanha ilmoitusajastin poistetaan myös uuden aikarajattoman ilmoituksen tieltä. Callback tarkistaa oman ajastimensa ja ilmoitussivun ennen sulkemista. Summeri käyttää jälleen sound_type-valintaa ja sen viittä äänikuviota.

Kuuden popupin avaustoiminnot sekä valo-, verho-, ajastin- ja termostaattitoiminnot käyttävät jälleen siistittyä entity-tunnistetta ja suoria tyypitettyjä metodeja. Termostaatin tilapäivitys kohdistuu ilman tunnistetta aktiiviseen termostaattiin. Puhaltimen ja tilavalitsimen Flow-päivitykset säilyttävät nykyisen lähdesuodatuksen moduulissa, mutta palauttavat aktiivisen entiteetin oletuksen ja ruudun arvotekstin päivityksen.

Testit tarkistavat kuuden popupin tunnisteet, termostaatin oletuskohteen, viisi summerikuviota, ilmoituksen Flow-välityksen, todellisen laitteen ilmoituskomennot, lepotilan paluukohteen ja korvatun ajastimen eston. Koko npm test ja Homey-build läpäisivät. Oikean paneelin ilmoitus- ja summerikokeet ovat vielä vahvistamatta. Moduulien muiden tapahtuma- ja elinkaaripolkujen katselmointi jatkuu; koko sovellusta ei tällä merkitä auditoiduksi.

## Ilmoituksen paluukohde ja vanhentunut piirto 29.9.2026

Korvaava Flow-ilmoitus säilyttää alkuperäisen paluukohteen, joten lepotilasta avattu ilmoitusketju palaa edelleen lepotilaan. Ilmoituksen sulkeminen käyttää olemassa olevan oletussivun tunnistetta, jos alkuperäinen paluusivu on poistettu. Viivästetty paluusivun piirto tarkistaa näkymäsukupolven, nykyisen sivun ja popup-/lepotilan: uuden näkymän avaus tai laitteen purku mitätöi vanhan piirron. Piirtovirhe käsitellään lokiin.

Regressiotestit kattavat ilmoituksen korvaamisen ja lepotilapaluun, poistetun paluusivun, uuden popupin alle jäävän piirron estämisen sekä normaalin paluupiirron. Koko npm test ja Homey-build läpäisivät. Flow-ehtojen rekisteröinnin vertailu vastasi aiempaa toteutusta; siihen ei tehty muutoksia. Sisäisen showNotification-metodin erillinen viivästetty lähetys ja muiden sivunvaihtopolkujen katselmointi jäävät jatkoon.
