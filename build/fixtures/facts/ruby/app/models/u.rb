class U < ApplicationRecord
  def self.make
    Model.create!(name: "x")
  end
end
