const client = require("../services/twilio");
const VoiceResponse = require("twilio").twiml.VoiceResponse;
const { getIO, rideToUserMap  } = require("../socket");

module.exports.callDriver = (req, res) => {
  const { phone, rideId, pickup, destination } = req.body;

  client.calls
    .create({
      to: phone,
      from: process.env.TWILIO_PHONE_NUMBER,
      url: `${process.env.URL}/twilio/ivr?pickup=${encodeURIComponent(
        pickup
      )}&destination=${encodeURIComponent(destination)}&rideId=${rideId}`,
    })
    .then((call) => {
      console.log("Call SID:", call.sid);
      res.status(200).json({ success: true, callSid: call.sid });
    })
    .catch((err) => {
      console.error("Call error:", err);
      res.status(500).json({ success: false, error: err.message });
    });
};

// module.exports.voice = (req, res) => {
//   const twiml = new VoiceResponse();

//   twiml.say(
//   { voice: 'Polly.Aditi', language: 'hi-IN' },
//   'नमस्ते! आपके पास एक नयी राइड है। पिकअप लोकेशन Delhi से, डेस्टिनेशन Noida तक। अगर आप राइड कन्फर्म करना चाहते हैं तो 1 दबाइये। अगर आप राइड कैंसल करना चाहते हैं तो 0 दबाइये।'
// );

//   res.type("text/xml");
//   res.send(twiml.toString()); // Twilio expects properly stringified XML
// };

module.exports.ivr = (req, res) => {
  const { pickup, destination, rideId } = req.query;

  const twiml = new VoiceResponse();

  // Gather user input
  const gather = twiml.gather({
    action: `/twilio/handle-input?rideId=${rideId}&pickup=${encodeURIComponent(
      pickup
    )}&destination=${encodeURIComponent(destination)}`,
    numDigits: 1,
    timeout: 10,
  });

  gather.say(
    { voice: "Polly.Aditi", language: "hi-IN" },
    `नमस्ते! आपके पास एक नयी राइड है। पिकअप लोकेशन ${pickup} से, डेस्टिनेशन ${destination} तक। अगर आप राइड कन्फर्म करना चाहते हैं तो 1 दबाइये। अगर आप राइड कैंसल करना चाहते हैं तो 0 दबाइये।`
  );

  res.type("text/xml");
  res.send(twiml.toString());
};

module.exports.handleInput = (req, res) => {
  try {
    const digit = req.body.Digits;
    const rideId = req.query.rideId;
    const pickup = req.query.pickup;
    const destination = req.query.destination;

    const io = getIO();
    const rideInfo = rideToUserMap[rideId];

    const twiml = new VoiceResponse();

    if (!rideInfo) {
      console.error(`No ride mapping found for rideId: ${rideId}`);

      twiml.say(
        { voice: "Polly.Aditi", language: "hi-IN" },
        "इस राइड की जानकारी नहीं मिली। कृपया पुनः प्रयास करें।"
      );

      res.type("text/xml").send(twiml.toString());
      return;
    }

    if (digit === "1") {
      console.log(`Ride from ${pickup} to ${destination} accepted by driver.`);

      // Emit socket event to user
      io.to(rideInfo.socketId).emit("ride-accepted", {
        rideId,
        pickup,
        destination,
      });

      // ✅ Send SMS to driver
      const driverPhone = rideInfo.phone;
      const price = rideInfo.price;

      if (driverPhone && price) {
        const smsBody = `Sent from your Twilio trial account - Ride accepted.\nPickup: ${pickup}\nDestination: ${destination}\nFare: Rs ${price}`;

        client.messages
          .create({
            body: smsBody,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: driverPhone,
          })
          .then((message) => {
            console.log("SMS sent after ride acceptance:", message.sid);
          })
          .catch((err) => {
            console.error("Failed to send SMS after ride acceptance:", err.message);
          });
      } else {
        console.warn("Missing driverPhone or price for SMS.");
      }
      

      // Clean up
      delete rideToUserMap[rideId];

      twiml.say(
        { voice: "Polly.Aditi", language: "hi-IN" },
        `आपने ${pickup} से ${destination} तक की राइड स्वीकार कर ली है। धन्यवाद!`
      );
    } else if (digit === "0") {
      console.log(`Ride from ${pickup} to ${destination} rejected by driver.`);

      io.to(rideInfo.socketId).emit("ride-rejected", {
        rideId,
        pickup,
        destination,
      });

      delete rideToUserMap[rideId];

      twiml.say(
        { voice: "Polly.Aditi", language: "hi-IN" },
        `आपने ${pickup} से ${destination} तक की राइड अस्वीकार कर दी है। धन्यवाद!`
      );
    } else {
      twiml.say(
        { voice: "Polly.Aditi", language: "hi-IN" },
        "आपने सही विकल्प नहीं चुना। कृपया फिर से प्रयास करें।"
      );
    }

    res.type("text/xml").send(twiml.toString());
  } catch (error) {
    console.error("Error in handleInput:", error.message);

    const twiml = new VoiceResponse();
    twiml.say(
      { voice: "Polly.Aditi", language: "hi-IN" },
      "सर्वर में कोई त्रुटि हुई है। कृपया बाद में पुनः प्रयास करें।"
    );

    res.type("text/xml").status(500).send(twiml.toString());
  }
};