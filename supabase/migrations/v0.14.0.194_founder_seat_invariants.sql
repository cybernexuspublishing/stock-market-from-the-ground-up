-- v0.14.0.194 Release-gated Founding 600 data invariants.
-- One original member account may consume at most one permanent seat.
CREATE UNIQUE INDEX IF NOT EXISTS gu_founder_one_consumed_user_v014194
 ON public.gu_founder_reservations_v014173(user_id)
 WHERE reservation_state='consumed';
-- Ensure a bound Stripe Session never disappears from a live reservation.
ALTER TABLE public.gu_founder_reservations_v014173
 ADD CONSTRAINT gu_founder_bound_has_session_v014194
 CHECK(reservation_state NOT IN ('bound','consumed') OR checkout_session_id IS NOT NULL);
-- A session's verified Price ID is stored before any payment is consumed.
ALTER TABLE public.gu_founder_reservations_v014173
 ADD CONSTRAINT gu_founder_bound_has_price_v014194
 CHECK(reservation_state NOT IN ('bound','consumed') OR checkout_price_id IS NOT NULL);
