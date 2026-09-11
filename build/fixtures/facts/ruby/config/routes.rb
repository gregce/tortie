Rails.application.routes.draw do
  root "home#index"
  get :activity
  post "/x", to: "x#create"
  resources :users
  match "/m", to: "m#show", via: :all
  namespace :api do
    get "/v1/ping", to: "ping#show"
  end
end
