// The companion website's pages, linked from the About tab. The site's paths
// are fixed; the domain lives here once so a change lands in one place.
export const WEBSITE_URL = "https://soma-flow.app";

export const LINKS = {
  about: `${WEBSITE_URL}/`,
  research: `${WEBSITE_URL}/research/`,
  feedback: `${WEBSITE_URL}/feedback/`,
  privacy: `${WEBSITE_URL}/privacy/`,
} as const;
