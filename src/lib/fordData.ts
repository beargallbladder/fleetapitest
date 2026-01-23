// Ford-Specific Data Sources
// TSBs, FSAs, SSMs, Warranty, VIN Decode

// ============ TECHNICAL SERVICE BULLETINS (TSBs) ============
// Ford issues these for known issues that aren't safety recalls

export interface TechnicalServiceBulletin {
  bulletinNumber: string;
  issueDate: string;
  title: string;
  summary: string;
  affectedModels: string[];
  affectedYears: number[];
  affectedSystems: string[];
  laborTime: string; // e.g., "1.2 hrs"
  partsRequired: string[];
  severity: "critical" | "high" | "medium" | "low";
}

// Mock TSB data (in reality, this would come from Ford's dealer portal)
export const mockTSBs: TechnicalServiceBulletin[] = [
  {
    bulletinNumber: "TSB-24-2401",
    issueDate: "2024-03-15",
    title: "10R80 Transmission Shudder at Low Speeds",
    summary: "Some vehicles may exhibit a shudder or vibration during light acceleration between 25-45 mph. Reprogram PCM and replace transmission fluid.",
    affectedModels: ["F-150", "Expedition", "Navigator"],
    affectedYears: [2018, 2019, 2020, 2021, 2022],
    affectedSystems: ["Transmission"],
    laborTime: "2.5 hrs",
    partsRequired: ["XT-10-QLVC", "FT-180"],
    severity: "high",
  },
  {
    bulletinNumber: "TSB-24-2398",
    issueDate: "2024-02-28",
    title: "Intermittent Engine Misfire - 3.5L EcoBoost",
    summary: "Vehicles may experience intermittent misfire and rough idle. Replace spark plugs and update PCM calibration.",
    affectedModels: ["F-150", "Expedition", "Transit"],
    affectedYears: [2020, 2021, 2022, 2023],
    affectedSystems: ["Engine", "Ignition"],
    laborTime: "1.8 hrs",
    partsRequired: ["SP-589", "DG-511"],
    severity: "medium",
  },
  {
    bulletinNumber: "TSB-24-2385",
    issueDate: "2024-01-20",
    title: "Water Pump Seal Leak - 5.0L V8",
    summary: "Coolant leak from water pump area. Replace water pump assembly and thermostat housing gasket.",
    affectedModels: ["F-150", "Mustang"],
    affectedYears: [2018, 2019, 2020, 2021],
    affectedSystems: ["Cooling"],
    laborTime: "3.2 hrs",
    partsRequired: ["PW-550", "RH-180", "VC-13DL-G"],
    severity: "high",
  },
  {
    bulletinNumber: "TSB-23-2312",
    issueDate: "2023-11-15",
    title: "HVAC Blend Door Actuator Click/Knock Noise",
    summary: "Clicking or knocking noise from dashboard during temperature changes. Replace blend door actuator.",
    affectedModels: ["F-150", "F-250", "F-350", "Expedition"],
    affectedYears: [2021, 2022, 2023],
    affectedSystems: ["Climate Control"],
    laborTime: "1.0 hrs",
    partsRequired: ["YH-1900"],
    severity: "low",
  },
  {
    bulletinNumber: "TSB-23-2298",
    issueDate: "2023-10-05",
    title: "Battery Drain - APIM Module Not Sleeping",
    summary: "Vehicles may experience battery drain when parked. Update SYNC module software.",
    affectedModels: ["F-150", "Explorer", "Bronco", "Mustang Mach-E"],
    affectedYears: [2021, 2022, 2023, 2024],
    affectedSystems: ["Electrical", "SYNC"],
    laborTime: "0.5 hrs",
    partsRequired: [],
    severity: "medium",
  },
  {
    bulletinNumber: "TSB-23-2267",
    issueDate: "2023-08-22",
    title: "Power Running Board Motor Failure",
    summary: "Running boards may not extend or retract properly. Replace running board motor assembly.",
    affectedModels: ["F-150", "Expedition", "Navigator"],
    affectedYears: [2019, 2020, 2021, 2022],
    affectedSystems: ["Electrical", "Body"],
    laborTime: "1.5 hrs",
    partsRequired: ["WPT-980"],
    severity: "low",
  },
  {
    bulletinNumber: "TSB-24-2415",
    issueDate: "2024-04-10",
    title: "DEF Quality Sensor False Warning - 6.7L Power Stroke",
    summary: "Diesel Exhaust Fluid quality warning illuminates despite proper DEF. Replace DEF quality sensor.",
    affectedModels: ["F-250", "F-350", "F-450"],
    affectedYears: [2020, 2021, 2022, 2023],
    affectedSystems: ["Emissions", "Exhaust"],
    laborTime: "0.8 hrs",
    partsRequired: ["DEF-50-G"],
    severity: "medium",
  },
  {
    bulletinNumber: "TSB-24-2420",
    issueDate: "2024-05-01",
    title: "Cabin Air Filter Odor - Musty Smell",
    summary: "Musty odor from HVAC vents, especially after sitting. Replace cabin air filter and clean evaporator.",
    affectedModels: ["Transit", "Transit Connect", "E-Series"],
    affectedYears: [2019, 2020, 2021, 2022, 2023],
    affectedSystems: ["Climate Control"],
    laborTime: "0.5 hrs",
    partsRequired: ["FP-88"],
    severity: "low",
  },
];

