// Standardposisjon hvis brukeren ikke deler sin egen: Oslo sentrum.
const STANDARD_POSISJON = { lat: 59.9139, lng: 10.7522 };

let steder = [];
let posisjon = STANDARD_POSISJON;
let minHoyde = 0;
let markorer = [];
let brukerMarkor = null;

const kart = L.map("kart").setView([posisjon.lat, posisjon.lng], 10);

// Innebygd bakgrunnskart (Norges kystlinje) som ligger under kartflisene.
// Det vises hvis flisene fra OpenStreetMap ikke kan lastes, f.eks. uten nett
// eller i forhåndsvisninger som blokkerer eksterne bilder.
kart.createPane("land");
kart.getPane("land").style.zIndex = 150;
fetch("data/norge.geojson")
  .then((r) => r.json())
  .then((data) => {
    L.geoJSON(data, {
      pane: "land",
      interactive: false,
      style: { color: "#9aa5ae", weight: 0.6, fillColor: "#f2efe6", fillOpacity: 1 },
    }).addTo(kart);
  })
  .catch(() => {});

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: "© OpenStreetMap-bidragsytere · Kystlinje: Kartverket",
}).addTo(kart);

const statusEl = document.getElementById("status");
const listeEl = document.getElementById("liste");
const hoydeEl = document.getElementById("min-hoyde");
const hoydeVerdiEl = document.getElementById("min-hoyde-verdi");

// Avstand i km mellom to punkter (haversine-formelen).
function avstandKm(a, b) {
  const R = 6371;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formaterAvstand(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function hoyesteHopp(sted) {
  return Math.max(...sted.hoyder);
}

function tegn() {
  markorer.forEach((m) => m.remove());
  markorer = [];
  listeEl.innerHTML = "";

  const synlige = steder
    .filter((s) => hoyesteHopp(s) >= minHoyde)
    .map((s) => ({ ...s, avstand: avstandKm(posisjon, s) }))
    .sort((a, b) => a.avstand - b.avstand);

  if (synlige.length === 0) {
    listeEl.innerHTML = "<li>Ingen steder med så høye hopp.</li>";
    return;
  }

  for (const s of synlige) {
    const hoyder = s.hoyder.map((h) => `${h} m`).join(", ");
    const popup = `<strong>${s.navn}</strong><br>${s.type}: ${hoyder}<br>${s.beskrivelse}`;
    const markor = L.circleMarker([s.lat, s.lng], {
      radius: 9,
      color: "#ffffff",
      weight: 2,
      fillColor: "#0077b6",
      fillOpacity: 1,
    })
      .addTo(kart)
      .bindPopup(popup);
    markorer.push(markor);

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="topp">
        <strong>${s.navn}</strong>
        <span class="avstand">${formaterAvstand(s.avstand)}</span>
      </div>
      <div class="info">${s.sted} · ${s.type} · opptil ${hoyesteHopp(s)} m</div>`;
    li.addEventListener("click", () => {
      kart.setView([s.lat, s.lng], 14);
      markor.openPopup();
    });
    listeEl.appendChild(li);
  }
}

function finnMeg() {
  if (!navigator.geolocation) {
    statusEl.textContent = "Nettleseren din støtter ikke posisjon.";
    return;
  }
  statusEl.textContent = "Henter posisjonen din …";
  navigator.geolocation.getCurrentPosition(
    (p) => {
      posisjon = { lat: p.coords.latitude, lng: p.coords.longitude };
      statusEl.textContent = "Viser steder nærmest deg.";
      if (brukerMarkor) brukerMarkor.remove();
      brukerMarkor = L.circleMarker([posisjon.lat, posisjon.lng], {
        radius: 8,
        color: "#d62828",
      })
        .addTo(kart)
        .bindPopup("Du er her");
      kart.setView([posisjon.lat, posisjon.lng], 11);
      tegn();
    },
    () => {
      statusEl.textContent =
        "Fikk ikke tilgang til posisjonen. Viser avstand fra Oslo sentrum.";
    }
  );
}

document.getElementById("finn-meg").addEventListener("click", finnMeg);
hoydeEl.addEventListener("input", () => {
  minHoyde = Number(hoydeEl.value);
  hoydeVerdiEl.textContent = minHoyde;
  tegn();
});

fetch("data/spots.json")
  .then((r) => r.json())
  .then((data) => {
    steder = data;
    statusEl.textContent = "Viser avstand fra Oslo sentrum. Trykk for å bruke din posisjon.";
    tegn();
  })
  .catch(() => {
    statusEl.textContent = "Klarte ikke å laste badestedene.";
  });
