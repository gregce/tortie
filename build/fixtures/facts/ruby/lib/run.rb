def run
  system("ls -la")
  env = ENV['RAILS_ENV']
  raise "no key here" if env.nil?
end

def keys
  key = ENV.fetch('API_KEY')
  redis.set('k', key)
  Rails.cache.fetch('c')
end