// ============ FIELD SERVICE ACTIONS (FSAs) ============
// Ford's internal service campaigns (not NHTSA recalls, but Ford-initiated)

export interface FieldServiceAction {
  fsaNumber: string;
  issueDate: string;
  expirationDate: string;
  title: string;
  summary: string;
  affectedModels: string[];
  affectedYears: number[];
  costCoverage: "full" | "partial" | "none";
  customerNotified: boolean;
  severity: "safety" | "customer_satisfaction" | "emissions";
}

export const mockFSAs: FieldServiceAction[] = [
  {
    fsaNumber: "FSA-24G01",
    issueDate: "2024-01-15",
    expirationDate: "2027-01-15",
    title: "Tailgate Latch Inspection and Replacement",
    summary: "Tailgate latch may not fully engage, causing tailgate to open unexpectedly during driving. Dealer will inspect and replace latch if necessary.",
    affectedModels: ["F-150"],
    affectedYears: [2021, 2022, 2023],
    costCoverage: "full",
    customerNotified: true,
    severity: "safety",
  },
  {
    fsaNumber: "FSA-23M05",
    issueDate: "2023-09-20",
    expirationDate: "2026-09-20",
    title: "Windshield Wiper Motor Extended Coverage",
    summary: "Wiper motor may fail prematurely. Ford extends warranty coverage to 7 years/100,000 miles.",
    affectedModels: ["Explorer", "Aviator"],
    affectedYears: [2020, 2021, 2022],
    costCoverage: "full",
    customerNotified: true,
    severity: "customer_satisfaction",
  },
  {
    fsaNumber: "FSA-24E02",
    issueDate: "2024-02-28",
    expirationDate: "2027-02-28",
    title: "Fuel Injector Software Update - 2.7L EcoBoost",
    summary: "Engine may exhibit rough idle or stalling. Dealer will update PCM calibration at no charge.",
    affectedModels: ["F-150", "Edge", "Bronco Sport"],
    affectedYears: [2021, 2022, 2023],
    costCoverage: "full",
    customerNotified: false,
    severity: "emissions",
  },
];

// ============ SPECIAL SERVICE MESSAGES (SSMs) ============
// Quick tips and diagnostic procedures for technicians

export interface SpecialServiceMessage {
  ssmNumber: string;
  issueDate: string;
  title: string;
  summary: string;
  affectedModels: string[];
  diagnosticTip: string;
}

export const mockSSMs: SpecialServiceMessage[] = [
  {
    ssmNumber: "SSM-52436",
    issueDate: "2024-04-15",
    title: "MIL On - P0456 Small EVAP Leak",
    summary: "Before replacing EVAP components, check gas cap seal and fuel filler neck for cracks.",
    affectedModels: ["F-150", "Ranger", "Maverick"],
    diagnosticTip: "Inspect gas cap gasket first. 80% of P0456 codes are caused by damaged gas cap seal.",
  },
  {
    ssmNumber: "SSM-52401",
    issueDate: "2024-03-22",
    title: "No Crank/No Start After Sitting",
    summary: "Battery tests good but vehicle won't start after sitting 3+ days.",
    affectedModels: ["F-150", "Bronco", "Mustang Mach-E"],
    diagnosticTip: "Check for module parasitic draw. APIM, BCM, and TCM are common culprits. Verify latest software installed.",
  },
  {
    ssmNumber: "SSM-52388",
    issueDate: "2024-02-10",
    title: "Brake Squeal During Light Braking",
    summary: "Normal brake squeal during light pedal application, especially in morning.",
    affectedModels: ["All"],
    diagnosticTip: "Light surface rust on rotors causes squeal. Have customer apply moderate brake pressure several times to clean rotors. Not a defect.",
  },
];

// ============ VIN DECODE ENHANCED ============
// Additional build info beyond basic YMM

export interface VINDecodeEnhanced {
  vin: string;
  buildDate: string;
  plantCode: string;
  plantLocation: string;
  bodyStyle: string;
  driveType: string;
  fuelType: string;
  gvwr: string;
  originalMsrp: number;
  factoryOptions: string[];
  packages: string[];
  warrantyStart: string;
  warrantyExpiration: {
    basic: string;
    powertrain: string;
    corrosion: string;
  };
}

