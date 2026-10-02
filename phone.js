// phone.js — Country phone picker with validation

const COUNTRIES = [
  { name:"Afghanistan",           code:"+93",   flag:"🇦🇫", len:[9] },
  { name:"Albania",               code:"+355",  flag:"🇦🇱", len:[9] },
  { name:"Algeria",               code:"+213",  flag:"🇩🇿", len:[9] },
  { name:"Angola",                code:"+244",  flag:"🇦🇴", len:[9] },
  { name:"Argentina",             code:"+54",   flag:"🇦🇷", len:[10] },
  { name:"Armenia",               code:"+374",  flag:"🇦🇲", len:[8] },
  { name:"Australia",             code:"+61",   flag:"🇦🇺", len:[9] },
  { name:"Austria",               code:"+43",   flag:"🇦🇹", len:[10,11] },
  { name:"Azerbaijan",            code:"+994",  flag:"🇦🇿", len:[9] },
  { name:"Bahrain",               code:"+973",  flag:"🇧🇭", len:[8] },
  { name:"Bangladesh",            code:"+880",  flag:"🇧🇩", len:[10] },
  { name:"Belgium",               code:"+32",   flag:"🇧🇪", len:[9] },
  { name:"Benin",                 code:"+229",  flag:"🇧🇯", len:[8] },
  { name:"Bolivia",               code:"+591",  flag:"🇧🇴", len:[8] },
  { name:"Brazil",                code:"+55",   flag:"🇧🇷", len:[10,11] },
  { name:"Burkina Faso",          code:"+226",  flag:"🇧🇫", len:[8] },
  { name:"Burundi",               code:"+257",  flag:"🇧🇮", len:[8] },
  { name:"Cameroon",              code:"+237",  flag:"🇨🇲", len:[9] },
  { name:"Canada",                code:"+1",    flag:"🇨🇦", len:[10] },
  { name:"Cape Verde",            code:"+238",  flag:"🇨🇻", len:[7] },
  { name:"Central African Rep.",  code:"+236",  flag:"🇨🇫", len:[8] },
  { name:"Chad",                  code:"+235",  flag:"🇹🇩", len:[8] },
  { name:"Chile",                 code:"+56",   flag:"🇨🇱", len:[9] },
  { name:"China",                 code:"+86",   flag:"🇨🇳", len:[11] },
  { name:"Colombia",              code:"+57",   flag:"🇨🇴", len:[10] },
  { name:"Congo (DRC)",           code:"+243",  flag:"🇨🇩", len:[9] },
  { name:"Congo (Republic)",      code:"+242",  flag:"🇨🇬", len:[9] },
  { name:"Côte d'Ivoire",        code:"+225",  flag:"🇨🇮", len:[10] },
  { name:"Croatia",               code:"+385",  flag:"🇭🇷", len:[8,9] },
  { name:"Cuba",                  code:"+53",   flag:"🇨🇺", len:[8] },
  { name:"Cyprus",                code:"+357",  flag:"🇨🇾", len:[8] },
  { name:"Czech Republic",        code:"+420",  flag:"🇨🇿", len:[9] },
  { name:"Denmark",               code:"+45",   flag:"🇩🇰", len:[8] },
  { name:"Djibouti",              code:"+253",  flag:"🇩🇯", len:[8] },
  { name:"Ecuador",               code:"+593",  flag:"🇪🇨", len:[9] },
  { name:"Egypt",                 code:"+20",   flag:"🇪🇬", len:[10] },
  { name:"El Salvador",           code:"+503",  flag:"🇸🇻", len:[8] },
  { name:"Equatorial Guinea",     code:"+240",  flag:"🇬🇶", len:[9] },
  { name:"Eritrea",               code:"+291",  flag:"🇪🇷", len:[7] },
  { name:"Estonia",               code:"+372",  flag:"🇪🇪", len:[7,8] },
  { name:"Eswatini",              code:"+268",  flag:"🇸🇿", len:[8] },
  { name:"Ethiopia",              code:"+251",  flag:"🇪🇹", len:[9] },
  { name:"Finland",               code:"+358",  flag:"🇫🇮", len:[9,10] },
  { name:"France",                code:"+33",   flag:"🇫🇷", len:[9] },
  { name:"Gabon",                 code:"+241",  flag:"🇬🇦", len:[8] },
  { name:"Gambia",                code:"+220",  flag:"🇬🇲", len:[7] },
  { name:"Georgia",               code:"+995",  flag:"🇬🇪", len:[9] },
  { name:"Germany",               code:"+49",   flag:"🇩🇪", len:[10,11] },
  { name:"Ghana",                 code:"+233",  flag:"🇬🇭", len:[9], default:true },
  { name:"Greece",                code:"+30",   flag:"🇬🇷", len:[10] },
  { name:"Guatemala",             code:"+502",  flag:"🇬🇹", len:[8] },
  { name:"Guinea",                code:"+224",  flag:"🇬🇳", len:[9] },
  { name:"Guinea-Bissau",         code:"+245",  flag:"🇬🇼", len:[9] },
  { name:"Honduras",              code:"+504",  flag:"🇭🇳", len:[8] },
  { name:"Hungary",               code:"+36",   flag:"🇭🇺", len:[9] },
  { name:"Iceland",               code:"+354",  flag:"🇮🇸", len:[7] },
  { name:"India",                 code:"+91",   flag:"🇮🇳", len:[10] },
  { name:"Indonesia",             code:"+62",   flag:"🇮🇩", len:[10,11] },
  { name:"Iran",                  code:"+98",   flag:"🇮🇷", len:[10] },
  { name:"Iraq",                  code:"+964",  flag:"🇮🇶", len:[10] },
  { name:"Ireland",               code:"+353",  flag:"🇮🇪", len:[9] },
  { name:"Israel",                code:"+972",  flag:"🇮🇱", len:[9] },
  { name:"Italy",                 code:"+39",   flag:"🇮🇹", len:[10] },
  { name:"Jamaica",               code:"+1876", flag:"🇯🇲", len:[10] },
  { name:"Japan",                 code:"+81",   flag:"🇯🇵", len:[10,11] },
  { name:"Jordan",                code:"+962",  flag:"🇯🇴", len:[9] },
  { name:"Kazakhstan",            code:"+7",    flag:"🇰🇿", len:[10] },
  { name:"Kenya",                 code:"+254",  flag:"🇰🇪", len:[9] },
  { name:"Kuwait",                code:"+965",  flag:"🇰🇼", len:[8] },
  { name:"Latvia",                code:"+371",  flag:"🇱🇻", len:[8] },
  { name:"Lebanon",               code:"+961",  flag:"🇱🇧", len:[8] },
  { name:"Liberia",               code:"+231",  flag:"🇱🇷", len:[8] },
  { name:"Libya",                 code:"+218",  flag:"🇱🇾", len:[9] },
  { name:"Lithuania",             code:"+370",  flag:"🇱🇹", len:[8] },
  { name:"Luxembourg",            code:"+352",  flag:"🇱🇺", len:[9] },
  { name:"Madagascar",            code:"+261",  flag:"🇲🇬", len:[9] },
  { name:"Malawi",                code:"+265",  flag:"🇲🇼", len:[9] },
  { name:"Malaysia",              code:"+60",   flag:"🇲🇾", len:[9,10] },
  { name:"Mali",                  code:"+223",  flag:"🇲🇱", len:[8] },
  { name:"Mauritania",            code:"+222",  flag:"🇲🇷", len:[8] },
  { name:"Mauritius",             code:"+230",  flag:"🇲🇺", len:[8] },
  { name:"Mexico",                code:"+52",   flag:"🇲🇽", len:[10] },
  { name:"Morocco",               code:"+212",  flag:"🇲🇦", len:[9] },
  { name:"Mozambique",            code:"+258",  flag:"🇲🇿", len:[9] },
  { name:"Namibia",               code:"+264",  flag:"🇳🇦", len:[9] },
  { name:"Netherlands",           code:"+31",   flag:"🇳🇱", len:[9] },
  { name:"New Zealand",           code:"+64",   flag:"🇳🇿", len:[9] },
  { name:"Nicaragua",             code:"+505",  flag:"🇳🇮", len:[8] },
  { name:"Niger",                 code:"+227",  flag:"🇳🇪", len:[8] },
  { name:"Nigeria",               code:"+234",  flag:"🇳🇬", len:[10] },
  { name:"Norway",                code:"+47",   flag:"🇳🇴", len:[8] },
  { name:"Oman",                  code:"+968",  flag:"🇴🇲", len:[8] },
  { name:"Pakistan",              code:"+92",   flag:"🇵🇰", len:[10] },
  { name:"Palestine",             code:"+970",  flag:"🇵🇸", len:[9] },
  { name:"Panama",                code:"+507",  flag:"🇵🇦", len:[8] },
  { name:"Peru",                  code:"+51",   flag:"🇵🇪", len:[9] },
  { name:"Philippines",           code:"+63",   flag:"🇵🇭", len:[10] },
  { name:"Poland",                code:"+48",   flag:"🇵🇱", len:[9] },
  { name:"Portugal",              code:"+351",  flag:"🇵🇹", len:[9] },
  { name:"Qatar",                 code:"+974",  flag:"🇶🇦", len:[8] },
  { name:"Romania",               code:"+40",   flag:"🇷🇴", len:[9] },
  { name:"Russia",                code:"+7",    flag:"🇷🇺", len:[10] },
  { name:"Rwanda",                code:"+250",  flag:"🇷🇼", len:[9] },
  { name:"Saudi Arabia",          code:"+966",  flag:"🇸🇦", len:[9] },
  { name:"Senegal",               code:"+221",  flag:"🇸🇳", len:[9] },
  { name:"Sierra Leone",          code:"+232",  flag:"🇸🇱", len:[8] },
  { name:"Singapore",             code:"+65",   flag:"🇸🇬", len:[8] },
  { name:"Somalia",               code:"+252",  flag:"🇸🇴", len:[8] },
  { name:"South Africa",          code:"+27",   flag:"🇿🇦", len:[9] },
  { name:"South Korea",           code:"+82",   flag:"🇰🇷", len:[10] },
  { name:"South Sudan",           code:"+211",  flag:"🇸🇸", len:[9] },
  { name:"Spain",                 code:"+34",   flag:"🇪🇸", len:[9] },
  { name:"Sri Lanka",             code:"+94",   flag:"🇱🇰", len:[9] },
  { name:"Sudan",                 code:"+249",  flag:"🇸🇩", len:[9] },
  { name:"Sweden",                code:"+46",   flag:"🇸🇪", len:[9] },
  { name:"Switzerland",           code:"+41",   flag:"🇨🇭", len:[9] },
  { name:"Syria",                 code:"+963",  flag:"🇸🇾", len:[9] },
  { name:"Tanzania",              code:"+255",  flag:"🇹🇿", len:[9] },
  { name:"Thailand",              code:"+66",   flag:"🇹🇭", len:[9] },
  { name:"Togo",                  code:"+228",  flag:"🇹🇬", len:[8] },
  { name:"Tunisia",               code:"+216",  flag:"🇹🇳", len:[8] },
  { name:"Turkey",                code:"+90",   flag:"🇹🇷", len:[10] },
  { name:"Uganda",                code:"+256",  flag:"🇺🇬", len:[9] },
  { name:"Ukraine",               code:"+380",  flag:"🇺🇦", len:[9] },
  { name:"United Arab Emirates",  code:"+971",  flag:"🇦🇪", len:[9] },
  { name:"United Kingdom",        code:"+44",   flag:"🇬🇧", len:[10] },
  { name:"United States",         code:"+1",    flag:"🇺🇸", len:[10] },
  { name:"Uruguay",               code:"+598",  flag:"🇺🇾", len:[8] },
  { name:"Uzbekistan",            code:"+998",  flag:"🇺🇿", len:[9] },
  { name:"Venezuela",             code:"+58",   flag:"🇻🇪", len:[10] },
  { name:"Vietnam",               code:"+84",   flag:"🇻🇳", len:[9,10] },
  { name:"Yemen",                 code:"+967",  flag:"🇾🇪", len:[9] },
  { name:"Zambia",                code:"+260",  flag:"🇿🇲", len:[9] },
  { name:"Zimbabwe",              code:"+263",  flag:"🇿🇼", len:[9] },
];

