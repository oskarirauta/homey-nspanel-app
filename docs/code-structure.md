# Paneelikoodin rakenne

## Vastuut

| Tiedosto | Vastuu | Riippuvuudet |
| --- | --- | --- |
| `drivers/nspanel/device.ts` | Homey-laitteen elinkaari, tapahtumien reititys, nykyinen paneelitila ja palvelujen yhdistäminen | Homey, palvelut ja paneelimoduulit |
| `lib/panel/interaction-queue.ts` | Tapahtumien sarjoitus, komentovirheen erottaminen ohjelmointivirheestä ja virhettä edeltävän jonon mitätöinti | Ei Homey- tai näyttöriippuvuuksia |
| `lib/panel/display-snapshot.ts` | Ohjauksen koskemien paikallisten näyttöarvojen talteenotto ja palautus | Ei Homey-riippuvuuksia |
| `lib/panel/light-control.ts` | Valoponnahdusikkunan painallukset, arvot, komentosarja ja toimintatiedot | Rajattu `ControlContext`, `Color` |
| `lib/panel/shutter-control.ts` | Verhoponnahdusikkunan painallukset, arvot, komentosarja ja toimintatiedot | Rajattu `ShutterControlContext` |
| `lib/panel/fan-control.ts` | Puhaltimen nopeus-, päälle/pois- ja Flow-esiasetustapahtumat | Rajattu `ControlContext` |
| `lib/panel/select-control.ts` | Tilavalitsimen indeksit, Homey-tunnisteet ja Flow-vaihtoehdot | Rajattu `SelectControlContext` |
| `lib/panel/thermo-control.ts` | Termostaatin toimintatila-, esiasetus- ja puhallinrivien tapahtumat | Rajattu `ThermoControlContext` |
| `lib/panel/popup-presenter.ts` | Yhteinen sivunavaus ja vain uusimman avauksen viivästetty päivitys | Lähetys-, ajastus- ja aktiivisuustarkistuksen callbackit |
| `lib/panel/timer-control.ts` | Ajastimen alkutila, tapahtumat, ajanlaskenta ja tilasiirtymät | Tyypitetyt callbackit ja annettu kello, ei Homey-riippuvuutta |
| `lib/panel/state-defaults.ts` | Viiden ohjaintyypin yhteiset oletustilat ja uudet itsenäiset tilaoliot | Vain tietomallityypit |
| `lib/panel/value-sources.ts` | Ponnahdusikkunoiden Homey-arvot ja Flow-syötön suodatus | Tyypitetty lähdelukija, ei Homey-riippuvuutta |
| `lib/panel/media-control.ts` | Mediapainallukset, äänenvoimakkuus ja Homey-komennot | Rajattu `MediaControlContext` |
| `lib/panel/control-context.ts` | Ohjainten käyttämät tyypitetyt palvelurajapinnat | Vain tyyppiriippuvuuksia |
| `lib/panel/models.ts` | Tallennettavan sivun ja kuuden ohjaintyypin nimetyt tilatyypit | Vain Page-tyyppiviittaus, ei ajonaikaista riippuvuutta |
| `lib/panel/popups.ts` | Puhallin-, tilavalitsin-, ajastin-, valo-, verho- ja termostaattiponnahdusikkunan HMI-komentojen muodostus | `Color`, `Icon` |
| `lib/page.ts` | Korttien komentomuodostus sekä vanhojen `Page.Generate…Popup`-nimien yhteensopivuusrajapinta | Ponnahdusikkunamoduuli ja muut korttiapurit |
| `lib/bindings.ts` | Homey-laitteiden yhteydet, tila-arvot, ominaisuuskohtainen komentojono ja virheen jälkeinen lukeman päivitys | Homey API |

## Ohjauksen kulku

