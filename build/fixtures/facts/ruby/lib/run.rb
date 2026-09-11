def run
  system("ls -la")
  env = ENV['RAILS_ENV']
  raise "no key here" if env.nil?
end