let selectedCountry = COUNTRIES.find(c => c.default) || COUNTRIES.find(c => c.name === "Ghana");
let countryFilterQ  = "";

// ── Init country picker on page load ─────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  renderCountryList(COUNTRIES);
  applyCountry(selectedCountry);
});

function applyCountry(country) {
  selectedCountry = country;
  const flag = document.getElementById("cp-flag");
  const code = document.getElementById("cp-code");
  if (flag) flag.textContent = country.flag;
  if (code) code.textContent  = country.code;

  const inp = document.getElementById("v-phone-number");
  if (inp) {
    const maxLen = Math.max(...country.len);
    inp.maxLength = maxLen;
    inp.placeholder = "X".repeat(maxLen).replace(/X/g, "X").slice(0,4) +
      " " + "X".repeat(maxLen - 4);
    inp.value = "";
  }
  updatePhoneHint(country, "");
  updateHiddenPhone();
}

function toggleCountryDropdown() {
  const dd = document.getElementById("country-dropdown");
  if (!dd) return;
  dd.classList.toggle("hidden");
  if (!dd.classList.contains("hidden")) {
    const searchEl = document.getElementById("country-search");
    if (searchEl) { searchEl.value = ""; searchEl.focus(); }
    renderCountryList(COUNTRIES);
  }
}

