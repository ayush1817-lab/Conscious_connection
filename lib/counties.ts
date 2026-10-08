// The 26 counties of the Republic of Ireland (spec section 5; Northern Ireland
// and an "Online" option are open questions). Events store the name ("Co. Clare");
// URLs use the slug (?county=clare).
export const COUNTIES = [
  "Carlow", "Cavan", "Clare", "Cork", "Donegal", "Dublin", "Galway", "Kerry", "Kildare",
  "Kilkenny", "Laois", "Leitrim", "Limerick", "Longford", "Louth", "Mayo", "Meath", "Monaghan",
  "Offaly", "Roscommon", "Sligo", "Tipperary", "Waterford", "Westmeath", "Wexford", "Wicklow",
].map((name) => ({ slug: name.toLowerCase(), name: `Co. ${name}` }));

export const COUNTY_NAMES = COUNTIES.map((c) => c.name);

export function countyBySlug(slug: string | undefined | null) {
  return COUNTIES.find((c) => c.slug === slug) ?? null;
}

export function isCounty(name: string) {
  return COUNTY_NAMES.includes(name);
}
