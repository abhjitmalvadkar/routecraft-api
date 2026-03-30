import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import { AgentMarkupConfig } from '../entities/agent-markup-config.entity';
import { Destination } from '../entities/destination.entity';
import { Service } from '../entities/service.entity';
import { Quote } from '../entities/quote.entity';
import { Role, ServiceCategory, RateUnit } from '../entities/enums';
import * as bcrypt from 'bcryptjs';

config(); // load .env

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'routecraft',
    entities: [Organization, User, AgentMarkupConfig, Destination, Service, Quote],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('Database connected.');

  const orgRepo = dataSource.getRepository(Organization);
  const userRepo = dataSource.getRepository(User);
  const configRepo = dataSource.getRepository(AgentMarkupConfig);
  const destRepo = dataSource.getRepository(Destination);
  const serviceRepo = dataSource.getRepository(Service);

  // 1. Create Super Admin
  const superAdmin = await userRepo.save({
    email: 'admin@routecraft.com',
    password: await bcrypt.hash('Admin@1234', 10),
    name: 'RouteCraft Admin',
    role: Role.SUPER_ADMIN,
    mustChangePassword: false,
  });
  console.log('Super Admin created:', superAdmin.email);

  // 2. Create Organization
  const org = await orgRepo.save({
    name: 'Desert Dreams DMC',
    slug: 'desert-dreams-dmc',
    description:
      'Premium destination management services across the UAE. Desert safaris, city tours, luxury transfers, and curated cultural experiences in Dubai, Abu Dhabi, and beyond.',
    defaultQuoteValidity: 3,
  });
  console.log('Organization created:', org.name);

  // 3. Create Org Admin
  const orgAdmin = await userRepo.save({
    email: 'admin@desertdreams.ae',
    password: await bcrypt.hash('Demo@1234', 10),
    name: 'Ahmed Al Rashid',
    role: Role.ORG_ADMIN,
    orgId: org.id,
    mustChangePassword: false,
  });
  console.log('Org Admin created:', orgAdmin.email);

  // 4. Create Agent
  const agent = await userRepo.save({
    email: 'priya@desertdreams.ae',
    password: await bcrypt.hash('Demo@1234', 10),
    name: 'Priya Sharma',
    role: Role.AGENT,
    orgId: org.id,
    mustChangePassword: false,
  });
  console.log('Agent created:', agent.email);

  // 5. Create Agent Markup Config
  await configRepo.save({
    agentId: agent.id,
    options: [
      { percentage: 5, flagged: true },
      { percentage: 10, flagged: true },
      { percentage: 15, flagged: false },
      { percentage: 20, flagged: false },
      { percentage: 25, flagged: false },
    ],
  });
  console.log('Agent Markup Config created for:', agent.name);

  // 6. Create Destinations
  const dubai = await destRepo.save({
    orgId: org.id,
    name: 'Dubai',
    country: 'United Arab Emirates',
    description:
      'The crown jewel of the UAE — superlatives, luxury, desert adventures, and stunning beaches.',
  });

  const abuDhabi = await destRepo.save({
    orgId: org.id,
    name: 'Abu Dhabi',
    country: 'United Arab Emirates',
    description:
      'The capital city — cultural landmarks, grand mosques, and island attractions.',
  });

  const sharjah = await destRepo.save({
    orgId: org.id,
    name: 'Sharjah',
    country: 'United Arab Emirates',
    description:
      'The cultural capital — museums, heritage areas, and art galleries.',
  });
  console.log('Destinations created: Dubai, Abu Dhabi, Sharjah');

  // 7. Create Services (20 total)

  // --- HOTELS (4) ---

  await serviceRepo.save({
    orgId: org.id,
    destinationId: dubai.id,
    name: 'JW Marriott Marquis Dubai',
    description:
      'Twin-tower 5-star hotel on Sheikh Zayed Road with stunning city views. Features world-class dining, an infinity pool, and a full-service spa. Ideal for business and luxury leisure travelers.',
    category: ServiceCategory.HOTELS,
    photos: [],
    vendorRate: 150,
    rateUnit: RateUnit.PER_ROOM_NIGHT,
    metadata: {
      starRating: 5,
      roomTypes: [
        { type: 'Deluxe Room', vendorRate: 150 },
        { type: 'Executive Suite', vendorRate: 300 },
      ],
      mealPlan: ['EP', 'CP', 'MAP'],
      checkInTime: '14:00',
      checkOutTime: '12:00',
      address: 'Sheikh Zayed Road, Business Bay, Dubai',
      amenities: [
        'Infinity Pool',
        'Full-Service Spa',
        '8 Restaurants',
        'Fitness Center',
        'Free WiFi',
        'Concierge',
        'Business Center',
      ],
    },
  });

  await serviceRepo.save({
    orgId: org.id,
    destinationId: dubai.id,
    name: 'Hilton Dubai Jumeirah',
    description:
      'Beachfront 5-star resort on The Walk at JBR with direct beach access. Offers stunning sea views, multiple dining options, and a kids club. Perfect for families and beach lovers.',
    category: ServiceCategory.HOTELS,
    photos: [],
    vendorRate: 120,
    rateUnit: RateUnit.PER_ROOM_NIGHT,
    metadata: {
      starRating: 5,
      roomTypes: [
        { type: 'Guest Room', vendorRate: 120 },
        { type: 'Premium Sea View', vendorRate: 200 },
      ],
      mealPlan: ['EP', 'CP'],
      checkInTime: '15:00',
      checkOutTime: '12:00',
      address: 'The Walk, JBR, Dubai',
      amenities: [
        'Private Beach',
        'Pool',
        '5 Restaurants',
        'Kids Club',
        'Fitness Center',
        'Free WiFi',
      ],
    },
  });

  await serviceRepo.save({
    orgId: org.id,
    destinationId: dubai.id,
    name: 'Rove Downtown',
    description:
      'Modern 3-star hotel in the heart of Downtown Dubai near Dubai Mall and Burj Khalifa. Affordable yet stylish with a rooftop pool. Great for budget-conscious travelers seeking a central location.',
    category: ServiceCategory.HOTELS,
    photos: [],
    vendorRate: 60,
    rateUnit: RateUnit.PER_ROOM_NIGHT,
    metadata: {
      starRating: 3,
      roomTypes: [{ type: 'Rover Room', vendorRate: 60 }],
      mealPlan: ['EP', 'CP'],
      checkInTime: '14:00',
      checkOutTime: '12:00',
      address: 'Al Mustaqbal Street, Downtown Dubai',
      amenities: [
        'Rooftop Pool',
        'The Daily Restaurant',
        'Fitness Corner',
        'Free WiFi',
        'Laundry',
      ],
    },
  });

  await serviceRepo.save({
    orgId: org.id,
    destinationId: abuDhabi.id,
    name: 'Shangri-La Abu Dhabi',
    description:
      'Luxurious 5-star resort between two bridges with private beach and spectacular views. Features multiple pools, a world-class spa, and six restaurants. Perfect for a premium Abu Dhabi experience.',
    category: ServiceCategory.HOTELS,
    photos: [],
    vendorRate: 180,
    rateUnit: RateUnit.PER_ROOM_NIGHT,
    metadata: {
      starRating: 5,
      roomTypes: [
        { type: 'Deluxe Room', vendorRate: 180 },
        { type: 'Horizon Club Suite', vendorRate: 350 },
      ],
      mealPlan: ['EP', 'CP', 'MAP', 'AP'],
      checkInTime: '15:00',
      checkOutTime: '12:00',
      address: 'Between Two Bridges, Abu Dhabi',
      amenities: [
        'Private Beach',
        '4 Pools',
        'Spa',
        '6 Restaurants',
        'Fitness Center',
        'Kids Club',
        'Free WiFi',
      ],
    },
  });

  // --- TRANSFERS (4) ---

  await serviceRepo.save({
    orgId: org.id,
    destinationId: dubai.id,
    name: 'DXB Airport to Dubai Hotel — Sedan',
    description:
      'Private sedan transfer from Dubai International Airport to any Dubai city hotel. Meet and greet at arrivals hall with name board. Comfortable and hassle-free for up to 3 passengers.',
    category: ServiceCategory.TRANSFERS,
    photos: [],
    vendorRate: 25,
    rateUnit: RateUnit.PER_VEHICLE,
    metadata: {
      pickupLocation:
        'Dubai International Airport (DXB) — Arrivals hall with name board',
      dropLocation: 'Any hotel in Dubai city limits',
      vehicleType: 'sedan',
      capacity: 3,
      isShared: false,
    },
  });

  await serviceRepo.save({
    orgId: org.id,
    destinationId: dubai.id,
    name: 'DXB Airport to Dubai Hotel — Van',
    description:
      'Private van transfer from Dubai International Airport to any Dubai city hotel. Meet and greet at arrivals hall with name board. Spacious and ideal for families or groups up to 7 passengers.',
    category: ServiceCategory.TRANSFERS,
    photos: [],
    vendorRate: 40,
    rateUnit: RateUnit.PER_VEHICLE,
    metadata: {
      pickupLocation:
        'Dubai International Airport (DXB) — Arrivals hall with name board',
      dropLocation: 'Any hotel in Dubai city limits',
      vehicleType: 'van',
      capacity: 7,
      isShared: false,
    },
  });

  await serviceRepo.save({
    orgId: org.id,
    destinationId: dubai.id,
    name: 'Dubai to Abu Dhabi — Sedan',
    description:
      'Private sedan intercity transfer from any Dubai hotel to any Abu Dhabi hotel or attraction. Comfortable ride along the highway with professional driver. Suitable for up to 3 passengers.',
    category: ServiceCategory.TRANSFERS,
    photos: [],
    vendorRate: 80,
    rateUnit: RateUnit.PER_VEHICLE,
    metadata: {
      pickupLocation: 'Any Dubai hotel',
      dropLocation: 'Any Abu Dhabi hotel or attraction',
      vehicleType: 'sedan',
      capacity: 3,
      isShared: false,
    },
  });

  await serviceRepo.save({
    orgId: org.id,
    destinationId: dubai.id,
    name: 'Dubai to Abu Dhabi — Van',
    description:
      'Private van intercity transfer from any Dubai hotel to any Abu Dhabi hotel or attraction. Spacious vehicle for families or groups up to 7 passengers with professional driver.',
    category: ServiceCategory.TRANSFERS,
    photos: [],
    vendorRate: 120,
    rateUnit: RateUnit.PER_VEHICLE,
    metadata: {
      pickupLocation: 'Any Dubai hotel',
      dropLocation: 'Any Abu Dhabi hotel or attraction',
      vehicleType: 'van',
      capacity: 7,
      isShared: false,
    },
  });

  // --- ACTIVITIES (8) ---

  await serviceRepo.save({
    orgId: org.id,
    destinationId: dubai.id,
    name: 'Desert Safari Adventure',
    description:
      'Thrilling evening desert safari with dune bashing in a 4x4 Land Cruiser. Includes camel riding, sandboarding, BBQ dinner, and live entertainment. An unforgettable Arabian desert experience.',
    category: ServiceCategory.ACTIVITIES,
    photos: [],
    vendorRate: 45,
    rateUnit: RateUnit.PER_PERSON,
    metadata: {
      duration: '6 hours',
      pickupPoint: 'Hotel lobby pickup between 2:30 PM - 3:00 PM',
      inclusions: [
        'Dune bashing in 4x4 Land Cruiser',
        'Camel riding',
        'Sandboarding',
        'BBQ dinner with vegetarian options',
        'Belly dance and Tanoura show',
        'Henna painting',
      ],
      exclusions: [
        'Alcoholic beverages',
        'Personal expenses',
        'Quad biking (available at extra cost)',
      ],
      minGroupSize: 1,
      maxGroupSize: 35,
    },
  });

  await serviceRepo.save({
    orgId: org.id,
    destinationId: dubai.id,
    name: 'Dubai City Tour',
    description:
      'Comprehensive full-day city tour covering old and new Dubai. Visit Dubai Museum, cruise across Dubai Creek, and explore gold and spice souks. Includes photo stops at iconic landmarks.',
    category: ServiceCategory.ACTIVITIES,
    photos: [],
    vendorRate: 35,
    rateUnit: RateUnit.PER_PERSON,
    metadata: {
      duration: 'Full day (8 hours)',
      pickupPoint: 'Hotel lobby pickup at 9:00 AM',
      inclusions: [
        'Air-conditioned bus',
        'Professional English-speaking guide',
        'Dubai Museum entry',
        'Abra ride across Dubai Creek',
        'Photo stop at Burj Al Arab',
        'Gold Souk and Spice Souk visit',
        'Dubai Mall drop-off',
      ],
      exclusions: [
        'Meals',
        'Entry to Burj Khalifa',
        'Personal shopping',
      ],
      minGroupSize: 1,
      maxGroupSize: 40,
    },
  });

  await serviceRepo.save({
    orgId: org.id,
    destinationId: abuDhabi.id,
    name: 'Abu Dhabi City Tour',
    description:
      'Full-day guided tour of Abu Dhabi including Sheikh Zayed Grand Mosque, Emirates Palace, and the Corniche. Round trip transport from Dubai or Abu Dhabi hotels with professional guide.',
    category: ServiceCategory.ACTIVITIES,
    photos: [],
    vendorRate: 55,
    rateUnit: RateUnit.PER_PERSON,
    metadata: {
      duration: 'Full day (10 hours)',
      pickupPoint: 'Hotel pickup at 8:00 AM',
      inclusions: [
        'Round trip transport from Dubai or Abu Dhabi hotel',
        'Sheikh Zayed Grand Mosque visit',
        'Emirates Palace photo stop',
        'Corniche drive',
        'Yas Island drive-by',
        'Professional guide',
      ],
      exclusions: [
        'Meals',
        'Entry tickets to attractions',
        'Personal expenses',
      ],
      minGroupSize: 1,
      maxGroupSize: 40,
    },
  });

  await serviceRepo.save({
    orgId: org.id,
    destinationId: dubai.id,
    name: 'Burj Khalifa — At the Top',
    description:
      'Visit the observation deck on the 124th and 125th floors of the world\'s tallest building. Enjoy panoramic views of Dubai, interactive displays, and complimentary telescope viewing.',
    category: ServiceCategory.ACTIVITIES,
    photos: [],
    vendorRate: 40,
    rateUnit: RateUnit.PER_PERSON,
    metadata: {
      duration: '1-2 hours',
      pickupPoint: 'Self-arrival at Dubai Mall, Lower Ground Floor',
      inclusions: [
        'Access to 124th and 125th floor observation deck',
        'Interactive multimedia presentation',
        'Complimentary telescope viewing',
      ],
      exclusions: ['Hotel transfers', '148th floor SKY experience'],
      ticketTypes: [
        { type: 'Adult (13+)', vendorRate: 40 },
        { type: 'Child (4-12)', vendorRate: 25 },
        { type: 'Infant (0-3)', vendorRate: 0 },
      ],
      minGroupSize: 1,
      maxGroupSize: 20,
    },
  });

  await serviceRepo.save({
    orgId: org.id,
    destinationId: dubai.id,
    name: 'Dubai Aquarium & Underwater Zoo',
    description:
      'Explore one of the world\'s largest suspended aquariums at The Dubai Mall. Walk through the aquarium tunnel and visit the underwater zoo with interactive feeding sessions.',
    category: ServiceCategory.ACTIVITIES,
    photos: [],
    vendorRate: 35,
    rateUnit: RateUnit.PER_PERSON,
    metadata: {
      duration: '1.5-2 hours',
      pickupPoint: 'Self-arrival at The Dubai Mall, Ground Floor',
      inclusions: [
        'Aquarium tunnel walk',
        'Underwater Zoo access',
        'Interactive feeding sessions viewing',
      ],
      exclusions: ['Hotel transfers', 'VIP experiences'],
      ticketTypes: [
        { type: 'Adult', vendorRate: 35 },
        { type: 'Child (3-12)', vendorRate: 20 },
        { type: 'Infant (0-2)', vendorRate: 0 },
      ],
      minGroupSize: 1,
      maxGroupSize: 30,
    },
  });

  await serviceRepo.save({
    orgId: org.id,
    destinationId: dubai.id,
    name: 'Museum of the Future',
    description:
      'Iconic torus-shaped museum showcasing immersive exhibitions about future technologies and innovations. Explore all floors including the future library for a thought-provoking experience.',
    category: ServiceCategory.ACTIVITIES,
    photos: [],
    vendorRate: 22,
    rateUnit: RateUnit.PER_PERSON,
    metadata: {
      duration: '2-3 hours',
      pickupPoint: 'Self-arrival at Sheikh Zayed Road, Trade Centre Area',
      inclusions: [
        'Full museum access to all floors',
        'Immersive exhibitions',
        'Future library access',
      ],
      exclusions: ['Hotel transfers', 'Food and beverages'],
      ticketTypes: [
        { type: 'Adult', vendorRate: 22 },
        { type: 'Child (3-12)', vendorRate: 15 },
        { type: 'Infant (0-2)', vendorRate: 0 },
      ],
      minGroupSize: 1,
      maxGroupSize: 25,
    },
  });

  await serviceRepo.save({
    orgId: org.id,
    destinationId: dubai.id,
    name: 'Skydiving over Palm Jumeirah',
    description:
      'Tandem skydive from 13,000 feet over the iconic Palm Jumeirah. Includes 60 seconds of freefall, professional instructor, and GoPro video and photos package. An extreme adventure of a lifetime.',
    category: ServiceCategory.ACTIVITIES,
    photos: [],
    vendorRate: 250,
    rateUnit: RateUnit.PER_PERSON,
    metadata: {
      duration: '3 hours total (60 seconds freefall)',
      pickupPoint:
        'Self-arrival at Skydive Dubai, Palm Drop Zone, Al Sufouh',
      inclusions: [
        'Tandem skydive from 13,000 feet',
        'Professional BPA-certified instructor',
        '30-minute training briefing',
        'GoPro video and photos package',
        'Certificate of completion',
      ],
      exclusions: ['Hotel transfers', 'Additional jumps'],
      minGroupSize: 1,
      maxGroupSize: 6,
      difficulty: 'Extreme',
      ageRestriction: '18+ (minimum 40kg, maximum 100kg)',
    },
  });

  await serviceRepo.save({
    orgId: org.id,
    destinationId: dubai.id,
    name: 'Hot Air Balloon Ride',
    description:
      'Magical sunrise hot air balloon flight over the Dubai desert with views of camels and wildlife. Includes early morning hotel pickup, falcon show, and gourmet breakfast in the desert.',
    category: ServiceCategory.ACTIVITIES,
    photos: [],
    vendorRate: 200,
    rateUnit: RateUnit.PER_PERSON,
    metadata: {
      duration: '4 hours (1 hour flight)',
      pickupPoint: 'Early morning hotel pickup at 4:30 AM',
      inclusions: [
        'Hotel pickup and drop-off',
        '1 hour hot air balloon flight at sunrise',
        'Views of desert, camels, and wildlife',
        'Falcon show after landing',
        'Gourmet breakfast in the desert',
        'Certificate',
      ],
      exclusions: ['Personal expenses', 'Gratuities'],
      minGroupSize: 1,
      maxGroupSize: 24,
      difficulty: 'Easy',
      ageRestriction: '5+ (children must be accompanied by adult)',
    },
  });

  // --- MEALS (4) ---

  await serviceRepo.save({
    orgId: org.id,
    destinationId: dubai.id,
    name: 'Dhow Cruise Dinner',
    description:
      'Traditional wooden dhow cruise along Dubai Marina with international buffet dinner. Enjoy live entertainment and stunning marina skyline views during a 2-hour cruise.',
    category: ServiceCategory.MEALS,
    photos: [],
    vendorRate: 30,
    rateUnit: RateUnit.PER_PERSON,
    metadata: {
      mealType: 'Dinner',
      cuisine: 'International Buffet',
      duration: '3 hours',
      location: 'Dubai Marina Pier, Gate 1',
      inclusions: [
        '2-hour cruise on traditional wooden dhow',
        'International buffet dinner',
        'Soft drinks, water, tea, coffee',
        'Live entertainment and music',
        'Marina skyline views',
      ],
      exclusions: ['Alcoholic beverages', 'Hotel transfers'],
    },
  });

  await serviceRepo.save({
    orgId: org.id,
    destinationId: dubai.id,
    name: 'Al Hadheerah Desert Restaurant',
    description:
      'Authentic Arabian dining experience at Bab Al Shams Desert Resort. Features live cooking stations, Arabic BBQ, shisha lounge, and traditional entertainment including Tanoura and horse shows.',
    category: ServiceCategory.MEALS,
    photos: [],
    vendorRate: 55,
    rateUnit: RateUnit.PER_PERSON,
    metadata: {
      mealType: 'Dinner',
      cuisine: 'Arabic BBQ',
      duration: '2.5 hours',
      location: 'Bab Al Shams Desert Resort, Dubai',
      inclusions: [
        'Traditional Arabic welcome with dates and coffee',
        'Live cooking stations',
        'Shisha lounge access',
        'Live entertainment — Tanoura, horse show',
        'Soft beverages',
      ],
      exclusions: ['Alcoholic beverages', 'Hotel transfers'],
    },
  });

  await serviceRepo.save({
    orgId: org.id,
    destinationId: dubai.id,
    name: 'Pierchic Seafood Restaurant',
    description:
      'Premium overwater seafood fine dining at Madinat Jumeirah with views of Burj Al Arab. Features a 3-course set menu and a non-alcoholic welcome drink in an unforgettable setting.',
    category: ServiceCategory.MEALS,
    photos: [],
    vendorRate: 85,
    rateUnit: RateUnit.PER_PERSON,
    metadata: {
      mealType: 'Dinner',
      cuisine: 'Seafood Fine Dining',
      duration: '2 hours',
      location: 'Al Qasr Hotel, Madinat Jumeirah, Dubai',
      inclusions: [
        '3-course set menu',
        'Non-alcoholic welcome drink',
        'Overwater dining experience',
        'Views of Burj Al Arab',
      ],
      exclusions: [
        'Alcoholic beverages',
        'Additional courses',
        'Hotel transfers',
      ],
    },
  });

  await serviceRepo.save({
    orgId: org.id,
    destinationId: abuDhabi.id,
    name: 'Emirates Palace Le Cafe',
    description:
      'Luxury cafe experience at the iconic Emirates Palace in Abu Dhabi. Enjoy the famous Gold Cappuccino, a selection of pastries, and photo opportunities in the grand atrium.',
    category: ServiceCategory.MEALS,
    photos: [],
    vendorRate: 45,
    rateUnit: RateUnit.PER_PERSON,
    metadata: {
      mealType: 'Lunch',
      cuisine: 'Luxury Cafe',
      duration: '1.5 hours',
      location: 'Emirates Palace, West Wing, Abu Dhabi',
      inclusions: [
        'Palace entry and guided walk',
        'Gold Cappuccino or Palace Cappuccino',
        'Selection of pastries',
        'Photo opportunities in the grand atrium',
      ],
      exclusions: ['Full meals', 'Hotel transfers'],
    },
  });

  console.log('All 20 services created.');

  await dataSource.destroy();
  console.log('Seed completed successfully!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
