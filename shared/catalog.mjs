/**
 * CARX ATELIER — canonical catalog (source of truth for seed + frontend fallback).
 * Prices are fictional and in USD. The server recomputes every price; the client
 * only mirrors this data as an offline fallback.
 */

export const FX_FALLBACK = { USD: 1, EGP: 48.6, AED: 3.6725, SAR: 3.75 };
export const CURRENCIES = ["USD", "EGP", "AED", "SAR"];

export const VEHICLES = [
  {
    id: "veh_m5e34",
    slug: "bmw-m5-e34-touring",
    brand: "BMW",
    model: "M5 E34 Touring",
    yearFrom: 1992,
    yearTo: 1995,
    basePriceUSD: 98000,
    glbPath: "/assets/models/bmw_m5_e34.glb",
    isActive: true,
    sort: 1,
    specs: {
      rangeKm: 560,      // tank range, heritage-style figure
      sprintSec: 4.9,    // 0-100 km/h (manual, period tests ~5.3; atelier tune)
      topSpeedKmh: 250,  // M-limited
      powerKw: 232,      // 315 PS S38B38
      engine: "S38 3.8 L I6",
    },
  },
];

export const PAINTS = [
  { id: "glacier",  vehicleId: "veh_m5e34", nameEn: "Glacier White",   nameAr: "أبيض جليدي",    hex: "#e9edf0", metalness: 0.25, roughness: 0.35, priceUSD: 0,    isDefault: true },
  { id: "graphite", vehicleId: "veh_m5e34", nameEn: "Graphite Grey",   nameAr: "رمادي غرفيت",   hex: "#454a52", metalness: 0.72, roughness: 0.32, priceUSD: 0,    isDefault: false },
  { id: "emerald",  vehicleId: "veh_m5e34", nameEn: "Emerald Deep",    nameAr: "زمرد غائر",     hex: "#0e5c46", metalness: 0.75, roughness: 0.28, priceUSD: 4200, isDefault: false },
  { id: "crimson",  vehicleId: "veh_m5e34", nameEn: "Crimson Silk",    nameAr: "حرير قرمزي",    hex: "#8a1730", metalness: 0.50, roughness: 0.30, priceUSD: 4200, isDefault: false },
  { id: "azure",    vehicleId: "veh_m5e34", nameEn: "Azure Drift",     nameAr: "أزرق انسيابي",  hex: "#1e4f96", metalness: 0.60, roughness: 0.28, priceUSD: 4200, isDefault: false },
  { id: "obsidian", vehicleId: "veh_m5e34", nameEn: "Obsidian Metal",  nameAr: "أوبيسيديان معدني", hex: "#14161a", metalness: 0.92, roughness: 0.22, priceUSD: 6800, isDefault: false },
];

export const WHEELS = [
  // styleCode maps to a rim treatment applied to the GLB wheel materials
  // (RIM_CHROME / ext_rim_metal) — real, visible material swap in the 3D model.
  { id: "aero5",     vehicleId: "veh_m5e34", nameEn: "M Parallel 5", nameAr: "بارالل ٥",       spokes: 5,  styleCode: "classic",  rimHex: "#c8ccd2", metalness: 0.95, roughness: 0.18, priceUSD: 0,    isDefault: true },
  { id: "turbine10", vehicleId: "veh_m5e34", nameEn: "Turbine 10",   nameAr: "توربين ١٠",      spokes: 10, styleCode: "machined", rimHex: "#9aa2ab", metalness: 0.85, roughness: 0.35, priceUSD: 2800, isDefault: false },
  { id: "carbon",    vehicleId: "veh_m5e34", nameEn: "Carbon Loop",  nameAr: "كاربون لوب",     spokes: 6,  styleCode: "carbon",   rimHex: "#2a2e33", metalness: 0.40, roughness: 0.55, priceUSD: 6400, isDefault: false },
];

export const ROOFS = [
  // variantCode: fixed (body colored), panorama (dark glass skin), carbon (carbon skin)
  { id: "fixed",    vehicleId: "veh_m5e34", nameEn: "Body colour",  nameAr: "بلون الهيكل",   variantCode: "fixed",    priceUSD: 0,    isDefault: true },
  { id: "panorama", vehicleId: "veh_m5e34", nameEn: "Panorama glass", nameAr: "زجاج بانوراما", variantCode: "panorama", priceUSD: 3500, isDefault: false },
  { id: "carbon",   vehicleId: "veh_m5e34", nameEn: "Carbon roof",  nameAr: "سقف كاربون",    variantCode: "carbon",   priceUSD: 5200, isDefault: false },
];

export const TRIMS = [
  // trim affects visible exterior accents: brake calipers (CAR_PinzaFreni) + rim lip
  { id: "standard", vehicleId: "veh_m5e34", nameEn: "Standard", nameAr: "قياسي", accentHex: "#8f98a3", caliperHex: "#8f98a3", priceUSD: 0,    isDefault: true },
  { id: "sport",    vehicleId: "veh_m5e34", nameEn: "M Sport",  nameAr: "إم سبورت", accentHex: "#ff5a3c", caliperHex: "#d32f2f", priceUSD: 3200, isDefault: false },
  { id: "atelier",  vehicleId: "veh_m5e34", nameEn: "Atelier",  nameAr: "أتيليه",   accentHex: "#e8c66a", caliperHex: "#c9a227", priceUSD: 7900, isDefault: false },
];

export const SHOWROOMS = [
  { id: "shr_kingston", cityEn: "Kingston Quay", cityAr: "كينجستون كواي", hallEn: "The Slate Hall", hallAr: "قاعة الأردواز", address: "18 Quay Street", phone: "+44 20 7946 0958", lat: 51.5079, lng: -0.0877, hoursJson: { thu: "10-19", fri: "10-19", sat: "11-17" } },
  { id: "shr_meridian", cityEn: "Meridian Plaza", cityAr: "ميريديان بلازا", hallEn: "Atelier Rivière", hallAr: "أتيليه ريفيير", address: "Central Concourse", phone: "+971 4 311 2233", lat: 25.2048, lng: 55.2708, hoursJson: { thu: "10-22", fri: "10-22", sat: "10-22" } },
  { id: "shr_harbour",  cityEn: "Old Harbour", cityAr: "الميناء القديم", hallEn: "Zephyr Pavilion", hallAr: "جناح الزفير", address: "Pier 7, Corniche", phone: "+20 2 2735 5559", lat: 31.2001, lng: 29.9187, hoursJson: { thu: "11-20", fri: "14-22", sat: "11-20" } },
];

/** Server-side authoritative pricing (USD). */
export function priceForConfig(vehicle, paint, wheels, roof, trim) {
  const parts = [
    Number(vehicle.basePriceUSD) || 0,
    Number(paint?.priceUSD) || 0,
    Number(wheels?.priceUSD) || 0,
    Number(roof?.priceUSD) || 0,
    Number(trim?.priceUSD) || 0,
  ];
  return parts.reduce((a, b) => a + b, 0);
}

export function configKey(vehicle, paint, wheels, roof, trim) {
  return [vehicle?.slug, paint?.id, wheels?.id, roof?.id, trim?.id].join("|");
}
