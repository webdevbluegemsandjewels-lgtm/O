/* =========================================================
   OrenkaFine — country / dial-code / India state+city data.
   Used by signup.html to populate the dynamic country-code select
   (phone) and the cascading Country → State → City dropdowns.
   India gets full state + major-city coverage since that's where the
   business ships from/to; other countries fall back to free-text
   State/City inputs since a full world state/city dataset isn't
   worth shipping for a site that only delivers within India today.
   ========================================================= */

// { name, iso2, dial, len } — India first since it's the default/primary
// market. `len` is the typical national mobile-number digit length for
// that country (used to cap the phone <input> as the shopper types —
// see capPhoneInput() usage in signup.html / js/auth-modal.js). It's an
// approximation for UX purposes (some countries have more than one
// valid length); it's not a substitute for real phone validation.
const GEO_COUNTRIES = [
  { name: "India", iso2: "IN", dial: "+91", len: 10 },
  { name: "United States", iso2: "US", dial: "+1", len: 10 },
  { name: "United Kingdom", iso2: "GB", dial: "+44", len: 10 },
  { name: "United Arab Emirates", iso2: "AE", dial: "+971", len: 9 },
  { name: "Australia", iso2: "AU", dial: "+61", len: 9 },
  { name: "Canada", iso2: "CA", dial: "+1", len: 10 },
  { name: "Singapore", iso2: "SG", dial: "+65", len: 8 },
  { name: "Saudi Arabia", iso2: "SA", dial: "+966", len: 9 },
  { name: "Qatar", iso2: "QA", dial: "+974", len: 8 },
  { name: "Kuwait", iso2: "KW", dial: "+965", len: 8 },
  { name: "Bahrain", iso2: "BH", dial: "+973", len: 8 },
  { name: "Oman", iso2: "OM", dial: "+968", len: 8 },
  { name: "Nepal", iso2: "NP", dial: "+977", len: 10 },
  { name: "Bangladesh", iso2: "BD", dial: "+880", len: 10 },
  { name: "Sri Lanka", iso2: "LK", dial: "+94", len: 9 },
  { name: "Pakistan", iso2: "PK", dial: "+92", len: 10 },
  { name: "Germany", iso2: "DE", dial: "+49", len: 11 },
  { name: "France", iso2: "FR", dial: "+33", len: 9 },
  { name: "Italy", iso2: "IT", dial: "+39", len: 10 },
  { name: "Spain", iso2: "ES", dial: "+34", len: 9 },
  { name: "Netherlands", iso2: "NL", dial: "+31", len: 9 },
  { name: "Switzerland", iso2: "CH", dial: "+41", len: 9 },
  { name: "Sweden", iso2: "SE", dial: "+46", len: 9 },
  { name: "Ireland", iso2: "IE", dial: "+353", len: 9 },
  { name: "New Zealand", iso2: "NZ", dial: "+64", len: 9 },
  { name: "South Africa", iso2: "ZA", dial: "+27", len: 9 },
  { name: "Japan", iso2: "JP", dial: "+81", len: 10 },
  { name: "South Korea", iso2: "KR", dial: "+82", len: 10 },
  { name: "China", iso2: "CN", dial: "+86", len: 11 },
  { name: "Hong Kong", iso2: "HK", dial: "+852", len: 8 },
  { name: "Malaysia", iso2: "MY", dial: "+60", len: 10 },
  { name: "Thailand", iso2: "TH", dial: "+66", len: 9 },
  { name: "Indonesia", iso2: "ID", dial: "+62", len: 11 },
  { name: "Philippines", iso2: "PH", dial: "+63", len: 10 },
  { name: "Vietnam", iso2: "VN", dial: "+84", len: 9 },
  { name: "Brazil", iso2: "BR", dial: "+55", len: 11 },
  { name: "Mexico", iso2: "MX", dial: "+52", len: 10 },
  { name: "Russia", iso2: "RU", dial: "+7", len: 10 },
  { name: "Turkey", iso2: "TR", dial: "+90", len: 10 },
  { name: "Egypt", iso2: "EG", dial: "+20", len: 10 },
  { name: "Nigeria", iso2: "NG", dial: "+234", len: 10 },
  { name: "Kenya", iso2: "KE", dial: "+254", len: 9 },
];

// Looked up by dial code when capping the phone <input> length. Falls
// back to 15 (the E.164 max) if a dial code somehow isn't found.
function geoPhoneLenForDial(dial) {
  const match = GEO_COUNTRIES.find((c) => c.dial === dial);
  return match ? match.len : 15;
}

// Strips non-digits and truncates to the selected country's expected
// length, live as the shopper types — shared by signup.html and the
// login/signup popup (js/auth-modal.js).
function capPhoneInput(phoneInput, phoneCodeSelect) {
  const maxLen = geoPhoneLenForDial(phoneCodeSelect.value);
  phoneInput.setAttribute("maxlength", String(maxLen));
  const digitsOnly = phoneInput.value.replace(/\D/g, "").slice(0, maxLen);
  if (digitsOnly !== phoneInput.value) phoneInput.value = digitsOnly;
}

// 28 states + 8 union territories.
const GEO_INDIA_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam",
  "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

// Major cities per state — not exhaustive, covers the common shipping
// destinations. City field falls back to free text if a state isn't
// listed here or the shopper's city isn't in the list (see signup.html).
const GEO_INDIA_CITIES = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
  "Chandigarh": ["Chandigarh"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Durg"],
  "Delhi": ["New Delhi", "Delhi"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Karnal", "Ambala"],
  "Himachal Pradesh": ["Shimla", "Manali", "Dharamshala", "Solan"],
  "Jammu and Kashmir": ["Srinagar", "Jammu"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
  "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi"],
  "Kerala": ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kollam"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad"],
  "Manipur": ["Imphal"],
  "Meghalaya": ["Shillong"],
  "Mizoram": ["Aizawl"],
  "Nagaland": ["Kohima", "Dimapur"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur"],
  "Puducherry": ["Puducherry"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Mohali"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
  "Sikkim": ["Gangtok"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad"],
  "Tripura": ["Agartala"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Noida", "Ghaziabad", "Agra", "Varanasi"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Nainital", "Rishikesh"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Siliguri", "Asansol"],
};
