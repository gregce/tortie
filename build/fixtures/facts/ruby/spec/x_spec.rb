describe "X" do
  it "a" do
    stub_request(:get, "https://example.com/x")
    let(:sender) { Fabricate(:account, featured_collection_url: 'https://example.com/featured', domain: 'example.com') }
    expect(a_request(:get, 'https://example.com/alice')).to have_been_made.once
  end

  it "b" do
    expect(subject).to_not permit(alice, john)
  end
end
