#!/usr/bin/env python3
"""
Fleet Lead Scoring Engine
=========================
Calculates Maintenance Severity Score (0-100) for vehicle fleets
based on environmental factors that cause vehicle wear.

Usage:
    python fleet_lead_scorer.py --zips 60601,10001,90210,80202,98101
    python fleet_lead_scorer.py --file zipcodes.txt
    python fleet_lead_scorer.py --demo

Requirements:
    pip install uszipcode geopy

Author: Fleet Intelligence System
"""

import json
import argparse
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from math import radians, sin, cos, sqrt, atan2

# Try to import uszipcode, fall back to mock data if not available
try:
    from uszipcode import SearchEngine
    HAS_USZIPCODE = True
except ImportError:
    HAS_USZIPCODE = False
    print("Warning: uszipcode not installed. Using fallback data.")
    print("Install with: pip install uszipcode")


# ============================================================================
# STATIC DATA: HEURISTIC LOOKUP TABLES
# ============================================================================

# Heuristic 1: Salt Belt States (Road salt corrosion risk)
SALT_BELT_STATES = {
    "CT", "DC", "DE", "IL", "IN", "IA", "KY", "ME", "MD", "MA", 
    "MI", "MN", "MO", "NH", "NJ", "NY", "OH", "PA", "RI", "VT", 
    "VA", "WV", "WI"
}

# Coastal states with marine layer corrosion risk
COASTAL_STATES = {
    "CA", "OR", "WA", "TX", "LA", "MS", "AL", "FL", "GA", "SC", 
    "NC", "VA", "MD", "DE", "NJ", "NY", "CT", "RI", "MA", "NH", "ME"
}

# Major coastal cities (lat, lon) for distance calculation
COASTAL_REFERENCE_POINTS = [
    (34.0522, -118.2437),  # Los Angeles
    (32.7157, -117.1611),  # San Diego
    (37.7749, -122.4194),  # San Francisco
    (47.6062, -122.3321),  # Seattle
    (45.5152, -122.6784),  # Portland
    (25.7617, -80.1918),   # Miami
    (27.9506, -82.4572),   # Tampa
    (29.7604, -95.3698),   # Houston (Gulf)
    (29.9511, -90.0715),   # New Orleans
    (40.7128, -74.0060),   # New York
    (42.3601, -71.0589),   # Boston
    (39.2904, -76.6122),   # Baltimore
]

# Heuristic 3: Mountainous States with elevation variance
MOUNTAINOUS_STATES = {"CO", "WV", "UT", "NV", "ID", "MT", "WA", "OR", "CA", "AZ", "NM", "WY"}

# High-elevation cities (zip prefix -> avg elevation in feet)
HIGH_ELEVATION_PREFIXES = {
    "800": 5280,   # Denver area
    "801": 5500,   # Colorado
    "802": 6000,   # Colorado mountains
    "803": 7000,   # Colorado mountains
    "804": 8000,   # High Colorado
    "805": 5500,   # Colorado
    "840": 4300,   # Salt Lake City
    "841": 4500,   # Utah
    "871": 5300,   # Albuquerque
    "872": 6000,   # New Mexico
    "891": 4500,   # Las Vegas area
    "590": 3500,   # Montana
    "591": 4000,   # Montana
    "820": 6000,   # Wyoming
    "821": 6500,   # Wyoming
    "822": 7000,   # Wyoming
    "831": 4500,   # Idaho
    "832": 5000,   # Idaho
    "833": 5500,   # Idaho
}

# Heuristic 4: Thermal zones based on latitude
HEAT_RISK_LATITUDE = 35.0   # Below this = heat risk
COLD_RISK_LATITUDE = 42.0   # Above this = cold start risk


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class RiskFactors:
    """Individual risk factor scores"""
    corrosion: int = 0
    coastal: int = 0
    urban_wear: int = 0
    rural_road: int = 0
    terrain: int = 0
    heat: int = 0
    cold: int = 0

