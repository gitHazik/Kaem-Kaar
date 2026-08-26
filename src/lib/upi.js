export const isMobileDevice = () => {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export const buildUpiIntentLink = ({ payeeVpa, payeeName, amount, note, txnRef }) => {
  const params = new URLSearchParams({
    pa: payeeVpa,
    pn: payeeName,
    am: String(amount),
    cu: "INR",
    tn: note || "Booking payment",
    tr: txnRef,
  });
  return `upi://pay?${params.toString()}`;
};

export const generateTxnRef = () =>
  `KK${Date.now()}${Math.floor(Math.random() * 1000)}`;

export const MERCHANT_VPA = import.meta.env.VITE_UPI_VPA || "7051477357@fam";
export const MERCHANT_NAME = "Kaem Kaar";
