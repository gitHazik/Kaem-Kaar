import { useEffect, useMemo, useState } from "react";
import { Loader2, X, CheckCircle2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  isMobileDevice,
  buildUpiIntentLink,
  generateTxnRef,
  MERCHANT_VPA,
  MERCHANT_NAME,
} from "@/lib/upi";

// PaymentSheet
// - amount: number, the fee to collect (e.g. 10)
// - workerName: string, shown in the note
// - onClose: () => void
// - onConfirmed: async () => void  — called once the user confirms they've paid.
//   NOTE: this is a manual confirmation because there's no payment gateway wired in yet.
//   To make this real: replace the "I've paid" step with a call to your backend, which
//   creates a UPI collect request via a PSP (Razorpay/Cashfree) and polls/receives a
//   webhook when the payment actually clears, then calls onConfirmed() from that result.
const PaymentSheet = ({ amount, workerName, onClose, onConfirmed }) => {
  const [step, setStep] = useState("pay"); // "pay" | "waiting" | "confirming"
  const [upiId, setUpiId] = useState("");
  const mobile = useMemo(() => isMobileDevice(), []);
  const txnRef = useMemo(() => generateTxnRef(), []);

  const upiLink = useMemo(
    () =>
      buildUpiIntentLink({
        payeeVpa: MERCHANT_VPA,
        payeeName: MERCHANT_NAME,
        amount,
        note: `Booking fee - ${workerName}`,
        txnRef,
      }),
    [amount, workerName, txnRef]
  );

  // On mobile, pressing "Pay" opens the UPI app directly.
  const handlePayOnMobile = () => {
    window.location.href = upiLink;
    setStep("waiting");
  };

  // On web, this mimics the "enter UPI ID, we send you a request" flow (like Amazon/Swiggy web checkout).
  // TODO: wire this to your backend's UPI Collect Request API call instead of a client-side timer.
  const handleSendRequest = () => {
    if (!upiId.includes("@")) {
      toast.error("Enter a valid UPI ID, e.g. name@bank");
      return;
    }
    setStep("waiting");
    toast.success("Payment request sent to your UPI app");
  };

  const handleConfirm = async () => {
    setStep("confirming");
    try {
      // On success the parent unmounts this sheet (it navigates to the booking).
      // Don't touch state after that — only recover state on failure.
      await onConfirmed();
    } catch (error) {
      toast.error(error?.message || "Something went wrong — please try again");
      setStep("waiting");
    }
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end justify-center">
      <div className="w-full max-w-[480px] bg-background rounded-t-3xl p-6 space-y-5 animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Confirm booking</h2>
          <button onClick={onClose} className="text-muted-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-baseline justify-between bg-muted/50 rounded-2xl p-4">
          <span className="text-sm text-muted-foreground">Booking fee</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xs line-through text-muted-foreground">₹50</span>
            <span className="text-2xl font-black text-foreground">₹{amount}</span>
          </div>
        </div>

        {step === "pay" && (
          mobile ? (
            <Button
              onClick={handlePayOnMobile}
              className="w-full h-14 rounded-xl text-base font-bold flex items-center justify-center gap-2"
            >
              <Smartphone size={18} /> Pay ₹{amount} with UPI app
            </Button>
          ) : (
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Your UPI ID
              </label>
              <Input
                value={upiId}
                onChange={(event) => setUpiId(event.target.value)}
                placeholder="yourname@okhdfcbank"
                className="h-12 rounded-xl"
              />
              <Button onClick={handleSendRequest} className="w-full h-12 rounded-xl font-bold">
                Send payment request
              </Button>
            </div>
          )
        )}

        {step === "waiting" && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              {mobile
                ? "Complete the payment in your UPI app, then confirm below."
                : "Approve the request in your UPI app, then confirm below."}
            </p>
            <Button
              onClick={handleConfirm}
              className="w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} /> I've completed the payment
            </Button>
            <button
              onClick={() => setStep("pay")}
              className="text-xs font-bold text-muted-foreground underline"
            >
              Payment didn't go through, try again
            </button>
          </div>
        )}

        {step === "confirming" && (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSheet;
