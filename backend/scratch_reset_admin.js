const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log('Connected to DB to clean up admin users...');

  // 1. Delete all other admins except the target one
  const deleteResult = await User.deleteMany({
    role: 'admin',
    email: { $ne: 'prpcem.notebridge.ac@gmail.com' }
  });
  console.log(`Deleted ${deleteResult.deletedCount} other admin accounts.`);

  // 2. Find or create the target admin account
  let adminUser = await User.findOne({ email: 'prpcem.notebridge.ac@gmail.com', role: 'admin' });

  if (adminUser) {
    console.log('Target admin account found. Resetting password and status...');
    adminUser.password = 'prpcem@1234';
    adminUser.status = 'active';
    await adminUser.save();
  } else {
    console.log('Target admin account not found. Creating a new one...');
    adminUser = await User.create({
      firstName: 'PRPCEM',
      lastName: 'Admin',
      email: 'prpcem.notebridge.ac@gmail.com',
      password: 'prpcem@1234',
      role: 'admin',
      status: 'active'
    });
  }

  console.log('Admin account set up successfully:');
  console.log(`Email: ${adminUser.email}`);
  console.log(`Role: ${adminUser.role}`);
  console.log(`Status: ${adminUser.status}`);

  mongoose.connection.close();
}).catch(err => {
  console.error(err);
});
