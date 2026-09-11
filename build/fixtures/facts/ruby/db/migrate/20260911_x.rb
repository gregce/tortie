class CreateThings < ActiveRecord::Migration[7.1]
  def change
    create_table :things do |t|
      t.string :name
    end
  end
end
