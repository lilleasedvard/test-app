# Hoppesteder

En nettside som viser badestedene nærmest deg der du kan hoppe fra en høyde
(stupetårn, stupebrett, klipper).

## Funksjoner (første versjon)

- Kart (Leaflet + OpenStreetMap) med alle hoppesteder
- «Bruk min posisjon» sorterer stedene etter avstand fra deg
- Filter for minste hopphøyde
- Trykk på et sted i listen for å zoome til det på kartet

## Kjør lokalt

```sh
python3 -m http.server 8000
```

Åpne deretter http://localhost:8000.

## Data

Stedene ligger i `data/spots.json`. Dagens data er **eksempler som ikke er
verifisert**. Sjekk høyder og koordinater før siden tas i bruk.

`data/norge.geojson` er Norges fylker (kystlinje) fra Kartverket, via
[robhop/fylker-og-kommuner](https://github.com/robhop/fylker-og-kommuner).
Den brukes som bakgrunnskart når kartflisene fra OpenStreetMap ikke lastes.

## Mulige neste steg

- Hente badesteder automatisk fra OpenStreetMap (Overpass API)
- La brukere sende inn nye steder og hopphøyder
- Vise vanntemperatur og vær (f.eks. fra yr.no)
- Bilder av hvert sted, dybde, og vanskelighetsgrad
