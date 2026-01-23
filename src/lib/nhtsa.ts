// NHTSA API - Real Data Only
// Recalls, Complaints, Investigations

export interface NHTSARecall {
  NHTSACampaignNumber: string;
  Manufacturer: string;
  Subject: string;
  Summary: string;
  Consequence: string;
  Remedy: string;
  ReportReceivedDate: string;
  Component: string;
  ModelYear: string;
  Make: string;
  Model: string;
}

export interface NHTSAInvestigation {
  nhtsaId: string;
  investigationType: string; // PE (Preliminary Evaluation), EA (Engineering Analysis), RQ (Recall Query), DP (Defect Petition)
  subject: string;
  description: string;
  status: string; // O (Open), C (Closed)
  openDate: string;
  latestActivityDate: string;
}

export interface NHTSAComplaint {
  odiNumber: string;
  manufacturer: string;
  crash: boolean;
  fire: boolean;
  numberOfInjuries: number;
  numberOfDeaths: number;
  dateOfIncident: string;
  dateComplaintFiled: string;
  components: string;
  summary: string;
}

// ============ RECALLS ============

export async function fetchRecalls(year: number, model: string): Promise<NHTSARecall[]> {
  try {
    const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=Ford&model=${encodeURIComponent(model)}&modelYear=${year}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error("NHTSA Recalls API error:", error);
    return [];
  }
}

export async function fetchFleetRecalls(vehicles: { year: number; model: string }[]): Promise<NHTSARecall[]> {
  const allRecalls: NHTSARecall[] = [];
  const seen = new Set<string>();
  
  // Dedupe by year/model
  const unique = vehicles.filter(v => {
    const key = `${v.year}-${v.model}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  // Fetch in parallel (max 5 concurrent)
  for (let i = 0; i < unique.length; i += 5) {
    const chunk = unique.slice(i, i + 5);
    const results = await Promise.all(chunk.map(v => fetchRecalls(v.year, v.model)));
    for (const recalls of results) {
      for (const recall of recalls) {
        if (!allRecalls.some(r => r.NHTSACampaignNumber === recall.NHTSACampaignNumber)) {
          allRecalls.push(recall);
        }
      }
    }
  }
  
  return allRecalls;
}

// ============ INVESTIGATIONS ============

export async function fetchInvestigations(): Promise<NHTSAInvestigation[]> {
  try {
    const res = await fetch("https://api.nhtsa.gov/investigations");
    const data = await res.json();
    return (data.results || []).map((r: Record<string, unknown>) => ({
      nhtsaId: r.nhtsaId || "",
      investigationType: r.investigationType || "",
      subject: r.subject || "",
      description: (r.description || "").replace(/<[^>]*>/g, ""), // Strip HTML
      status: r.status || "",
      openDate: r.openDate || "",
      latestActivityDate: r.latestActivityDate || "",
    }));
  } catch (error) {
    console.error("NHTSA Investigations API error:", error);
    return [];
  }
}

// ============ COMPLAINTS ============
// Note: NHTSA complaints API sometimes returns empty - may need different approach

export async function fetchComplaints(year: number, model: string): Promise<NHTSAComplaint[]> {
  try {
    const url = `https://api.nhtsa.gov/complaints/complaintsByVehicle?make=Ford&model=${encodeURIComponent(model)}&modelYear=${year}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error("NHTSA Complaints API error:", error);
    return [];
  }
}

// ============ VEHICLE-SPECIFIC DATA ============

export interface VehicleNHTSAData {
  recalls: NHTSARecall[];
  recallCount: number;
  openRecalls: number;
  components: string[];
}

export async function fetchVehicleNHTSAData(year: number, model: string): Promise<VehicleNHTSAData> {
  const recalls = await fetchRecalls(year, model);
  
  // Extract unique components
  const components = [...new Set(recalls.map(r => r.Component))];
  
  return {
    recalls,
    recallCount: recalls.length,
    openRecalls: recalls.length, // All returned recalls are relevant
    components,
  };
}

// ============ ALERT TYPES FOR UI ============

export interface AlertItem {
  id: string;
  type: "recall" | "investigation";
  severity: "critical" | "high" | "medium" | "info";
  title: string;
  subtitle: string;
  fullText: string;
  model?: string;
  date: string;
}

export function recallsToAlerts(recalls: NHTSARecall[]): AlertItem[] {
  return recalls.map(r => ({
    id: r.NHTSACampaignNumber,
    type: "recall" as const,
    severity: "critical" as const,
    title: r.NHTSACampaignNumber,
    subtitle: r.Component,
    fullText: r.Summary,
    model: `${r.ModelYear} ${r.Make} ${r.Model}`,
    date: r.ReportReceivedDate,
  }));
}

export function investigationsToAlerts(investigations: NHTSAInvestigation[]): AlertItem[] {
  return investigations
    .filter(i => i.status === "O") // Only open investigations
    .map(i => ({
      id: i.nhtsaId,
      type: "investigation" as const,
      severity: i.investigationType === "EA" ? "high" as const : "medium" as const,
      title: i.nhtsaId,
      subtitle: i.subject,
      fullText: i.description,
      date: i.openDate,
    }));
}
