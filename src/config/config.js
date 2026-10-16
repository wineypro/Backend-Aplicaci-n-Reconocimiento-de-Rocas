module.exports = {
  development: {
    database: "database_development",
    dialect: 'sqlite',
    storage: "./src/database/database.sqlite"
  },
  test: {
    database: "database_test",
    dialect: 'sqlite'
  },
  production: {
    database: "database",
    dialect: 'sqlite'
  }
}
