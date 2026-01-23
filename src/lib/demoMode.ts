// Demo Mode Configuration
// Controls which features are available in the demo

export type DemoMode = "search" | "commerce";

// Wear & Tear categories only for commerce mode
export const WEAR_AND_TEAR_CATEGORIES = [
  "filters",
  "brakes", 
  "electrical",
  "fluids",
  "wipers",
];

export interface DemoConfig {
  mode: DemoMode;
  features: {
    cart: boolean;
    entitlements: boolean;
    finCode: boolean;
    preferredDealer: boolean;
    pricing: "list" | "entitlement";
    checkout: boolean;
    fleet: boolean;
    wearAndTearOnly: boolean;
    riskAnalysis: boolean;      // Bayesian risk engine
    cohortComparison: boolean;  // Compare to cohort
    weatherResponsive: boolean; // Weather-responsive UI
    dtcSparklines: boolean;     // DTC trend sparklines
  };
  labels: {
    title: string;
    subtitle: string;
    ctaLabel: string;
  };
  categories: string[] | "all";
}

export const DEMO_CONFIGS: Record<DemoMode, DemoConfig> = {
  search: {
    mode: "search",
    features: {
      cart: false,
      entitlements: false,
      finCode: false,
      preferredDealer: false,
      pricing: "list",
      checkout: false,
      fleet: false,
      wearAndTearOnly: false,
      riskAnalysis: false,
      cohortComparison: false,
      weatherResponsive: false,
      dtcSparklines: false,
    },
    labels: {
      title: "Ford Parts Search",
      subtitle: "Search OEM and aftermarket parts by keyword, part number, or category",
      ctaLabel: "View Details",
    },
    categories: "all",
  },
  commerce: {
    mode: "commerce",
    features: {
      cart: true,
      entitlements: true,
      finCode: true,
      preferredDealer: true,
      pricing: "entitlement",
      checkout: true,
      fleet: true,
      wearAndTearOnly: true,
      riskAnalysis: true,
      cohortComparison: true,
      weatherResponsive: true,
      dtcSparklines: true,
    },
    labels: {
      title: "Fleet Wear & Tear",
      subtitle: "Order wear and tear parts with fleet pricing",
      ctaLabel: "Add to Cart",
    },
    categories: WEAR_AND_TEAR_CATEGORIES,
  },
};

// Get current demo mode from URL or default
export function getDemoMode(): DemoMode {
  if (typeof window === "undefined") return "commerce"; // SSR default
  
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  
  if (mode === "search") return "search";
  return "commerce";
}

export function getDemoConfig(): DemoConfig {
  return DEMO_CONFIGS[getDemoMode()];
}

// URL helpers
export function getSearchModeUrl(): string {
  return "/?mode=search";
}

export function getCommerceModeUrl(): string {
  return "/?mode=commerce";
}