@dataclass
class FleetLeadScore:
    """Complete lead scoring result"""
    zip_code: str
    city: str
    state: str
    latitude: float
    longitude: float
    population_density: float
    total_severity_score: int
    risk_factors: RiskFactors
    primary_risk: str
    secondary_risks: List[str]
    risk_bucket: str
    recommended_upsell: List[str]
    lead_priority: str  # "hot", "warm", "cold"
    
    def to_dict(self) -> Dict:
        return {
            "zip": self.zip_code,
            "city": self.city,
            "state": self.state,
            "coordinates": {"lat": self.latitude, "lon": self.longitude},
            "population_density": round(self.population_density, 1),
            "total_severity_score": self.total_severity_score,
            "risk_breakdown": {
                "corrosion": self.risk_factors.corrosion,
                "coastal_salt": self.risk_factors.coastal,
                "urban_wear": self.risk_factors.urban_wear,
                "rural_road": self.risk_factors.rural_road,
                "terrain_stress": self.risk_factors.terrain,
                "heat_stress": self.risk_factors.heat,
                "cold_stress": self.risk_factors.cold,
            },
            "primary_risk": self.primary_risk,
            "secondary_risks": self.secondary_risks,
            "risk_bucket": self.risk_bucket,
            "recommended_upsell": self.recommended_upsell,
            "lead_priority": self.lead_priority,
        }


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in miles between two coordinates"""
    R = 3959  # Earth's radius in miles
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c


def get_nearest_coast_distance(lat: float, lon: float) -> float:
    """Get distance to nearest coastal reference point"""
    min_distance = float('inf')
    for coast_lat, coast_lon in COASTAL_REFERENCE_POINTS:
        dist = haversine_distance(lat, lon, coast_lat, coast_lon)
        min_distance = min(min_distance, dist)
    return min_distance


def get_elevation_estimate(zip_code: str, state: str) -> int:
    """Estimate elevation based on zip prefix and state"""
    prefix = zip_code[:3]
    if prefix in HIGH_ELEVATION_PREFIXES:
        return HIGH_ELEVATION_PREFIXES[prefix]
    
    # State-level defaults
    state_elevations = {
        "CO": 5500, "UT": 4500, "WY": 5500, "NM": 5000, "NV": 4000,
        "AZ": 3500, "ID": 4000, "MT": 3500, "WA": 1500, "OR": 1500,
        "CA": 1000, "WV": 1500,
    }
    return state_elevations.get(state, 500)


# ============================================================================
# MOCK DATA (Fallback when uszipcode not available)
# ============================================================================

MOCK_ZIP_DATA = {
    "60601": {"city": "Chicago", "state": "IL", "lat": 41.8819, "lon": -87.6278, "pop_density": 12000},
    "10001": {"city": "New York", "state": "NY", "lat": 40.7484, "lon": -73.9967, "pop_density": 27000},
    "90210": {"city": "Beverly Hills", "state": "CA", "lat": 34.0901, "lon": -118.4065, "pop_density": 5200},
    "80202": {"city": "Denver", "state": "CO", "lat": 39.7541, "lon": -104.9927, "pop_density": 4500},
    "98101": {"city": "Seattle", "state": "WA", "lat": 47.6097, "lon": -122.3331, "pop_density": 8500},
    "33101": {"city": "Miami", "state": "FL", "lat": 25.7617, "lon": -80.1918, "pop_density": 11000},
    "48201": {"city": "Detroit", "state": "MI", "lat": 42.3314, "lon": -83.0458, "pop_density": 5000},
    "02101": {"city": "Boston", "state": "MA", "lat": 42.3601, "lon": -71.0589, "pop_density": 13000},
    "75201": {"city": "Dallas", "state": "TX", "lat": 32.7767, "lon": -96.7970, "pop_density": 3500},
    "85001": {"city": "Phoenix", "state": "AZ", "lat": 33.4484, "lon": -112.0740, "pop_density": 3000},
    "55401": {"city": "Minneapolis", "state": "MN", "lat": 44.9778, "lon": -93.2650, "pop_density": 7000},
    "84101": {"city": "Salt Lake City", "state": "UT", "lat": 40.7608, "lon": -111.8910, "pop_density": 3200},
    "15201": {"city": "Pittsburgh", "state": "PA", "lat": 40.4406, "lon": -79.9959, "pop_density": 5500},
    "44101": {"city": "Cleveland", "state": "OH", "lat": 41.4993, "lon": -81.6944, "pop_density": 4800},
    "14201": {"city": "Buffalo", "state": "NY", "lat": 42.8864, "lon": -78.8784, "pop_density": 6500},
}


# ============================================================================
# CORE SCORING ENGINE
# ============================================================================

class FleetLeadScorer:
    """Main scoring engine for fleet leads"""
    
    def __init__(self):
        self.search = None
        if HAS_USZIPCODE:
            try:
                self.search = SearchEngine()
            except Exception as e:
                print(f"Warning: Could not initialize uszipcode: {e}")
    
    def get_zip_data(self, zip_code: str) -> Optional[Dict]:
        """Get zip code data from uszipcode or fallback"""
        # Try uszipcode first
        if self.search:
            try:
                result = self.search.by_zipcode(zip_code)
                if result and result.zipcode:
                    return {
                        "city": result.major_city or result.post_office_city or "Unknown",
                        "state": result.state or "Unknown",
                        "lat": result.lat or 0,
                        "lon": result.lng or 0,
                        "pop_density": result.population_density or 0,
                    }
            except Exception:
                pass
        
        # Fallback to mock data
        if zip_code in MOCK_ZIP_DATA:
            return MOCK_ZIP_DATA[zip_code]
        
        return None
    
    def calculate_corrosion_score(self, state: str, lat: float, lon: float) -> Tuple[int, int]:
        """
        Heuristic 1: Rust Belt + Coastal Corrosion
        Returns: (salt_belt_score, coastal_score)
        """
        salt_score = 30 if state in SALT_BELT_STATES else 0
        
        coastal_score = 0
        if state in COASTAL_STATES:
            distance_to_coast = get_nearest_coast_distance(lat, lon)
            if distance_to_coast < 20:
                coastal_score = 15
            elif distance_to_coast < 50:
                coastal_score = 8
        
        return salt_score, coastal_score
    
    def calculate_density_score(self, pop_density: float) -> Tuple[int, int]:
        """
        Heuristic 2: Stop-and-Go Urban Wear
        Returns: (urban_score, rural_score)
        """
        urban_score = 0
        rural_score = 0
        
        if pop_density > 10000:
            urban_score = 30  # Dense urban (NYC, SF)
        elif pop_density > 5000:
            urban_score = 25  # Urban
        elif pop_density > 2000:
            urban_score = 15  # Suburban
        elif pop_density < 500:
            rural_score = 10  # Rural - gravel/unpaved roads
        elif pop_density < 100:
            rural_score = 15  # Very rural
        
        return urban_score, rural_score
    
    def calculate_terrain_score(self, zip_code: str, state: str) -> int:
        """
        Heuristic 3: Mountainous Terrain Stress
        """
        if state not in MOUNTAINOUS_STATES:
            return 0
        
        elevation = get_elevation_estimate(zip_code, state)
        
        if elevation > 7000:
            return 25  # High alpine
        elif elevation > 5000:
            return 20  # Mountain
        elif elevation > 3000:
            return 12  # Foothills
        elif elevation > 2000:
            return 8   # Elevated
        
        return 0
    
    def calculate_thermal_score(self, lat: float) -> Tuple[int, int]:
        """
        Heuristic 4: Thermal Stress (Heat/Cold)
        Returns: (heat_score, cold_score)
        """
        heat_score = 0
        cold_score = 0
        
        if lat < 30:
            heat_score = 20  # Deep South / Southwest
        elif lat < HEAT_RISK_LATITUDE:
            heat_score = 12  # Sun Belt
        
        if lat > 45:
            cold_score = 20  # Far North
        elif lat > COLD_RISK_LATITUDE:
            cold_score = 12  # Cold Belt
        
        return heat_score, cold_score
    
    def determine_risk_bucket(self, factors: RiskFactors) -> str:
        """Categorize into marketing bucket"""
        corrosion_total = factors.corrosion + factors.coastal
        urban_total = factors.urban_wear
        terrain_total = factors.terrain
        thermal_total = factors.heat + factors.cold
        
        max_score = max(corrosion_total, urban_total, terrain_total, thermal_total)
        
        if max_score == corrosion_total and corrosion_total >= 25:
            return "salt_belt"  # "Metric Ton of Salt" bucket
        elif max_score == terrain_total and terrain_total >= 15:
            return "transmission_cooker"  # "Transmission Cooker" bucket
        elif max_score == urban_total and urban_total >= 20:
            return "city_grinder"  # "City Grinder" bucket
        elif max_score == thermal_total and thermal_total >= 15:
            return "thermal_stress"
        else:
            return "general"
    
    def get_recommended_upsells(self, factors: RiskFactors, bucket: str) -> List[str]:
        """Generate upsell recommendations based on risk profile"""
        upsells = []
        
        if factors.corrosion >= 25:
            upsells.extend(["Undercoating", "Brake Line Inspection", "Caliper Check"])
        if factors.coastal >= 10:
            upsells.extend(["Rust Proofing", "Marine Grade Lubricants"])
        if factors.urban_wear >= 20:
            upsells.extend(["Brake Rotors", "Starter System Check", "Door Hinge Lube"])
        if factors.rural_road >= 10:
            upsells.extend(["Suspension Inspection", "Alignment Check", "Skid Plate"])
        if factors.terrain >= 15:
            upsells.extend(["Transmission Flush", "Coolant Check", "Brake Fluid Flush"])
        if factors.heat >= 12:
            upsells.extend(["Battery Load Test", "AC System Check", "Rubber Bushing Inspection"])
        if factors.cold >= 12:
            upsells.extend(["Block Heater", "Battery Replacement", "Alternator Test"])
        
        # Dedupe while preserving order
        seen = set()
        unique = []
        for item in upsells:
            if item not in seen:
                seen.add(item)
                unique.append(item)
        
        return unique[:6]  # Top 6 recommendations
    
    def get_primary_risk(self, factors: RiskFactors) -> Tuple[str, List[str]]:
        """Determine primary and secondary risk labels"""
        risk_scores = [
            (factors.corrosion + factors.coastal, "Corrosion"),
            (factors.urban_wear, "Stop-and-Go Wear"),
            (factors.terrain, "Terrain Stress"),
            (factors.heat, "Heat Stress"),
            (factors.cold, "Cold Start Risk"),
            (factors.rural_road, "Rural Road Wear"),
        ]
        
        # Sort by score descending
        risk_scores.sort(key=lambda x: x[0], reverse=True)
        
        # Primary is highest, secondary is next 2 with score > 5
        primary = risk_scores[0][1] if risk_scores[0][0] > 0 else "Low Risk"
        secondary = [r[1] for r in risk_scores[1:3] if r[0] >= 5]
        
        return primary, secondary
    
    def score_zip(self, zip_code: str) -> Optional[FleetLeadScore]:
        """Calculate complete lead score for a zip code"""
        zip_data = self.get_zip_data(zip_code)
        if not zip_data:
            return None
        
        city = zip_data["city"]
        state = zip_data["state"]
        lat = zip_data["lat"]
        lon = zip_data["lon"]
        pop_density = zip_data["pop_density"]
        
        # Calculate all heuristics
        corrosion, coastal = self.calculate_corrosion_score(state, lat, lon)
        urban, rural = self.calculate_density_score(pop_density)
        terrain = self.calculate_terrain_score(zip_code, state)
        heat, cold = self.calculate_thermal_score(lat)
        
        # Build risk factors
        factors = RiskFactors(
            corrosion=corrosion,
            coastal=coastal,
            urban_wear=urban,
            rural_road=rural,
            terrain=terrain,
            heat=heat,
            cold=cold,
        )
        
        # Total score (capped at 100)
        total = min(100, corrosion + coastal + urban + rural + terrain + heat + cold)
        
        # Categorize
        bucket = self.determine_risk_bucket(factors)
        primary, secondary = self.get_primary_risk(factors)
        upsells = self.get_recommended_upsells(factors, bucket)
        
        # Lead priority
        if total >= 60:
            priority = "hot"
        elif total >= 35:
            priority = "warm"
        else:
            priority = "cold"
        
        return FleetLeadScore(
            zip_code=zip_code,
            city=city,
            state=state,
            latitude=lat,
            longitude=lon,
            population_density=pop_density,
            total_severity_score=total,
            risk_factors=factors,
            primary_risk=primary,
            secondary_risks=secondary,
            risk_bucket=bucket,
            recommended_upsell=upsells,
            lead_priority=priority,
        )
    
    def score_multiple(self, zip_codes: List[str]) -> List[FleetLeadScore]:
        """Score multiple zip codes and sort by severity"""
        results = []
        for zc in zip_codes:
            score = self.score_zip(zc.strip())
            if score:
                results.append(score)
        
        # Sort by total_severity_score descending
        results.sort(key=lambda x: x.total_severity_score, reverse=True)
        return results


# ============================================================================
# CLI INTERFACE
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Fleet Lead Scoring Engine - Calculate maintenance severity scores by zip code"
    )
    parser.add_argument(
        "--zips", 
        type=str, 
        help="Comma-separated list of zip codes (e.g., 60601,10001,90210)"
    )
    parser.add_argument(
        "--file", 
        type=str, 
        help="File with one zip code per line"
    )
    parser.add_argument(
        "--demo", 
        action="store_true", 
        help="Run demo with sample zip codes"
    )
    parser.add_argument(
        "--output", 
        type=str, 
        choices=["json", "table", "summary"],
        default="json",
        help="Output format"
    )
    
    args = parser.parse_args()
    
    # Get zip codes
    zip_codes = []
    
    if args.demo:
        zip_codes = [
            "60601",  # Chicago (Salt Belt + Urban)
            "10001",  # NYC (Salt Belt + Dense Urban)
            "80202",  # Denver (High Altitude)
            "98101",  # Seattle (Coastal + Hilly)
            "33101",  # Miami (Heat + Coastal)
            "48201",  # Detroit (Salt Belt + Urban)
            "85001",  # Phoenix (Extreme Heat)
            "55401",  # Minneapolis (Cold + Salt)
            "84101",  # Salt Lake City (Terrain + Cold)
            "14201",  # Buffalo (Salt + Cold + Lake Effect)
        ]
    elif args.zips:
        zip_codes = [z.strip() for z in args.zips.split(",")]
    elif args.file:
        with open(args.file, "r") as f:
            zip_codes = [line.strip() for line in f if line.strip()]
    else:
        parser.print_help()
        return
    
    # Score
    scorer = FleetLeadScorer()
    results = scorer.score_multiple(zip_codes)
    
    # Output
    if args.output == "json":
        output = [r.to_dict() for r in results]
        print(json.dumps(output, indent=2))
    
    elif args.output == "table":
        print("\n" + "="*100)
        print(f"{'ZIP':<8} {'CITY':<15} {'ST':<4} {'SCORE':<6} {'PRIORITY':<8} {'BUCKET':<20} {'PRIMARY RISK':<25}")
        print("="*100)
        for r in results:
            print(f"{r.zip_code:<8} {r.city[:14]:<15} {r.state:<4} {r.total_severity_score:<6} {r.lead_priority:<8} {r.risk_bucket:<20} {r.primary_risk:<25}")
        print("="*100 + "\n")
    
    elif args.output == "summary":
        hot = [r for r in results if r.lead_priority == "hot"]
        warm = [r for r in results if r.lead_priority == "warm"]
        cold = [r for r in results if r.lead_priority == "cold"]
        
        print("\n" + "="*60)
        print("FLEET LEAD SCORING SUMMARY")
        print("="*60)
        print(f"\n🔥 HOT LEADS ({len(hot)}):")
        for r in hot:
            print(f"   {r.city}, {r.state} ({r.zip_code}): Score {r.total_severity_score} - {r.primary_risk}")
        
        print(f"\n🟡 WARM LEADS ({len(warm)}):")
        for r in warm:
            print(f"   {r.city}, {r.state} ({r.zip_code}): Score {r.total_severity_score} - {r.primary_risk}")
        
        print(f"\n❄️  COLD LEADS ({len(cold)}):")
        for r in cold:
            print(f"   {r.city}, {r.state} ({r.zip_code}): Score {r.total_severity_score} - {r.primary_risk}")
        
        # Bucket breakdown
        buckets = {}
        for r in results:
            buckets[r.risk_bucket] = buckets.get(r.risk_bucket, 0) + 1
        
        print("\n" + "-"*60)
        print("MARKETING BUCKETS:")
        bucket_labels = {
            "salt_belt": "🧂 Metric Ton of Salt",
            "transmission_cooker": "🌡️ Transmission Cooker",
            "city_grinder": "🚦 City Grinder",
            "thermal_stress": "🔥 Thermal Stress",
            "general": "📊 General",
        }
        for bucket, count in buckets.items():
            label = bucket_labels.get(bucket, bucket)
            print(f"   {label}: {count} leads")
        
        print("="*60 + "\n")


if __name__ == "__main__":
    main()
