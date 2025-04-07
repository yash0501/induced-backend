const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance using the connection string directly
// This is more reliable with complex passwords
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // Use this only in development; set to true in production
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: process.env.NODE_ENV === 'production' ? false : console.log
});

// Alternative method using individual parameters if the connection URL doesn't work
const createAlternativeConnection = () => {
  return new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: process.env.NODE_ENV === 'production' ? false : console.log
    }
  );
};

// Test the connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect with primary method:', error.message);
    
    // Try alternative connection method
    try {
      const altSequelize = createAlternativeConnection();
      await altSequelize.authenticate();
      console.log('Database connection established with alternative method.');
      return altSequelize; // Return the working connection
    } catch (altError) {
      console.error('Unable to connect with alternative method:', altError.message);
      throw error; // Re-throw original error
    }
  }
  return sequelize;
};

// Export a promise that resolves to the sequelize instance
module.exports = testConnection()
  .then(seq => {
    console.log('Database connection exported successfully');
    return seq;
  })
  .catch(err => {
    console.error('Failed to establish database connection');
    throw err;
  });
