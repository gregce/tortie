ActiveRecord::Schema.define(version: 2026_09_11) do
  create_table "users", force: :cascade do |t|
    t.string "name"
  end

  create_table "posts", force: :cascade do |t|
    t.string "body"
  end

  create_table "tags", force: :cascade do |t|
    t.string "name"
  end
end