function filterCountries(q) {
  countryFilterQ = q.toLowerCase();
  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countryFilterQ) ||
    c.code.includes(countryFilterQ)
  );
  renderCountryList(filtered);
}

function renderCountryList(list) {
  const el = document.getElementById("country-list");
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<div class="country-empty">No countries found</div>`;
    return;
  }
  el.innerHTML = list.map((c, i) => `
    <button class="country-option ${c.code === selectedCountry.code && c.name === selectedCountry.name ? "country-selected" : ""}"
      onclick="chooseCountry(${i === -1 ? 0 : COUNTRIES.indexOf(c)})">
      <span class="co-flag">${c.flag}</span>
      <span class="co-name">${c.name}</span>
      <span class="co-code">${c.code}</span>
    </button>
  `).join("");
}

function chooseCountry(idx) {
  const country = COUNTRIES[idx];
  if (!country) return;
  applyCountry(country);
  document.getElementById("country-dropdown").classList.add("hidden");
}

// ── Phone number input validation ─────────────────────────────
function onPhoneInput(input) {
  // Strip non-digits
  input.value = input.value.replace(/\D/g, "");
  updatePhoneHint(selectedCountry, input.value);
  updateHiddenPhone();
}

function updatePhoneHint(country, value) {
  const hint = document.getElementById("phone-hint");
  if (!hint) return;
  const len   = value.length;
  const valid = country.len.includes(len);
  const min   = Math.min(...country.len);
  const max   = Math.max(...country.len);

  if (!value) {
    hint.textContent = `Enter ${min === max ? min : min + "–" + max} digits`;
    hint.className   = "phone-hint";
  } else if (valid) {
    hint.textContent = "✓ Valid number";
    hint.className   = "phone-hint hint-ok";
  } else if (len < min) {
    hint.textContent = `${min - len} more digit${min - len !== 1 ? "s" : ""} needed`;
    hint.className   = "phone-hint hint-warn";
  } else {
    hint.textContent = `Too long — max ${max} digits for ${selectedCountry.name}`;
    hint.className   = "phone-hint hint-err";
  }
}

function updateHiddenPhone() {
  const num = document.getElementById("v-phone-number")?.value || "";
  const hidden = document.getElementById("v-phone");
  if (hidden) hidden.value = selectedCountry.code + num;
}

// Validate phone before sign-in
function isPhoneValid() {
  const num = document.getElementById("v-phone-number")?.value || "";
  return selectedCountry.len.includes(num.length);
}

// Close country dropdown on outside click
document.addEventListener("click", e => {
  const dd  = document.getElementById("country-dropdown");
  const btn = document.getElementById("country-picker-btn");
  if (dd && btn && !dd.contains(e.target) && !btn.contains(e.target)) {
    dd.classList.add("hidden");
  }
});
