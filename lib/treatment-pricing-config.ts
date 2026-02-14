export interface TreatmentItem {
  name: string
  price: string // Empty string means "not shown"
  description: string
}

export interface TreatmentCategory {
  category: string
  treatments: TreatmentItem[]
}

// Default treatment categories and items based on UK dental pricing standards.
// Clinics can add/remove treatments and categories as needed.
export const DEFAULT_TREATMENT_CATEGORIES: TreatmentCategory[] = [
  {
    category: "Examinations & Consultations",
    treatments: [
      { name: "New Patient Examination", price: "", description: "Includes digital x-rays and personalised treatment plan" },
      { name: "Routine Examination", price: "", description: "Check-up for existing patients" },
      { name: "Emergency Examination", price: "", description: "Same-day urgent assessment" },
      { name: "Children's Examination", price: "", description: "Dental check-up for under 18s" },
      { name: "Specialist Consultation", price: "", description: "Consultation with a specialist dentist" },
    ],
  },
  {
    category: "Hygiene & Preventive",
    treatments: [
      { name: "Scale & Polish", price: "", description: "Professional cleaning with dentist or hygienist" },
      { name: "Extensive / Deep Clean", price: "", description: "Thorough deep cleaning for buildup removal" },
      { name: "Airflow / Stain Removal", price: "", description: "Jet cleaning to remove staining" },
      { name: "Periodontal Assessment", price: "", description: "Full gum health evaluation" },
      { name: "Fluoride Treatment", price: "", description: "Protective fluoride application" },
    ],
  },
  {
    category: "Fillings",
    treatments: [
      { name: "Small Composite Filling", price: "", description: "Tooth-coloured filling for minor cavities" },
      { name: "Medium Composite Filling", price: "", description: "Tooth-coloured filling for moderate cavities" },
      { name: "Large Composite Filling", price: "", description: "Tooth-coloured filling for larger cavities" },
      { name: "Temporary Filling", price: "", description: "Short-term protective filling" },
    ],
  },
  {
    category: "Crowns & Bridges",
    treatments: [
      { name: "Porcelain Crown", price: "", description: "Natural-looking ceramic crown" },
      { name: "Zirconia Crown", price: "", description: "Premium strength ceramic crown" },
      { name: "Temporary Crown", price: "", description: "Short-term protective crown" },
      { name: "Bridge (per unit)", price: "", description: "Fixed replacement for missing teeth" },
    ],
  },
  {
    category: "Teeth Whitening",
    treatments: [
      { name: "Home Whitening Kit", price: "", description: "Custom trays with professional whitening gel" },
      { name: "In-Office Whitening", price: "", description: "Professional in-chair whitening treatment" },
      { name: "Boutique Whitening", price: "", description: "Premium at-home whitening system" },
      { name: "Enlighten Whitening", price: "", description: "Guaranteed B1 shade whitening" },
    ],
  },
  {
    category: "Veneers & Cosmetic",
    treatments: [
      { name: "Porcelain Veneer (per tooth)", price: "", description: "Custom-made porcelain veneer" },
      { name: "Composite Bonding (per tooth)", price: "", description: "Direct composite veneer or bonding" },
      { name: "Smile Makeover Consultation", price: "", description: "Comprehensive cosmetic treatment planning" },
    ],
  },
  {
    category: "Extractions",
    treatments: [
      { name: "Simple Extraction", price: "", description: "Straightforward tooth removal" },
      { name: "Surgical Extraction", price: "", description: "Extraction requiring surgical approach" },
      { name: "Wisdom Tooth Extraction", price: "", description: "Removal of wisdom teeth" },
    ],
  },
  {
    category: "Invisalign & Orthodontics",
    treatments: [
      { name: "Invisalign Consultation", price: "", description: "Assessment and treatment planning" },
      { name: "Invisalign Lite", price: "", description: "For mild alignment cases (up to 14 aligners)" },
      { name: "Invisalign Comprehensive", price: "", description: "Full treatment for moderate to complex cases" },
      { name: "Fixed Braces", price: "", description: "Traditional bracket and wire orthodontics" },
      { name: "Retainers", price: "", description: "Fixed or removable retainers post-treatment" },
    ],
  },
  {
    category: "Root Canal Treatment",
    treatments: [
      { name: "Front Tooth", price: "", description: "Root canal for incisor or canine" },
      { name: "Premolar", price: "", description: "Root canal for premolar tooth" },
      { name: "Molar", price: "", description: "Root canal for molar tooth" },
    ],
  },
  {
    category: "Dentures",
    treatments: [
      { name: "Full Denture", price: "", description: "Complete set of replacement teeth" },
      { name: "Partial Denture", price: "", description: "Replacement for some missing teeth" },
      { name: "Denture Repair", price: "", description: "Repair or reline of existing denture" },
    ],
  },
  {
    category: "Dental Implants",
    treatments: [
      { name: "Implant Consultation", price: "", description: "Assessment, scans and treatment planning" },
      { name: "Single Implant", price: "", description: "Titanium implant with crown" },
      { name: "Bone Graft", price: "", description: "Bone augmentation for implant placement" },
      { name: "All-on-4", price: "", description: "Full arch restoration on four implants" },
    ],
  },
  {
    category: "Emergency & Sedation",
    treatments: [
      { name: "Emergency Appointment", price: "", description: "Urgent same-day dental care" },
      { name: "Conscious Sedation", price: "", description: "Oral or inhalation sedation per session" },
      { name: "IV Sedation", price: "", description: "Intravenous sedation per session" },
    ],
  },
]
