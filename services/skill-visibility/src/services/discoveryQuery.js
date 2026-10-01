const aliases = {
  carpenter: ["carpenter", "carpentry", "wood", "furniture"],
  carpentry: ["carpenter", "carpentry", "wood", "furniture"],
  plumber: ["plumber", "plumbing"],
  plumbing: ["plumber", "plumbing"],
  electrician: ["electrician", "electrical", "electricity"],
  electrical: ["electrician", "electrical", "electricity"],
  tutor: ["tutor", "tutoring", "teacher", "lesson"],
  teacher: ["tutor", "tutoring", "teacher", "lesson"],
  mechanic: ["mechanic", "garage", "auto"],
  tailor: ["tailor", "tailoring", "sewing"],
  tailoring: ["tailor", "tailoring", "sewing"],
  cleaner: ["cleaner", "cleaning"],
  cleaning: ["cleaner", "cleaning"],
  driver: ["driver", "driving", "transport", "trucker"],
  transport: ["driver", "driving", "transport", "trucker"],
  trucker: ["driver", "driving", "transport", "trucker"],
};
// Common English/French service words share a search group; stored content is unchanged.
for (const group of [
 ['carpenter','carpentry','menuisier','menuiserie'],
 ['plumber','plumbing','plombier','plomberie'],
 ['electrician','electrical','électricien','electricien','électricité','electricite'],
 ['tutor','teacher','enseignant','professeur','cours'],
 ['mechanic','mécanicien','mecanicien','mécanique','mecanique'],
 ['tailor','tailoring','couturier','couturière','couturiere','couture'],
 ['cleaner','cleaning','nettoyage'],
 ['driver','transport','trucker','chauffeur','transporteur'],
 ['hair-beauty','coiffure','coiffeur','coiffeuse','beauty','hairdresser'],
 ['catering','traiteur','restauration'],
 ['painting','painter','peinture','peintre'],
]) {
 const terms=[...new Set(group.flatMap(word=>[word,...(aliases[word]||[])]))];
 for(const word of group) aliases[word]=terms;
}
const text = (value) =>
  typeof value === "string" ? value.trim().slice(0, 200) : "";
function number(value, fallback, min, max) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !value.trim())
    throw new Error("Invalid search number.");
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max)
    throw new Error("Search coordinates, radius or page are out of range.");
  return n;
}
export function discoveryQuery(input) {
  const hasGeo = input.lat !== undefined || input.lng !== undefined;
  const lat = number(input.lat, null, -90, 90),
    lng = number(input.lng, null, -180, 180);
  if (hasGeo && (lat === null || lng === null))
    throw new Error("Both latitude and longitude are required.");
  const radius = number(input.radius_km, 20, 1, 100);
  const page = number(input.page, 1, 1, 1000);
  if (!Number.isInteger(page)) throw new Error("Page must be an integer.");
  const params = [];
  const bind = (v) => {
    params.push(v);
    return "$" + params.length;
  };
  const filters = [
    "s.status='active'",
    "u.status='active'",
    "u.role='provider'",
    "u.gps_consent_at IS NOT NULL",
    "u.gps_consent_version='provider-gps-v1.2'",
    "u.gps_consent_withdrawn_at IS NULL",
  ];
  for (const key of ["country", "region", "city", "area", "category"])
    if (text(input[key]))
      filters.push(`LOWER(s.${key}) = LOWER(${bind(text(input[key]))})`);
  if (input.provider_id !== undefined)
    filters.push(
      `s.provider_id=${bind(number(input.provider_id, null, 1, Number.MAX_SAFE_INTEGER))}`,
    );
  const tokens = text(input.q)
    .toLowerCase()
    .split(/[\s,;|/]+/)
    .filter((t) => t.length >= 2)
    .slice(0, 8);
  for (const token of tokens) {
    const clauses = (aliases[token] || [token]).map((term) => {
      const placeholder = bind("%" + term.replace(/[\\%_]/g, "\\$&") + "%");
      return [
        "s.title",
        "s.category",
        "s.tags",
        "s.description",
        "s.city",
        "s.area",
        "s.region",
        "s.division",
        "u.display_name",
      ]
        .map((c) => `${c} ILIKE ${placeholder}`)
        .join(" OR ");
    });
    filters.push("(" + clauses.join(" OR ") + ")");
  }
  let distance = "NULL::double precision";
  if (hasGeo) {
    const a = bind(lat),
      b = bind(lng);
    distance = `(6371 * 2 * ASIN(SQRT(LEAST(1.0,GREATEST(0.0,
      POWER(SIN(RADIANS(s.lat-${a})/2),2) + COS(RADIANS(${a}))*COS(RADIANS(s.lat))*POWER(SIN(RADIANS(s.lng-${b})/2),2))))))`;
    filters.push(`${distance} <= ${bind(radius)}`);
  }
  const sql = `SELECT s.id,s.title,s.category,s.tags,LEFT(s.description,280) AS description,
    s.country,s.region,s.city,s.area,s.created_at,u.id AS provider_id,u.display_name,
    ${distance} AS distance_km
    FROM skills s JOIN users u ON u.id=s.provider_id WHERE ${filters.join(" AND ")}
    ORDER BY ${hasGeo ? "distance_km ASC," : ""} s.created_at DESC,s.id DESC LIMIT 13 OFFSET ${bind((page - 1) * 12)}`;
  return { sql, params, page, radius, hasGeo, tokens };
}
