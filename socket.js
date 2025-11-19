const socketIo = require("socket.io");
const rideService = require("./services/ride.service");
// const captainModel = require("../models/captain.model"); // ✅ Import the captain model

let io;

const activeSharedTrips = {};

const getRouteId = (pickup, destination, vehicleType) => {
  return `${pickup}-${destination}-${vehicleType}`.replace(/\s+/g, "");
};

const getClientSafeTrip = (trip) => {
    if (!trip) return null;
    const { timeout, ...clientTrip } = trip;
    return clientTrip;
};


function initializeSocket(server) {
  io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("join", (data) => {
      const { userId, userType } = data;
      socket.join(userId);
      console.log(`User ${userType} with ID ${userId} joined room ${userId}`);
    });

    socket.on("create-ride-sharing", async (rideData) => {
        const {
            rideId, pickup, destination, userId, vehicleType, name, phone, passengerCount,
        } = rideData;

        if (!passengerCount || passengerCount < 1) {
            return socket.emit("ride-creation-error", { message: "Invalid passenger count." });
        }

        const routeId = getRouteId(pickup, destination, vehicleType);
        const existingTrip = activeSharedTrips[routeId];

        if (
            existingTrip &&
            existingTrip.status === "OPEN" &&
            existingTrip.capacity - existingTrip.seatsFilled >= passengerCount
        ) {
            const trip = existingTrip;
            console.log(`User ${userId} joining existing trip for route ${routeId}`);

            trip.passengers.push({ userId, rideId, passengerCount, socketId: socket.id, name, phone });
            trip.seatsFilled += passengerCount;

            if (trip.seatsFilled >= trip.capacity) {
                trip.status = "FULL";
                if(trip.timeout) clearTimeout(trip.timeout);
                console.log(`Trip for route ${routeId} is now full.`);
            }

            const clientSafeTrip = getClientSafeTrip(trip);
            socket.emit("shared-ride-joined", { trip: clientSafeTrip });

            const totalPassengersInTrip = trip.seatsFilled;
            trip.passengers.forEach((p) => {
                const passengerFare = Math.round((trip.baseFare / totalPassengersInTrip) * p.passengerCount);
                io.to(p.socketId).emit("shared-ride-updated", {
                    trip: clientSafeTrip,
                    yourFare: passengerFare,
                });
            });

        } else {
            console.log(`Creating new trip for route ${routeId}`);
            try {
                const fare = await rideService.getFare(pickup, destination);
                const baseFare = fare[vehicleType];

                if (!baseFare) throw new Error("Could not calculate base fare for this route.");

                const newTrip = {
                    primaryRideId: rideId,
                    driverId: null,
                    passengers: [{ userId, rideId, passengerCount, socketId: socket.id, name, phone }],
                    capacity: 4,
                    seatsFilled: passengerCount,
                    pickup, destination, vehicleType, baseFare,
                    status: "OPEN",
                    createdAt: new Date(),
                    timeout: null,
                };
                
                // ✅ --- FIND AND ASSIGN A DRIVER ---
                // try {
                //     // Find an available driver who is not already on a trip
                //     const availableDriver = await captainModel.findOne({ isAvailable: true, vehicleType: vehicleType });
                //     if (availableDriver) {
                //         newTrip.driverId = availableDriver._id.toString();
                //         newTrip.status = "ASSIGNED";
                //         console.log(`Driver ${availableDriver._id} assigned to trip ${routeId}`);
                        
                //         // Notify the assigned driver
                //         io.to(newTrip.driverId).emit('new-shared-trip-request', { trip: getClientSafeTrip(newTrip) });
                //     } else {
                //         console.log("No available drivers found for this trip yet.");
                //     }
                // } catch (dbError) {
                //     console.error("Error finding a driver:", dbError);
                // }
                // --- END DRIVER ASSIGNMENT ---

                newTrip.timeout = setTimeout(() => {
                    const tripToClose = activeSharedTrips[routeId];
                    if (tripToClose && tripToClose.status !== "CLOSED" && tripToClose.status !== "FULL") {
                        console.log(`Trip for route ${routeId} has timed out.`);
                        tripToClose.status = "CLOSED";
                        const clientSafeClosedTrip = getClientSafeTrip(tripToClose);
                        tripToClose.passengers.forEach((p) => {
                            io.to(p.socketId).emit("shared-ride-window-closed", { trip: clientSafeClosedTrip });
                        });
                    }
                }, 10 * 1000);

                activeSharedTrips[routeId] = newTrip;
                const passengerFare = Math.round((newTrip.baseFare / newTrip.seatsFilled) * newTrip.passengers[0].passengerCount);
                socket.emit("shared-ride-created", { trip: getClientSafeTrip(newTrip), yourFare: passengerFare });

            } catch (error) {
                console.error("Error creating new shared trip:", error.message);
                socket.emit("ride-creation-error", { message: "Could not create ride." });
            }
        }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

module.exports = {
  initializeSocket,
  getIO,
  activeSharedTrips,
};
