import { db } from "./firebase.js";
import {
collection,
addDoc,
getDocs,
deleteDoc,
doc,
Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const listBox = document.getElementById("couponList");

// ================= SAVE COUPON =================
window.saveCoupon = async function () {
const code = document.getElementById("code").value.trim().toUpperCase();
const type = document.getElementById("type").value;
const value = Number(document.getElementById("value").value || 0);
const minOrder = Number(document.getElementById("minOrder").value || 0);
const expiryRaw = document.getElementById("expiry").value;
const scope = document.getElementById("scope").value;
const stackRule = document.getElementById("stackRule").value;

const modes = [...document.querySelectorAll(".payMode:checked")].map(
x => x.value
);

if (!code || !value || !expiryRaw) {
alert("Fill all required fields");
return;
}

const expiry = new Date(expiryRaw);

try {
await addDoc(collection(db, "coupons"), {
code,
type, // percent | flat
value,
minOrder,
expiry: Timestamp.fromDate(expiry),
scope, // global | product
allowedModes: modes, // ["online","cod","advance"]
stackRule, // stack | replace | best
createdAt: Date.now(),
active: true
});

alert("Coupon saved");  
clearForm();  
loadCoupons();

} catch (err) {
alert("Error: " + err.message);
}
};

// ================= LOAD COUPONS =================
async function loadCoupons() {
listBox.innerHTML = "Loading...";
const snap = await getDocs(collection(db, "coupons"));

listBox.innerHTML = "";

snap.forEach(d => {
const c = d.data();

const div = document.createElement("div");  
div.className = "coupon-card";  

const exp = c.expiry?.toDate  
  ? c.expiry.toDate().toLocaleDateString()  
  : "N/A";  

div.innerHTML = `  
  <b>${c.code}</b>  
  <div>${c.type} - ${c.value}</div>  
  <div>Min order: ₹${c.minOrder}</div>  
  <div>Expiry: ${exp}</div>  
  <div>Modes: ${c.allowedModes.join(", ")}</div>  
  <div>Scope: ${c.scope}</div>  
  <div>Rule: ${c.stackRule}</div>  
  <button onclick="deleteCoupon('${d.id}')">Delete</button>  
`;  

listBox.appendChild(div);

});
}

// ================= DELETE COUPON =================
window.deleteCoupon = async function (id) {
if (!confirm("Delete this coupon?")) return;
await deleteDoc(doc(db, "coupons", id));
loadCoupons();
};

// ================= UTIL =================
function clearForm() {
document.getElementById("code").value = "";
document.getElementById("value").value = "";
document.getElementById("minOrder").value = "";
document.getElementById("expiry").value = "";
document.querySelectorAll(".payMode").forEach(x => (x.checked = false));
}

loadCoupons();
