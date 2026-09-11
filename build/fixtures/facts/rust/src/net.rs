pub async fn reach() {
    let _ = reqwest::get("https://api.example/v1").await;
    let h = thread::spawn(|| {});
    let t = tokio::spawn(async {});
    let cfg = std::env::var("RG_CONFIG");
    let regex = RegexBuilder::new(pattern)
        .multi_line(true) // permits ^ and $ to match at line boundaries
        .build();
    let _ = regex;
    let _ = (h, t, cfg);
}
