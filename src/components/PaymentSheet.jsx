import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { loadRazorpayScript } from "@/lib/razorpay";

// PaymentSheet
// - amount: number, the booking fee (e.g. 10)
// - workerId: the worker being booked — sent to the server, which looks up their details
// - workerName: shown in the sheet and the Razorpay checkout description
// - onClose: () => void
// - onPaid: (jobId) => void — called ONLY after the server has verified the payment
//   signature and created the booking. Nothing here is trusted client-side.
const PaymentSheet = ({ amount, workerId, workerName, onClose, onPaid }) => {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) throw new Error("Could not load the payment SDK — check your connection");

      const { data: order, error: orderError } = await supabase.functions.invoke(
        "create-razorpay-order",
        { body: { amount } }
      );
      if (orderError) throw new Error(orderError.message);
      if (order?.error) throw new Error(order.error);

      const checkout = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: "Kaem Kaar",
        description: `Booking fee — ${workerName}`,
        theme: { color: "#111827" },
        handler: async (response) => {
          try {
            const { data: result, error: verifyError } = await supabase.functions.invoke(
              "verify-booking-payment",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  workerId,
                },
              }
            );
            if (verifyError) throw new Error(verifyError.message);
            if (result?.error) throw new Error(result.error);

            toast.success("Payment verified — worker booked!");
            onPaid(result.job_id);
          } catch (error) {
            toast.error(error.message || "Payment verification failed");
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });

      checkout.on("payment.failed", () => {
        toast.error("Payment failed — please try again");
        setLoading(false);
      });

      checkout.open();
    } catch (error) {
      toast.error(error.message || "Could not start payment");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end justify-center">
      <div className="w-full max-w-[480px] bg-background rounded-t-3xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Confirm booking</h2>
          <button onClick={onClose} disabled={loading} className="text-muted-foreground disabled:opacity-40">
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

        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full h-14 rounded-xl text-base font-bold bg-primary text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : `Pay ₹${amount} securely`}
        </button>

        <p className="text-[11px] text-center text-muted-foreground">
          Payments are processed and verified by Razorpay. Kaem Kaar never sees your UPI PIN or bank details.
        </p>
      </div>
    </div>
  );
};

export default PaymentSheet;
