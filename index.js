const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

// GST Slab (Assumption: 18% GST)
const GST_RATE = 0.18;

exports.processGSTInvoice = functions.firestore
  .document("bookings/{bookingId}")
  .onUpdate(async (change, context) => {
    const newValue = change.after.data();
    const oldValue = change.before.data();

    // Only trigger if status changes to "finished"
    if (newValue.status !== "finished" || oldValue.status === "finished") {
      return null;
    }

    const { name, totalBookingAmount } = newValue;
    if (!totalBookingAmount) {
      console.error("Total Booking Amount missing");
      return null;
    }

    // Calculate GST
    const gstAmount = totalBookingAmount * GST_RATE;
    const cgst = gstAmount / 2; // 50% CGST
    const sgst = gstAmount / 2; // 50% SGST
    const igst = gstAmount; // Used for inter-state transactions

    // Determine GST Type (Assumption: Intra-state)
    const gstDetails = {
      name,
      totalBookingAmount,
      gstAmount,
      cgst,
      sgst,
      igst: 0, // Default to intra-state
    };

    console.log("GST Details:", gstDetails);

    // Call GST API for filing (Implement GST API Integration below)
    try {
      const response = await fileGST(gstDetails);
      console.log("GST Filing Response:", response.data);

      // Save GST details in Firestore (Optional)
      await db
        .collection("gstInvoices")
        .doc(context.params.bookingId)
        .set({
          ...gstDetails,
          gstFiled: true,
          filedAt: admin.firestore.Timestamp.now(),
        });
    } catch (error) {
      console.error("GST Filing Error:", error.response?.data || error.message);
    }

    return null;
  });

const GST_API = ""; // I am not able to get the gst api

async function fileGST(gstDetails) {
  try {
    const response = await axios.post(GST_API, gstDetails, {
      headers: {
        "x-api-key": "YOUR_API_KEY", // Get from ClearTax
        "Content-Type": "application/json",
      },
    });
    return response;
  } catch (error) {
    throw error;
  }
}