1. Laiteohjain antaa paneelitapahtuman `InteractionQueue.run`-metodille.
2. Tapahtuman alkaessa laiteohjain tarkistaa, saako sen käsitellä, ja ottaa näyttöarvoista palautuspisteen. Jonoon lisäyshetken tilaa ei käytetä.
3. Homey-komennot kulkevat `InteractionQueue.command`-metodin ja BindingServicen kautta. Laiteohjain huolehtii siitä, että komentoja odotetaan ennen onnistumispalautetta.
4. Komentovirhe palauttaa paikalliset näyttöarvot, mitätöi vanhan jonon ja kutsuu laiteohjaimen virheilmoitusta. Se ei peru Homeylle jo toimitettuja komentoja.
5. Ohjelmointivirhe hylkää tapahtuman normaalisti. Sitä ei esitetä laitteen yhteysvirheenä. Myöhemmät tapahtumat voivat silti jatkaa.

Laiteohjain omistaa ilmoituksen näyttämisen ja kuittauksen, PIN-käsittelyn, tilat sekä varsinaiset Homey-kutsut. Jonotusmoduuli saa nämä vain rajattujen callbackien kautta; sille ei anneta koko laiteoliota.

`BindingService`-jono ja paneelin tapahtumajono ovat eri asioita: ensimmäinen järjestää saman Homey-ominaisuuden komennot myös usealta paneelilta, jälkimmäinen järjestää yhden paneelin käyttöliittymätapahtumat.

Puhaltimen ja tilavalitsimen tilakartat käyttävät nyt nimettyjä tyyppejä aiemman `any`-tyypin sijaan. Vanhan tallennetun sivun `slots`- ja `rawOptions`-rakenteita ei tässä muutettu; niiden tiukentaminen vaatii erillisen asetusten yhteensopivuustarkistuksen.

## Yhteensopivuus ja testit

`Page.GenerateFanPopup`, `Page.GenerateInputSelectPopup`, `Page.GenerateTimerPopup`, `Page.GenerateLightPopup`, `Page.GenerateShutterPopup` ja `Page.GenerateThermoPopup` sekä niiden tyypit säilyvät entisillä nimillä. Niiden toteutukset ovat nyt `lib/panel/popups.ts`:ssä. Sitä ei pidä tuoda takaisin riippuvaiseksi `Page`-moduulista, jotta vältetään kehämäinen riippuvuus.

Ohjainmoduuli palauttaa `true`, kun tapahtuma käsiteltiin tai tunnistettu säätö torjuttiin. `false` jättää esimerkiksi navigoinnin laiteohjaimen käsiteltäväksi. Laitekomennon virhe välitetään muuttamattomana vuorovaikutusjonolle; onnistumisen triggeriä ja renderöintiä ei suoriteta sen jälkeen.

Aja `npm test`. `test_controls` testaa valo-, verho-, puhallin-, tilavalitsin- ja termostaattimoduulit ilman Homey-luokkaa. `test_pages` tarkistaa komentomuodot, `test_commands` jonon ja palautuksen sekä laiteohjaimen integraation. Muut testit kattavat esimerkiksi Flow-reitityksen ja PIN-käsittelyn. Julkaisua ennen aja myös `homey app build`.

## Jatkojako

`device.ts` on nykyisin noin 1 800 riviä. Sen Flow-, sivu-, popup-, yötila-, linkitys- ja MQTT-vastuita on siirretty `drivers/nspanel/modules`-kansioon. Alla kuvattu `lib/panel`-jako toimii tämän rinnalla. Viiden ohjaintyypin tapahtumamoduulit sekä ponnahdusikkunan esittäminen on nyt erotettu. Ajastimen tapahtumat, alkutila ja ajanlaskenta on myös erotettu. Viiden muun ohjaintyypin oletustilat ovat nyt yhteisessä `state-defaults.ts`-moduulissa. Ponnahdusikkunoiden lähdearvojen yhdistäminen ja Flow-syötön etusijasäännöt on koottu `value-sources.ts`-moduuliin. Verhokortin rivipainikkeiden käsittely on vielä laiteohjaimessa. Näille määritellään rajattu palvelurajapinta (arvon luku, komennon lähetys, Flow-triggeri ja näkymän päivitys). Koko laiteolion välittäminen `any`-tyyppisenä uuteen tiedostoon vain siirtäisi nykyiset riippuvuudet piiloon.

