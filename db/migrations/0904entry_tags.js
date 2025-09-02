/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("entry_tags", (table) => {
    table.increments("id").primary();
    table
      .integer("entry_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("entries")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");

    table
      .integer("tag_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("tags")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");

    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.unique(["entry_id", "tag_id"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("entry_tags");
};
