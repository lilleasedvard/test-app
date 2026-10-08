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

// Farge per kategori. Samme farger brukes i forklaringen på kartet og i listen.
const KATEGORIER = {
  "Stupetårn": "#0077b6",
  "Klippe": "#c2410c",
  "Bro": "#7c3aed",
};
const valgteKategorier = new Set(Object.keys(KATEGORIER));

// Høyeste hopp i meter, eller null hvis høyden ikke er kjent.
function hoyesteHopp(sted) {
  return sted.hoyder.length ? Math.max(...sted.hoyder) : null;
}

function hoydeTekst(sted) {
  const h = hoyesteHopp(sted);
  return h === null ? "ukjent høyde" : `opptil ${h} m`;
}

// Dybde fra Kartverkets sjøkart, f.eks. «dybde 6–10 m».
function dybdeTekst(sted) {
  if (!sted.dybde) return "";
  const { min, maks } = sted.dybde;
  return maks && maks !== min ? `dybde ${min}–${maks} m` : `dybde ${min} m`;
}

function tegn() {
  markorer.forEach((m) => m.remove());
  markorer = [];
  listeEl.innerHTML = "";

  const synlige = steder
    .filter((s) => valgteKategorier.has(s.kategori))
    // Steder med ukjent høyde vises bare når filteret står på 0.
    .filter((s) => minHoyde === 0 || (hoyesteHopp(s) ?? -1) >= minHoyde)
    .map((s) => ({ ...s, avstand: avstandKm(posisjon, s) }))
    .sort((a, b) => a.avstand - b.avstand);

  if (synlige.length === 0) {
    listeEl.innerHTML = "<li>Ingen steder passer filteret.</li>";
    return;
  }

  for (const s of synlige) {
    const farge = KATEGORIER[s.kategori] || KATEGORIER["Stupetårn"];
    const hoyder = s.hoyder.length
      ? s.hoyder.map((h) => `${h} m`).join(", ")
      : "høyde ikke kjent";
    const dybde = dybdeTekst(s);
    const popup = `<strong>${s.navn}</strong><br>${s.type}: ${hoyder}${dybde ? `, ${dybde}` : ""}<br>${s.beskrivelse}`;
    const markor = L.circleMarker([s.lat, s.lng], {
      radius: 9,
      color: "#ffffff",
      weight: 2,
      fillColor: farge,
      fillOpacity: 1,
    })
      .addTo(kart)
      .bindPopup(popup);
    markorer.push(markor);

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="topp">
        <strong><span class="prikk" style="background:${farge}"></span>${s.navn}</strong>
        <span class="avstand">${formaterAvstand(s.avstand)}</span>
      </div>
      <div class="info">${[s.sted, s.type, hoydeTekst(s), dybde].filter(Boolean).join(" · ")}</div>`;
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

// Forklaring nederst til venstre på kartet.
const forklaring = L.control({ position: "bottomleft" });
forklaring.onAdd = () => {
  const div = L.DomUtil.create("div", "forklaring");
  div.innerHTML = Object.entries(KATEGORIER)
    .map(([navn, farge]) => `<div><span class="prikk" style="background:${farge}"></span>${navn}</div>`)
    .join("");
  return div;
};
forklaring.addTo(kart);

// Avkrysningsbokser for hvilke typer steder som vises.
const kategoriEl = document.getElementById("kategorier");
for (const [navn, farge] of Object.entries(KATEGORIER)) {
  const label = document.createElement("label");
  label.className = "kategori";
  label.innerHTML = `<input type="checkbox" checked value="${navn}">
    <span class="prikk" style="background:${farge}"></span>${navn}`;
  label.querySelector("input").addEventListener("change", (e) => {
    if (e.target.checked) valgteKategorier.add(navn);
    else valgteKategorier.delete(navn);
    tegn();
  });
  kategoriEl.appendChild(label);
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
    // Glideren går opp til det høyeste hoppet i dataene.
    const maks = Math.max(...steder.map((s) => hoyesteHopp(s) ?? 0));
    if (maks > 0) hoydeEl.max = maks;
    statusEl.textContent = "Viser avstand fra Oslo sentrum. Trykk for å bruke din posisjon.";
    tegn();
  })
  .catch(() => {
    statusEl.textContent = "Klarte ikke å laste badestedene.";
  });
