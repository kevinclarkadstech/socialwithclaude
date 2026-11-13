/**
 * Notifications: what the API tells people, and how. Only actions/ is public:
 * callers say what happened (sendOtp) and never pick a channel. Each channel
 * (email/, later push/) has its own delivery/ (how it's sent) and templates/
 * (what each message says).
 */
export { assertCanNotify } from "./actions/assertCanNotify/assertCanNotify";
export { sendOtp } from "./actions/sendOtp/sendOtp";