Studion selaimessa ajettava koodi pidetään erillään näistä palvelinmoduuleista. Sen seuraavat luontevat kokonaisuudet ovat laitevalitsin, lähde-editorit ja tallennus.

## Ponnahdusikkunan elinkaari

Paneelin `pageOpenDetail` käyttää samoja `open…Popup`-metodeja kuin Flow, mutta parametrilla `sendPageCmd=false`: paneeli on jo vaihtanut sivua ja tarvitsee vain tiedot. Samat metodit lukevat myös Homey-linkityksen tilan. Puhaltimen ja tilavalitsimen taustapäivitykset käyttävät samaa alustusreittiä; tietosisällön lähetys on `send…Update`-metodeissa.

`PopupPresenter` vaihtaa tarvittaessa sivun ja lähettää tiedot 100 ms myöhemmin. Viivästetty työ saa avauskohtaisen numeron. Uusi avaus tai mitätöinti estää vanhan työn, vaikka saman ohjaimen sama entiteetti avattaisiin uudelleen. Lisäksi tarkistetaan, että ikkuna on yhä aktiivinen. Korttisivulle tai lepotilaan siirtyminen sekä ilmoituksen avaaminen tyhjentävät vanhat ponnahdusikkunatunnisteet. Laitteen sulkeminen mitätöi odottavan päivityksen.

`test_popup_lifecycle` vertailee kaikkien kuuden ponnahdusikkunatyypin kahta avausreittiä ja kattaa nopean vaihdon, sulkemisen, saman entiteetin uudelleen avaamisen sekä työn mitätöinnin. PIN-tarkistus jää reitityksessä avauksen edelle.

## Ajastin

`TimerController` käyttää annettua `now()`-kelloa ja absoluuttista päättymisaikaa, joten myöhässä tuleva päivitys ei hidasta ajanlaskentaa. Tauotus tallettaa jäljellä olevan ajan; jatkaminen muodostaa uuden päättymisajan. Peruuttaminen ja valmistuminen poistavat vanhan päättymisajan.

Laiteohjain omistaa edelleen yhden yhteisen päivitysintervallin, Homeyn Flow-triggerit, äänimerkin ja näyttöpäivitykset. Paneelin `timer-…`-tapahtumat kulkevat saman ohjauksen kautta kuin Flow-kortit. `createTimerState` ja `initialTimerDuration` muodostavat ajastimen alkutilan; tallennettu kesto säilyy erillään vaihtuvasta näyttötekstistä.

`test_timer` testaa ilman Homeyta useita ajastimia, tauotusta ja jatkamista, viivästynyttä päivitystä, kerran tapahtuvaa valmistumista, vanhan päättymisajan poistamista, käynnissä olevan ajan muuttamista ja paneelin aika-arvon tulkintaa. `npm test` ajaa myös tämän testin.

## Oletustilat

`createFanState`, `createSelectState`, `createLightState`, `createShutterState` ja `createThermoState` palauttavat aina uuden tilaolion. Niitä käyttävät laiteohjaimen avaus- ja Flow-reitit sekä erilliset tapahtumamoduulit. Tilan jakamista eri paneelien tai entiteettien kesken ei tehdä.

Näkymäkohtaiset arvot annetaan eksplisiittisinä ylikirjoituksina. Nolla, `false` ja tyhjä merkkijono säilyvät ylikirjoituksina. Jo olemassa olevaa tilaa ei korvata oletuksilla. Termostaattinäkymän asetukset sovelletaan vasta uutta tilaa muodostettaessa, kuten aiemminkin. Homey-lukemien ja Flow-syötön etusijajärjestystä ei tässä muutettu.

