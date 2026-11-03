import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../src/config/database.js';
import Bus from '../src/models/Bus.js';
import Route from '../src/models/Route.js';
import Stop from '../src/models/Stop.js';

dotenv.config();

const seedRoutes = async () => {
  try {
    await connectDB();

    console.log('🧹 Clearing existing buses, routes, and assignments...');
    await Bus.deleteMany({});
    await Route.deleteMany({});
    // Also clear assignments so we start fresh
    await mongoose.connection.collection('studentbusassignments').deleteMany({});
    await mongoose.connection.collection('representativeassignments').deleteMany({});

    // 1. Create 6 Buses
    console.log('🚌 Creating 6 Buses...');
    const buses = [];
    for (let i = 1; i <= 6; i++) {
      const bus = await Bus.create({
        busNumber: `B-0${i}`,
        registrationNumber: `TN 38 XX ${1000 + i}`,
        capacity: 50,
        availabilityStatus: 'available'
      });
      buses.push(bus);
    }

    // 2. Define the exact route stop lists
    const routesData = [
      {
        routeName: 'Route 1',
        routeNumber: 'R01',
        stops: ['Sulur', 'Pappampatti Pirivu', 'Ondipudur', 'Singanallur', 'Thanneer Panthal', 'Cheran Ma Nagar', 'Vilankurichi']
      },
      {
        routeName: 'Route 2',
        routeNumber: 'R02',
        stops: ['Uzhavar Sandhai', 'Ramanathapuram', 'Peelamedu', 'Thanneer Panthal', 'Cheran Ma Nagar', 'Vilankurichi']
      },
      {
        routeName: 'Route 3',
        routeNumber: 'R03',
        stops: ['Singanallur', 'Varatharaja Puram', 'Hopes', 'Thanneer Panthal']
      },
      {
        routeName: 'Route 4',
        routeNumber: 'R04',
        stops: ['Karumathampatti', 'Muthalipalayam Pirivu', 'Chinniyampalayam', 'KMCH', 'Sitra', 'Nehru Nagar']
      },
      {
        routeName: 'Route 5',
        routeNumber: 'R05',
        stops: ['Ramanathapuram', 'Puliyakulam', 'Navaindia', 'Peelamedu', 'Tirupur Textiles']
      },
      {
        routeName: 'Route 6',
        routeNumber: 'R06',
        stops: ['Sivanandha Colony', 'Kalyan Silks', 'Ganapathy', 'Bharathi Nagar', 'Water Tank', 'Amman Kovil']
      }
    ];

    // Helper to find a Stop by a partial name match (e.g. "Sulur" matches the full descriptive name)
    const findStopIdByName = async (searchName) => {
      // We use a case-insensitive regex so "Sulur" matches "Sulur (In front of King Bakes...)"
      const stop = await Stop.findOne({ name: { $regex: new RegExp('^' + searchName, 'i') } });
      if (!stop) {
        console.log(`⚠️ Could not find stop matching: ${searchName}`);
        return null;
      }
      return stop._id;
    };

    // 3. Create Routes and link to Buses
    console.log('🛣️ Creating Routes...');

    for (let i = 0; i < routesData.length; i++) {
      const data = routesData[i];
      const bus = buses[i]; // Assign Bus 1 to Route 1, Bus 2 to Route 2, etc.

      const stopIds = [];
      for (const stopName of data.stops) {
        const id = await findStopIdByName(stopName);
        if (id) stopIds.push(id);
      }

      const route = await Route.create({
        routeName: data.routeName,
        routeNumber: data.routeNumber,
        busId: bus._id,
        stops: stopIds,
        isActive: true,
      });

      // Update the Bus to point to this route
      bus.currentRouteId = route._id;
      await bus.save();

      console.log(`✅ ${route.routeName} created with ${stopIds.length} stops, assigned to ${bus.busNumber}`);
    }

    console.log('\n=========================================');
    console.log('🎉 All 6 Routes and Buses created successfully!');
    console.log('=========================================');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed routes:', error);
    process.exit(1);
  }
};

seedRoutes();