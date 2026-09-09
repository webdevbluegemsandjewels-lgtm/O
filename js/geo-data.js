/* =========================================================
   OrenkaFine — country / dial-code / India state+city data.
   Used by signup.html to populate the dynamic country-code select
   (phone) and the cascading Country → State → City dropdowns.
   India gets full state + major-city coverage since that's where the
   business ships from/to; other countries fall back to free-text
   State/City inputs since a full world state/city dataset isn't
   worth shipping for a site that only delivers within India today.
   ========================================================= */

// { name, iso2, dial } — India first since it's the default/primary market.
const GEO_COUNTRIES = [
  { name: "India", iso2: "IN", dial: "+91" },
  { name: "United States", iso2: "US", dial: "+1" },
  { name: "United Kingdom", iso2: "GB", dial: "+44" },
  { name: "United Arab Emirates", iso2: "AE", dial: "+971" },
  { name: "Australia", iso2: "AU", dial: "+61" },
  { name: "Canada", iso2: "CA", dial: "+1" },
  { name: "Singapore", iso2: "SG", dial: "+65" },
  { name: "Saudi Arabia", iso2: "SA", dial: "+966" },
  { name: "Qatar", iso2: "QA", dial: "+974" },
  { name: "Kuwait", iso2: "KW", dial: "+965" },
  { name: "Bahrain", iso2: "BH", dial: "+973" },
  { name: "Oman", iso2: "OM", dial: "+968" },
  { name: "Nepal", iso2: "NP", dial: "+977" },
  { name: "Bangladesh", iso2: "BD", dial: "+880" },
  { name: "Sri Lanka", iso2: "LK", dial: "+94" },
  { name: "Pakistan", iso2: "PK", dial: "+92" },
  { name: "Germany", iso2: "DE", dial: "+49" },
  { name: "France", iso2: "FR", dial: "+33" },
  { name: "Italy", iso2: "IT", dial: "+39" },
  { name: "Spain", iso2: "ES", dial: "+34" },
  { name: "Netherlands", iso2: "NL", dial: "+31" },
  { name: "Switzerland", iso2: "CH", dial: "+41" },
  { name: "Sweden", iso2: "SE", dial: "+46" },
  { name: "Ireland", iso2: "IE", dial: "+353" },
  { name: "New Zealand", iso2: "NZ", dial: "+64" },
  { name: "South Africa", iso2: "ZA", dial: "+27" },
  { name: "Japan", iso2: "JP", dial: "+81" },
  { name: "South Korea", iso2: "KR", dial: "+82" },
  { name: "China", iso2: "CN", dial: "+86" },
  { name: "Hong Kong", iso2: "HK", dial: "+852" },
  { name: "Malaysia", iso2: "MY", dial: "+60" },
  { name: "Thailand", iso2: "TH", dial: "+66" },
  { name: "Indonesia", iso2: "ID", dial: "+62" },
  { name: "Philippines", iso2: "PH", dial: "+63" },
  { name: "Vietnam", iso2: "VN", dial: "+84" },
  { name: "Brazil", iso2: "BR", dial: "+55" },
  { name: "Mexico", iso2: "MX", dial: "+52" },
  { name: "Russia", iso2: "RU", dial: "+7" },
  { name: "Turkey", iso2: "TR", dial: "+90" },
  { name: "Egypt", iso2: "EG", dial: "+20" },
  { name: "Nigeria", iso2: "NG", dial: "+234" },
  { name: "Kenya", iso2: "KE", dial: "+254" },
];

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