## Ponnahdusikkunoiden tietolähteet

`filterPopupFlowValues` estää Homey-lähteeseen sidottujen ensisijaisten arvojen korvaamisen Flow-näyttöpäivityksellä. Otsikot, värit ja muut lisätiedot säilyvät sallittuina. Termostaatin toinen ja kolmas toimintatilarivi sekä puhaltimen esiasetukset säilyvät Flow-ohjattuina. Jos termostaatilla ei ole `thermostat_mode`-ominaisuutta, myös sen toimintatila voidaan syöttää Flow’lla.

`applyHomeyPopupValues` lukee viiden ohjaintyypin tunnetut ominaisuudet ja muuntaa esimerkiksi Homeyn 0–1-arvon paneelin prosentiksi tai puhaltimen asteikolle. Sitä käyttävät sekä avaukset ja taustapäivitykset että näyttötilaa päivittävät Flow-metodit. Näin ensimmäinenkin Flow-otsikko-/väripäivitys voi hyödyntää Homeyn lukemaa ilman ponnahdusikkunan aikaisempaa avaamista.

Nolla ja `false` ovat kelvollisia lukemia. Puuttuva arvo, `null`, `NaN` tai ääretön numero ei korvaa aiempaa näyttöarvoa. Jos aiempaa lukemaa ei ole, olemassa oleva alustettu tila säilyy; moduuli ei väitä sitä tuoreeksi mittaukseksi eikä ota Flow-tilaa automaattiseksi varalähteeksi.

Tämä moduuli koskee ponnahdusikkunoiden arvoja. Energia-, sää-, lämpötila- ja muiden korttien yleiset lähteet pysyvät niiden nykyisissä palveluissa. Laitetta ohjaavat Flow-kortit ovat eri toiminto kuin näyttötilan syöttäminen.

`test_value_sources` kattaa etusijan, lisätiedot, puuttuvat ja virheelliset arvot, nollan ja epätoden sekä termostaatin lisärivit. Ponnahdusikkunoiden integraatiotestissä tarkistetaan myös ensimmäinen Homeyyn sidottu Flow-näyttöpäivitys.

## Mediasoitin

Mediasoittimen paneelitapahtumat käsitellään `media-control.ts`-moduulissa. Laiteohjain valitsee nykyisen mediakortin linkityksen ja välittää komennot yhteiseen virheenkäsittelyyn. Tunnetut laitekomennot odotetaan ennen Flow-triggeriä; omat `media-…`-toiminnot voivat edelleen käyttää Flow’ta.

Äänenvoimakkuuden tyhjä tai virheellinen arvo hylätään. Kelvollinen nolla säilyy nollana ja prosentti rajataan välille 0–100. Sekä `volumeSlider` että `media-volume` käyttävät tapahtuman arvoa. Flow saa saman rajatun prosenttiarvon, joka lähetetään Homeylle 0–1-asteikolla. `test_controls` kattaa nämä tapaukset, mediakomennot ja virheen etenemisen ennen onnistumistriggeriä.

## Studion tallennus

`settings/studio-save.js` omistaa muutosten seurannan, paneelikohtaiset luonnokset, yhteisten sääasetusten tallennuksen sekä tallennuspalkin tilan. Se ladataan `index.html`-tiedoston aiemman tallennuslohkon paikalla ennen `studio-ux.js`:ää. Nykyiset editorit kutsuvat samoja `markStudioDirty`- ja `saveStudioChanges`-funktioita.

Tallennus käyttää aloitushetken arvoja ja muutosnumeroita. Pyynnön aikana tehdyt uudet muutokset jäävät tallennettaviksi. Paneelin vaihtaminen säilyttää keskeneräiset näkymät, asetukset ja lähdelinkitykset paneelikohtaisesti. `test_studio.cjs` tarkistaa myös vaihtamisen molempiin suuntiin.