// Mock enhanced VIN decode
export function getEnhancedVINDecode(vin: string): VINDecodeEnhanced | null {
  // Simulated decode based on VIN patterns
  const vinMap: Record<string, VINDecodeEnhanced> = {
    "1FTFW1E50MFA12345": {
      vin: "1FTFW1E50MFA12345",
      buildDate: "2020-11-15",
      plantCode: "KTP",
      plantLocation: "Kansas City Assembly, Missouri",
      bodyStyle: "SuperCrew Cab",
      driveType: "4WD",
      fuelType: "Gasoline",
      gvwr: "7,050 lbs",
      originalMsrp: 52495,
      factoryOptions: ["Max Trailer Tow Package", "360-Degree Camera", "LED Headlamps", "Spray-In Bedliner"],
      packages: ["XLT Chrome Appearance Package", "XLT Technology Package"],
      warrantyStart: "2021-01-15",
      warrantyExpiration: {
        basic: "2024-01-15",
        powertrain: "2026-01-15",
        corrosion: "2026-01-15",
      },
    },
    "1FT7W2BT3MED11111": {
      vin: "1FT7W2BT3MED11111",
      buildDate: "2021-02-20",
      plantCode: "KYT",
      plantLocation: "Kentucky Truck Plant, Louisville",
      bodyStyle: "Crew Cab",
      driveType: "4WD",
      fuelType: "Diesel",
      gvwr: "10,000 lbs",
      originalMsrp: 72890,
      factoryOptions: ["Gooseneck/5th Wheel Prep Package", "Upfitter Switches", "Snow Plow Prep Package"],
      packages: ["Lariat Ultimate Package", "Tremor Off-Road Package"],
      warrantyStart: "2021-03-10",
      warrantyExpiration: {
        basic: "2024-03-10",
        powertrain: "2026-03-10",
        corrosion: "2026-03-10",
      },
    },
    "1FTBW2CM5MKA67890": {
      vin: "1FTBW2CM5MKA67890",
      buildDate: "2020-09-05",
      plantCode: "KCC",
      plantLocation: "Kansas City Assembly, Missouri",
      bodyStyle: "Cargo Van - High Roof",
      driveType: "RWD",
      fuelType: "Gasoline",
      gvwr: "9,000 lbs",
      originalMsrp: 45670,
      factoryOptions: ["Heavy-Duty Trailer Tow Package", "Dual AGM Batteries", "Vinyl Floor"],
      packages: ["Exterior Upgrade Package"],
      warrantyStart: "2021-01-05",
      warrantyExpiration: {
        basic: "2024-01-05",
        powertrain: "2026-01-05",
        corrosion: "2026-01-05",
      },
    },
  };
  
  return vinMap[vin] || null;
}

// ============ FETCH FUNCTIONS ============

export function getTSBsForVehicle(model: string, year: number): TechnicalServiceBulletin[] {
  return mockTSBs.filter(tsb => 
    tsb.affectedModels.includes(model) && 
    tsb.affectedYears.includes(year)
  );
}

export function getFSAsForVehicle(model: string, year: number): FieldServiceAction[] {
  return mockFSAs.filter(fsa => 
    fsa.affectedModels.includes(model) && 
    fsa.affectedYears.includes(year)
  );
}

export function getSSMsForVehicle(model: string): SpecialServiceMessage[] {
  return mockSSMs.filter(ssm => 
    ssm.affectedModels.includes(model) || ssm.affectedModels.includes("All")
  );
}

// Get all alerts for a vehicle (TSBs + FSAs + SSMs)
export function getAllAlertsForVehicle(model: string, year: number) {
  return {
    tsbs: getTSBsForVehicle(model, year),
    fsas: getFSAsForVehicle(model, year),
    ssms: getSSMsForVehicle(model),
    totalCount: getTSBsForVehicle(model, year).length + 
                getFSAsForVehicle(model, year).length + 
                getSSMsForVehicle(model).length,
  };
}

// ============ TICKER DATA ============
// Combined feed for scrolling ticker

export interface TickerItem {
  id: string;
  type: "recall" | "tsb" | "fsa" | "ssm" | "weather" | "news";
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  subtitle: string;
  timestamp: string;
  icon: string;
}

export function generateTickerItems(): TickerItem[] {
  const items: TickerItem[] = [];
  
  // Add TSBs
  for (const tsb of mockTSBs) {
    items.push({
      id: tsb.bulletinNumber,
      type: "tsb",
      severity: tsb.severity,
      title: `TSB ${tsb.bulletinNumber}`,
      subtitle: tsb.title,
      timestamp: tsb.issueDate,
      icon: "🔧",
    });
  }
  
  // Add FSAs
  for (const fsa of mockFSAs) {
    items.push({
      id: fsa.fsaNumber,
      type: "fsa",
      severity: fsa.severity === "safety" ? "critical" : "medium",
      title: `FSA ${fsa.fsaNumber}`,
      subtitle: fsa.title,
      timestamp: fsa.issueDate,
      icon: fsa.severity === "safety" ? "⚠️" : "📋",
    });
  }
  
  // Add SSMs
  for (const ssm of mockSSMs) {
    items.push({
      id: ssm.ssmNumber,
      type: "ssm",
      severity: "info",
      title: `SSM ${ssm.ssmNumber}`,
      subtitle: ssm.title,
      timestamp: ssm.issueDate,
      icon: "💡",
    });
  }
  
  // Sort by date (newest first)
  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
