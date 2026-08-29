// Loads Razorpay's hosted checkout script once. This modal is what actually shows
// the UPI app picker on mobile and the QR/collect flow on desktop — no custom UPI
// deep-link code needed anymore.
export const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
