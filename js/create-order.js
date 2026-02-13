import { db } from "./firebase.js";
import {
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

window.createAdminOrder = async function () {
  const order = {
    orderNumber: "SF-" + Date.now(),
    source: "admin",
    createdBy: "admin",
    createdAt: serverTimestamp(),
    status: "pending",

    customer: {
      name: custName.value,
      phone: custPhone.value,
      address: custAddress.value,
      pincode: custPincode.value
    },

    payment: {
      method: paymentMode.value,
      status: paymentMode.value === "offline" ? "paid" : "pending"
    },

    timeline: {
      pending: serverTimestamp()
    }
  };

  await addDoc(collection(db, "orders"), order);
  alert("Admin order created");
};