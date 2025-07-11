export interface PaymentRequest {
  booking_id: string;
  amount: number;
  field_name: string;
  date: string;
  time: string;
}

export interface BookingData {
  id: string;
  user_id: string;
  total_price: number;
  fields: {
    name: string;
    owner_id: string;
  };
  status: string;
  payment_status: string;
}

export interface CinetPayConfig {
  apiKey: string;
  siteId: string;
  checkoutUrl: string;
}

export interface CinetPayPaymentData {
  apikey: string;
  site_id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  description: string;
  customer_name: string;
  customer_surname: string;
  customer_email: string;
  customer_phone_number: string;
  return_url: string;
  notify_url: string;
  channels: string;
  metadata: string;
}

export interface PaymentResponse {
  url: string;
  transaction_id: string;
  escrow_mode: boolean;
  confirmation_deadline: string;
  phase: string;
  amount: number;
  currency: string;
}