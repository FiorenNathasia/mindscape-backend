/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("tags", (table) => {
    table.increments("id").primary();
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("name").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());

    // Ensure a user cannot have duplicate tag names
    table.unique(["user_id", "name"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("tags");
};