Studion poistot kuuluvat myös `studio-save.js`:lle: paneelikohtainen `studioDeletions` säilyttää palvelimen sivutunnisteen. Sivut pysyvät luonnoksessa tunnisteineen onnistuneeseen poistoon asti. Tallennus lähettää sivujen päivitykset ennen poistoja ja säilyttää epäonnistuneet poistot uudelleenyritystä varten. Tunnetut saapuvat navigointilinkit ja viimeisen sivun suoja tarkistetaan ennen poistoa.

## Studion tietolähdevalitsin

`settings/studio-sources.js` sisältää lähdevalinnan, Homey-laitevalitsimen, hakemisen ja toimintotyyppien suodatuksen sekä valitsimen käyttämän tilan. Se ladataan ennen HTML:ään jääviä korttikohtaisia linkityseditorien funktioita, tallennusmoduulia ja `studio-ux.js`:n diagnostiikkalaajennusta. Globaalit rajapinnat on säilytetty tässä erotuksessa; niitä voidaan myöhemmin rajata erikseen. Muutos ei muuta lähteiden etusijaa eikä tallennusmuotoa.

## Studion sivuhallinta

`settings/studio-pages.js` sisältää sivujen luonnin, nimeämisen, järjestämisen, kopioinnin ja poistovahvistuksen sekä otsikon, tyypin ja navigoinnin editoritoiminnot. Se ladataan ennen HTML:n sovellustilaa ja alustusta; funktiot käyttävät tilaa vasta kutsuttaessa. Varsinainen poistojen jono ja tallennus ovat edelleen `studio-save.js`:ssä.

Luonti ja nimeäminen tarkistavat varatut tunnisteet. Nimeäminen päivittää myös paneelin painikkeiden sivunvaihtolinkit ja merkitsee paneeliasetukset tallennettaviksi. Ulkoisia Flow-viittauksia tämä ei muuta.

`settings/studio-status.js` päivittää paneelien saatavuuden erillään luonnoksista. Se käyttää nykyistä `/devices`-rajapintaa mutta kopioi vain `available`-arvot. Samaaikaiset tarkistukset yhdistetään, virhe näytetään tuntemattomana tilana ja automaattinen tarkistus ohitetaan piilotetulla sivulla.

## Korttien linkityseditorit

`settings/studio-card-bindings.js` muodostaa termostaatin, mediasoittimen, hälyttimen ja kaavion Homey-linkityseditorit. Se käyttää yhteistä `sourceEditor`-valitsinta ja säilyttää korttikohtaiset esitäytöt sekä lähteen vaihdon. Moduuli ladataan ennen Studion alustusta; funktioita kutsutaan vasta editoria avattaessa. Energia- ja slot-linkityseditorit ovat `studio-slot-bindings.js`:ssä; paneeliasetusten editorit ovat vielä HTML:ssä.

`settings/studio-slot-bindings.js` muodostaa ruutujen ja energianäkymän lähdevalinnat, ajastimen kestokentät sekä energian oletusarvo-, virtaussuunta- ja nopeuskenttien näkyvyyden. Erotus säilyttää aiemman laskennan ja kenttien käyttäytymisen.

`settings/studio-panel-settings.js` sisältää lämpötilojen näkyvyyden, paneelikohtaiset sää-/lämpötila-/painikelähteet sekä yhteisten sääasetusten editorin ja latauksen. Se ladataan lähdevalitsimen jälkeen ja ennen tallennuksen alustusta.

## Studion käynnistys

`settings/studio-init.js` ladataan viimeisenä. Se piirtää editorin ja tallennustilan kerran sekä käynnistää Homey-laitteiden, MQTT-asetusten, yhteisten sääasetusten ja yhteystilan latauksen. `onHomeyReady` ohjaa samaan idempotenttiin käynnistykseen. Editorimoduulien rekisteröinti ja käyttöliittymän ensimmäinen piirto tapahtuvat näin erikseen; save-, UX- ja statusmoduulit eivät enää kukin käynnistä näkymää itsenäisesti.

