import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedLiveDonationTicker() {
  console.log('🌱 Seeding Live Donation Ticker...');

  // Delete existing ticker configurations
  await prisma.liveDonationTicker.deleteMany({});
  console.log('✓ Deleted existing ticker configurations');

  // Create new ticker configuration
  const ticker = await prisma.liveDonationTicker.create({
    data: {
      isActive: true,
      
      // Pool of donor names
donorNames: [
  // Male names
  "Ahmed", "Mohammed", "Muhammad", "Mahmoud", "Mostafa", "Mustafa",
  "Abdullah", "Abdelrahman", "Abdelrahim", "Abdelaziz", "Abdelhadi",
  "Omar", "Umar", "Ali", "Hassan", "Hussein", "Hamza", "Bilal",
  "Yusuf", "Yousef", "Yacine", "Yasin", "Ibrahim", "Ismail",
  "Khalid", "Walid", "Talha", "Tariq", "Zayd", "Zaid", "Ammar",
  "Anas", "Muadh", "Saad", "Saeed", "Salman", "Sulaiman",
  "Faisal", "Fadil", "Farid", "Rashid", "Ridwan", "Nabil",
  "Karim", "Akram", "Ayman", "Imran", "Ilyas", "Harun",
  "Aziz", "Latif", "Basel", "Basil", "Qasim", "Hatem",
  "Jamal", "Kamal", "Munir", "Naser", "Nasir", "Yahya",
  "Zubair", "Zuhayr", "Thabit", "Sufyan", "Shuaib",

  // Female names
  "Fatima", "Fatimah", "Aisha", "Ayesha", "Khadija", "Khadijah",
  "Mariam", "Maryam", "Asma", "Hafsa", "Zainab", "Zaynab",
  "Sumayyah", "Safiya", "Safiyaa", "Ruqayyah", "Umm Kulthum",
  "Noor", "Nur", "Hanan", "Huda", "Iman", "Amina", "Aminah",
  "Salma", "Salmah", "Sahar", "Yasmin", "Yasmine", "Lina",
  "Leila", "Layla", "Nada", "Dina", "Reem", "Rim",
  "Aya", "Ayah", "Malak", "Jana", "Marwa", "Samar",
  "Hala", "Nouran", "Rania", "Rana", "Bushra", "Basma",
  "Tasneem", "Tasnime", "Kawthar", "Khadra", "Rahma",
  "Salsabil", "Ikram", "Inas", "Nisreen", "Najwa",
  "Hiba", "Hibah", "Wafaa", "Sanaa", "Shaimaa"
],

      
      
      // Amount ranges with weighted probabilities
      // These probabilities create realistic donation patterns
      amountRanges: [
        {
          minAmount: 5,
          maxAmount: 50,
          probability: 60, // 60% chance - small donations are most common
          label: "small"
        },
        {
          minAmount: 51,
          maxAmount: 200,
          probability: 30, // 30% chance - medium donations
          label: "medium"
        },
        {
          minAmount: 201,
          maxAmount: 1000,
          probability: 8, // 8% chance - large donations
          label: "large"
        },
        {
          minAmount: 1001,
          maxAmount: 5000,
          probability: 2, // 2% chance - very large donations (rare)
          label: "very_large"
        }
      ],
      
      // Display timing (in seconds)
      // Donations will appear randomly between 3 and 8 seconds apart
      minIntervalSeconds: 3,
      maxIntervalSeconds: 8
    }
  });

  console.log('✅ Live Donation Ticker configuration created successfully!');
  console.log('\n📊 Configuration Summary:');
  console.log('   - ID:', ticker.id);
  console.log('   - Status:', ticker.isActive ? 'Active' : 'Inactive');
  console.log('   - Donor names:', ticker.donorNames.length);
  console.log('   - Amount ranges:', ticker.amountRanges.length);
  console.log('   - Display interval:', `${ticker.minIntervalSeconds}-${ticker.maxIntervalSeconds} seconds`);
  console.log('\n💰 Amount Ranges Configuration:');
  ticker.amountRanges.forEach((range: any) => {
    console.log(`   - ${range.label}: $${range.minAmount}-$${range.maxAmount} (${range.probability}% probability)`);
  });
}

async function main() {
  try {
    await seedLiveDonationTicker();
    console.log('\n🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });