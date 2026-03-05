"use client";
import { useState, useEffect } from "react";
import { orderApi, paymentApi, type Order } from "@/lib/api";
import { formatINR, formatDate, statusColor } from "@/lib/utils";

export default function BuyerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    orderApi.list().then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handlePay = async (order: Order) => {
    setPayingId(order.id);
    try {
      const { razorpayOrderId, amount } = await paymentApi.createOrder(order.id);
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency: "INR",
        order_id: razorpayOrderId,
        name: "BuildMart",
        description: `Payment for ${order.orderNumber}`,
        handler: async (response: any) => {
          await paymentApi.verify({
            orderId: order.id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "PAID" } : o));
        },
        theme: { color: "#ea580c" },
      };
      const rp = new (window as any).Razorpay(options);
      rp.open();
    } catch (err: any) {
      alert(err.message ?? "Payment failed");
    } finally {
      setPayingId(null);
    }
  };

  const handleConfirmDelivery = async (orderId: string) => {
    await orderApi.confirmDelivery(orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "COMPLETED" } : o));
  };

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-8 text-gray-400">Loading orders...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No orders yet. Accept a quote on one of your RFQs to create an order.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-xl border p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{order.orderNumber}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{order.deliveryAddress}</p>
                  <p className="text-sm text-gray-500">Created {formatDate(order.createdAt)}</p>
                  {order.vendorProfile && (
                    <p className="text-sm text-gray-700 mt-1">Vendor: {order.vendorProfile.businessName}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">{formatINR(order.totalAmount)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 flex-wrap">
                {order.status === "PENDING" && (
                  <button onClick={() => handlePay(order)} disabled={payingId === order.id}
                    className="px-5 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors">
                    {payingId === order.id ? "Opening payment..." : "Pay Now via Razorpay"}
                  </button>
                )}
                {order.status === "DISPATCHED" && (
                  <button onClick={() => handleConfirmDelivery(order.id)}
                    className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                    Confirm Delivery Received
                  </button>
                )}
                {order.status === "PAID" && (
                  <p className="text-sm text-blue-600 font-medium py-2">
                    Payment captured. Waiting for vendor to dispatch.
                  </p>
                )}
                {order.status === "COMPLETED" && (
                  <p className="text-sm text-green-600 font-medium py-2">
                    Order completed. Vendor payout released.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
    </div>
  );
}