Ruudun, lepotilan ja energian lomakkeiden latausfunktiot kutsuvat linkityseditoria suoraan. Näiden viiden toiminnon `originalLoad…`/`originalSlotActionChange`-kääreet on poistettu. Aikainen paluu puuttuvan sivun tai lomake-elementin vuoksi pysäyttää myös linkityseditorin rakentamisen.

Paneelin vaihdon järjestys on keskitetty `studio-save.js`:n `onDeviceChange`-funktioon: vanhan luonnoksen talteenotto, `loadStudioDeviceData`, kohdepaneelin luonnoksen palautus, yksi editoripiirto sekä yhteys- ja tallennustilan päivitys. Tietolähteitä ei enää vaihdeta editoripiirron jälkeen erillisessä kääreessä.

`studio-panel-settings.js` säilyttää virheelliset kenttätekstit paneelikohtaisessa `panelInputErrors`-kartassa erillään kelvollisista asetusarvoista. `studio-save.js` tarkistaa tämän tilan myös silloin, kun käyttäjä on siirtynyt pois paneeliasetuksista. Lomakkeen uudelleenlataus palauttaa valitun paneelin virhetekstit ja validointiviestit.

`settings/studio-energy.js` omistaa energialomakkeen täytön, solmujen valinnan ja muokkauksen, liikesuunnan/nopeuden asetukset sekä energian oletusmallin. Homey-lähdevalintojen muodostus on edelleen `studio-slot-bindings.js`:ssä ja esikatselu HTML:n piirtofunktioissa.

## Korttien lomaketoiminnot

`settings/studio-card-forms.js` sisältää termostaatin, median, hälyttimen ja QR-kortin lomakearvojen käsittelyn. Se käyttää nykyisiä sivutiloja, DOM-kenttiä ja piirtokutsua; asetusten tallennusmuoto säilyy ennallaan. Tiedosto ladataan ennen alustusta, mutta funktiot suoritetaan vasta käyttäjän toimesta tai editoria ladattaessa. Esikatselun piirto on erotettu `studio-preview.js`:ään.

## Studion esikatselu

`settings/studio-preview.js` omistaa `renderScreen`-reitityksen, korttien piirron, termostaatin esikatselun, simuloidun navigoinnin ja symbolivalinnan. Se käyttää yhteistä sivu- ja paneelitilaa sekä editorin navigointi- ja lomakefunktioita. `escapeHtml` ja energia-arvojen apufunktiot säilyvät jaettuina riippuvuuksina. Moduuli ladataan ennen alustusta eikä suorita piirtoa latauksen yhteydessä.

## Pikamallit ja yhteiset MQTT-asetukset

`settings/studio-presets.js` muodostaa pikamallien sivut ja lataa valitun sivun editoriin. `settings/studio-mqtt.js` käsittelee MQTT-tilan, yhteiset asetukset ja yhteyskokeen. Molemmat käyttävät nykyisiä globaaleja rajapintoja ja ladataan ennen `studio-save.js`:ää ja `studio-init.js`:ää. Tallennusmoduulin pikamallien muutosmerkintä säilyy käytössä.

## Laitekohtaiset palvelumoduulit

`drivers/nspanel/modules` sisältää `flow-manager.ts`, `page-manager.ts`, `popup-manager.ts`, `nightmode-manager.ts`, `binding-manager.ts` ja `mqtt-handler.ts`. `device.ts` kokoaa nämä Homey-laitteen elinkaareen. Moduulien olemassaolo on tarkistettu nykyisestä projektista; niitä ei pidä enää ehdottaa erotettaviksi uutena työnä. Seuraava katselmointi koskee rajapintoja ja elinkaaren yhteistoimintaa, ei saman tiedostojaon toistamista.
