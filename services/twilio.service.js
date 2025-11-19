const client = require('./twilio');

exports.callDriver = (toPhone, rideId) => {
  return client.calls.create({
    to: toPhone,
    from: process.env.TWILIO_PHONE_NUMBER,
    url: `/twilio/ivr?rideId=${rideId}`,
  });
};
