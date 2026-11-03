import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../src/config/database.js';
import Stop from '../src/models/Stop.js';

dotenv.config();

const stopsData = [
  { name: 'Sulur (In front of King Bakes / Old Bus Stand)', latitude: 11.02640, longitude: 77.12780 },
  { name: 'Pappampatti Pirivu (Trichy Road Junction Bus Shelter)', latitude: 10.98560, longitude: 77.06210 },
  { name: 'Ondipudur (Near Flyover / Bus Stand)', latitude: 10.99820, longitude: 77.04250 },
  { name: 'Singanallur (Trichy Road Bus Bay)', latitude: 10.99980, longitude: 77.02530 },
  { name: 'Thanneer Panthal (Near VKG Bakery)', latitude: 11.03360, longitude: 77.01420 },
  { name: 'Cheran Ma Nagar (Near SBI ATM / Main Bus Stop)', latitude: 11.04890, longitude: 77.01250 },
  { name: 'Vilankurichi (Near Vinayagar Temple Bus Stop)', latitude: 11.05480, longitude: 77.00410 },
  { name: 'Uzhavar Sandhai (Near Market Gate, Trichy Road)', latitude: 11.00210, longitude: 77.02050 },
  { name: 'Ramanathapuram (Near 80 Feet Road Signal)', latitude: 10.99350, longitude: 76.98920 },
  { name: 'Peelamedu (Near PSG Tech Bus Shelter)', latitude: 11.02420, longitude: 77.00280 },
  { name: 'Varatharaja Puram (Near A2B / Bus Shelter)', latitude: 11.00620, longitude: 77.01650 },
  { name: 'Hopes (Near Fun Republic Mall Bus Bay)', latitude: 11.02510, longitude: 77.01290 },
  { name: 'Karumathampatti (Near Toll Gate Bus Stop)', latitude: 11.10680, longitude: 77.18120 },
  { name: 'Muthalipalayam Pirivu (Near Tea Time Bakery)', latitude: 11.08210, longitude: 77.12640 },
  { name: 'Chinniyampalayam (Near Airport Flyover Junction)', latitude: 11.05520, longitude: 77.07290 },
  { name: 'KMCH (Opposite Hospital Main Entrance)', latitude: 11.04680, longitude: 77.05430 },
  { name: 'Sitra (Airport Road Roundabout Bus Bay)', latitude: 11.03920, longitude: 77.03980 },
  { name: 'Nehru Nagar (Near Medical College Bus Shelter)', latitude: 11.05120, longitude: 77.04210 },
  { name: 'Puliyakulam (Near Mundhi Vinayagar Kovil)', latitude: 10.99950, longitude: 76.98560 },
  { name: 'Navaindia (Opposite SNR Sons College)', latitude: 11.01820, longitude: 76.99120 },
  { name: 'Tirupur Textiles (Near Reliance Smart Point)', latitude: 11.02890, longitude: 77.00840 },
  { name: 'Sivanandha Colony (Near Sub-Registrar Office)', latitude: 11.02680, longitude: 76.95320 },
  { name: 'Kalyan Silks (100 Feet Road Bus Bay)', latitude: 11.01950, longitude: 76.96420 },
  { name: 'Ganapathy (Near Surya Bakery / Police Station)', latitude: 11.03650, longitude: 76.97410 },
  { name: 'Bharathi Nagar (Near Indian Bank Bus Stop)', latitude: 11.04520, longitude: 76.97890 },
  { name: 'Water Tank (Opposite Arch / Overhead Tank)', latitude: 11.05610, longitude: 76.98420 },
  { name: 'Amman Kovil (Near Saravanampatti Checkpost)', latitude: 11.07420, longitude: 76.99610 }
];

const seedStops = async () => {
  try {
    await connectDB();
    console.log('🧹 Clearing existing stops to avoid duplicates...');
    await Stop.deleteMany({}); // Removes old stops so we have a clean slate

    console.log('📍 Inserting 27 stops into MongoDB...');

    // Insert all stops at once
    await Stop.insertMany(stopsData);

    console.log('✅ All 27 stops created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed stops:', error);
    process.exit(1);
  }
};

seedStops();